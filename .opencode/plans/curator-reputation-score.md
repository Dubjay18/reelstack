# Curator Reputation Score

## Problem

Reelstack has no way to surface which curators are worth following. Every user looks the same — follower count is the only signal, and there's no leaderboard or discovery mechanism. Users have to stumble onto good curators through search or luck.

## Goal

Add a visible curator reputation score based on four signals (followers, list saves, content creation, recency). Display it everywhere: profiles, search results, list pages, and a new leaderboard page. Compute scores via a batch cron job.

## Scope

### In scope
- `curator_scores` database table + migration 012
- Scoring algorithm (weighted formula)
- Cron endpoint for batch score computation
- API: leaderboard, individual score, score breakdown
- Web frontend: leaderboard page, score badges on profiles/search/lists
- Mobile frontend: score badges on profiles/search/lists (no leaderboard page yet)

### NOT in scope
| Item | Rationale |
|------|-----------|
| Real-time score updates | Scores refresh on cron schedule (every 6h), not per-action. Real-time adds trigger complexity for marginal accuracy gain. |
| Score history/trends | Future: track score over time to show "rising curators". Requires history table + charting. |
| Gamification/badges | Future: tier system (Bronze/Silver/Gold/Platinum) based on score thresholds. |
| Rating content | This is reputation, not film ratings. Content rating is a separate feature. |
| Mobile leaderboard | Skip until web leaderboard is validated. Mobile gets score badges only. |
| Frontend E2E tests | No Playwright/Cypress in this repo. Backend unit + integration tests only. |

### What already exists
| Existing code | How the plan uses it |
|---------------|---------------------|
| Cron endpoint pattern (`POST /api/v1/cron/*` with `X-Cron-Secret`) | Reuses exactly — new `POST /api/v1/cron/scores` follows the same auth pattern |
| User search/curator search (`GET /api/v1/users/search`) | Leaderboard is a new endpoint, not a modification — different concern (ranked list vs. search) |
| `saved_lists` table | Directly queried for list save counts in the scoring CTE |
| `follows` table | Directly queried for follower counts in the scoring CTE |
| `lists` + `list_items` tables | Directly queried for content creation scores |
| Fiber router groups + middleware | New routes mount on existing router groups in `main.go` |
| Mock service test pattern (`auth/handler_test.go`) | New `curators/handler_test.go` follows the same mock + httptest pattern |

## Data Model

### Materialized view: `curator_scores`

Using a materialized view instead of a table + UPSERT. Same query performance, eliminates UPSERT logic, trivially refreshable.

```sql
CREATE MATERIALIZED VIEW curator_scores AS
WITH user_stats AS (
    -- (see scoring query below)
),
scored AS (
    -- (see scoring query below)
)
SELECT user_id, score, follower_score, saves_score, creation_score, activity_score, NOW() AS computed_at
FROM scored;

CREATE UNIQUE INDEX idx_curator_scores_user_id ON curator_scores(user_id);
CREATE INDEX idx_curator_scores_score ON curator_scores(score DESC);
```

Refresh via: `REFRESH MATERIALIZED VIEW CONCURRENTLY curator_scores;`

Score is an integer 0-1000. Each sub-score is 0-250 (4 signals, 250 points each).

### Scoring Algorithm

```
follower_score = min(250, followers * 5)
  - 0 followers = 0, 50 followers = 250 (cap)
  - Logarithmic scaling not needed at current scale

saves_score = min(250, total_list_saves * 10)
  - 0 saves = 0, 25 saves = 250 (cap)

creation_score = min(250, (public_lists * 20) + (total_items * 2))
  - 5 public lists = 100, 75 items = 150, total = 250 (cap)

activity_score = min(250, recency_bonus)
  - Active in last 7 days: 250
  - Active in last 30 days: 200
  - Active in last 90 days: 150
  - Active in last 180 days: 100
  - Active in last 365 days: 50
  - Older: 0

score = follower_score + saves_score + creation_score + activity_score
```

All sub-scores capped at 250 to prevent any single signal from dominating. Activity uses tiered decay, not continuous — simpler, predictable.

### SQL for score computation

The cron endpoint computes all scores in a single query:

```sql
WITH user_stats AS (
    SELECT
        u.id AS user_id,
        COALESCE(f.follower_count, 0) AS follower_count,
        COALESCE(s.total_saves, 0) AS total_saves,
        COALESCE(l.public_list_count, 0) AS public_list_count,
        COALESCE(li.total_items, 0) AS total_items,
        GREATEST(
        u.updated_at,
        u.created_at,
        la_lists.max_created,
        la_items.max_added
    ) AS last_active
    FROM users u
    LEFT JOIN (
        SELECT following_id, COUNT(*) AS follower_count
        FROM follows GROUP BY following_id
    ) f ON f.following_id = u.id
    LEFT JOIN (
        SELECT l.user_id, SUM(ls.save_count) AS total_saves
        FROM lists l
        JOIN (
            SELECT list_id, COUNT(*) AS save_count
            FROM saved_lists GROUP BY list_id
        ) ls ON ls.list_id = l.id
        GROUP BY l.user_id
    ) s ON s.user_id = u.id
    LEFT JOIN (
        SELECT user_id, COUNT(*) AS public_list_count
        FROM lists WHERE is_public = TRUE
        GROUP BY user_id
    ) l ON l.user_id = u.id
    LEFT JOIN (
        SELECT l.user_id, COUNT(*) AS total_items
        FROM list_items li
        JOIN lists l ON l.id = li.list_id
        WHERE l.is_public = TRUE
        GROUP BY l.user_id
    ) li ON li.user_id = u.id
    LEFT JOIN (
        SELECT user_id, MAX(created_at) AS max_created
        FROM lists GROUP BY user_id
    ) la_lists ON la_lists.user_id = u.id
    LEFT JOIN (
        SELECT l.user_id, MAX(li.added_at) AS max_added
        FROM list_items li JOIN lists l ON l.id = li.list_id
        GROUP BY l.user_id
    ) la_items ON la_items.user_id = u.id
),
scored AS (
    SELECT
        user_id,
        LEAST(250, follower_count * 5) AS follower_score,
        LEAST(250, total_saves * 10) AS saves_score,
        LEAST(250, (public_list_count * 20) + (total_items * 2)) AS creation_score,
        LEAST(250, CASE
            WHEN last_active > NOW() - INTERVAL '7 days' THEN 250
            WHEN last_active > NOW() - INTERVAL '30 days' THEN 200
            WHEN last_active > NOW() - INTERVAL '90 days' THEN 150
            WHEN last_active > NOW() - INTERVAL '180 days' THEN 100
            WHEN last_active > NOW() - INTERVAL '365 days' THEN 50
            ELSE 0
        END) AS activity_score
    FROM user_stats
)
INSERT INTO curator_scores (user_id, score, follower_score, saves_score, creation_score, activity_score, computed_at)
SELECT
    user_id,
    follower_score + saves_score + creation_score + activity_score AS score,
    follower_score,
    saves_score,
    creation_score,
    activity_score,
    NOW()
FROM scored
ON CONFLICT (user_id) DO UPDATE SET
    score = EXCLUDED.score,
    follower_score = EXCLUDED.follower_score,
    saves_score = EXCLUDED.saves_score,
    creation_score = EXCLUDED.creation_score,
    activity_score = EXCLUDED.activity_score,
    computed_at = EXCLUDED.computed_at;
```

## API Design

### New endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/curators/leaderboard` | Public | Top curators by score (uses RANK() window function) |
| `POST` | `/api/v1/cron/scores` | Cron secret | Refresh materialized view |

### Modified endpoints

| Method | Path | Change |
|--------|------|--------|
| `GET` | `/api/v1/users/:identifier` | Add `score`, `rank` fields to response (JOIN with materialized view) |

### Leaderboard response

```json
{
  "curators": [
    {
      "user_id": "uuid",
      "username": "string",
      "avatar_url": "string",
      "bio": "string",
      "score": 850,
      "rank": 1,
      "follower_count": 120,
      "list_count": 8
    }
  ],
  "computed_at": "2026-07-12T00:00:00Z"
}
```

Query params: `?limit=20&offset=0` (default limit 20, max 100). Rank computed via `RANK() OVER (ORDER BY score DESC)`.

### Profile response (modified)

```json
{
  "id": "uuid",
  "username": "string",
  "avatar_url": "string",
  "bio": "string",
  "score": 850,
  "rank": 5,
  "item_count": 42,
  "followers_count": 120,
  "following_count": 30
}
```

Score and rank are JOINed from the materialized view. No separate API call needed.

## Implementation Steps

### Step 1: Migration + Data Layer
**Files:** `apps/api/pkg/db/migrations/012_curator_scores.sql`, `apps/api/internal/curators/models.go`, `apps/api/internal/curators/repository.go`

- Create migration 012 with materialized view + indexes
- Define `CuratorScore` struct in Go
- Implement repository with `RefreshView()`, `GetLeaderboard(limit, offset)`, `GetScore(userID)`

### Step 2: Scoring Service
**Files:** `apps/api/internal/curators/service.go`

- `RefreshScores(ctx)` — calls `REFRESH MATERIALIZED VIEW CONCURRENTLY` with 30s timeout
- `GetLeaderboard(ctx, limit, offset)` — queries materialized view with RANK() window function
- `GetUserScore(ctx, userID)` — queries materialized view for single user
- `GetUserScoreByUsername(ctx, username)` — convenience wrapper

### Step 3: API Handlers + Routes
**Files:** `apps/api/internal/curators/handler.go`, `apps/api/cmd/server/main.go`

- `GET /api/v1/curators/leaderboard` handler — queries materialized view
- `POST /api/v1/cron/scores` handler — calls RefreshScores()
- Modify `GET /api/v1/users/:identifier` handler to JOIN with materialized view for score/rank
- Wire into `main.go` router (new curators group + modify users handler)

### Step 4: Web Frontend — Score Badge Component
**Files:** `apps/web/components/curator-score-badge.tsx`

- Reusable badge component: shows score as a number + visual indicator
- Variants: `compact` (search results), `full` (profile), `mini` (list page)
- Color scale: 0-200 gray, 200-400 blue, 400-600 green, 600-800 gold, 800+ platinum

### Step 5: Web Frontend — Leaderboard Page
**Files:** `apps/web/app/(app)/leaderboard/page.tsx`, `apps/web/lib/api.ts`, `apps/web/components/sidebar.tsx`

- New `/leaderboard` page with ranked curator list
- Shows top 20 with pagination
- Each row: rank, avatar, username, score badge, follower count, list count
- Add "Leaderboard" link to sidebar navigation (below "Saved Lists")

### Step 6: Web Frontend — Score Integration
**Files:** `apps/web/app/[username]/page.tsx`, `apps/web/app/(app)/search/page.tsx`, `apps/web/app/(app)/lists/[id]/page.tsx`

- Profile page: show full score breakdown
- Search results (Curators tab): show compact score badge
- List page: show owner's score badge next to their name

### Step 7: Mobile Frontend — Score Badge + Integration
**Files:** `apps/mobile/src/components/curator-score-badge.tsx`, `apps/mobile/src/app/[username]/index.tsx`

- Reuse same badge component pattern
- Profile screen: show score
- Search (Curators tab): show compact badge
- Skip leaderboard page on mobile (can add later)

### Step 8: Cron Setup + Testing
**Files:** `apps/api/internal/curators/service_test.go`, Railway cron config

- Unit tests for scoring algorithm (edge cases: zero followers, max scores, ties)
- Integration tests for leaderboard and score endpoints
- Document Railway cron schedule (recommend: every 6 hours)

## Testing Strategy

Backend only (unit + integration). No E2E — no Playwright/Cypress in this repo.

### Test files

| File | Type | Tests |
|------|------|-------|
| `apps/api/internal/curators/service_test.go` | Unit | Scoring algorithm, caps, tiers, leaderboard, score retrieval |
| `apps/api/internal/curators/handler_test.go` | Integration | HTTP handlers with mock service |

### Unit tests (service_test.go)

| Test | What it covers |
|------|----------------|
| `TestScoringFormula` | CTE query logic: known inputs → expected sub-scores + total |
| `TestScoreCaps` | Each sub-score capped at 250 (50 followers → 250, 100 followers → 250) |
| `TestActivityTiers` | Recency decay: 7d→250, 30d→200, 90d→150, 180d→100, 365d→50, older→0 |
| `TestGetLeaderboard` | Pagination, ordering (score DESC), RANK() window function |
| `TestGetLeaderboard_Empty` | Empty view returns empty list, no error |
| `TestGetUserScore` | Score retrieval for existing user |
| `TestGetUserScore_NoScore` | User with no score returns default zero response |

### Integration tests (handler_test.go)

| Test | What it covers |
|------|----------------|
| `TestLeaderboardEndpoint` | `GET /curators/leaderboard` — JSON shape, pagination, rank via RANK() |
| `TestProfileWithScore` | `GET /users/:id` — score and rank included in profile response |
| `TestProfileWithScore_NoScore` | Returns `{score: 0, rank: null}` for user with no score |
| `TestCronScoresEndpoint` | `POST /cron/scores` — refreshes materialized view, returns success |
| `TestCronScoresEndpoint_Unauthorized` | Missing/invalid `X-Cron-Secret` → 401 |

## Design Considerations (from outside voice)

### Gaming vulnerability
The scoring is trivially gameable at small platform scale:
- 50 throwaway accounts following = max follower score (250)
- 25 lists with 1 save each = max saves score (250)
- 13 public lists with 5 items = max creation score (250)

**Accepted for now.** Gaming is a future problem. The platform is small. Add rate limiting, velocity checks, or quality signals (list diversity, engagement depth) when it matters.

### Activity tier cliffs
The step-function activity score creates a 50-point cliff at day boundaries (250 at 7d → 200 at 8d). This is a design choice — simpler than continuous decay, predictable, and acceptable for v1.

### Cache staleness
Profile responses are cached in Redis for 5 minutes. Scores recomputed every 6 hours means maximum 5-minute staleness after recomputation. Acceptable — score changes are infrequent.

### Cron configuration
Document in README: add to Railway cron dashboard or cron-job.org:
```
Schedule: 0 */6 * * * (every 6 hours)
URL: POST https://<api-domain>/api/v1/cron/scores
Header: X-Cron-Secret: <CRON_SECRET>
```

## Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│                    External Cron                     │
│            (Railway, every 6 hours)                  │
└─────────────────────┬───────────────────────────────┘
                      │ POST /api/v1/cron/scores
                      │ Header: X-Cron-Secret
                      ▼
┌─────────────────────────────────────────────────────┐
│                  Curators Service                    │
│  ┌─────────────────────────────────────────────┐    │
│  │  RefreshScores()                            │    │
│  │  REFRESH MATERIALIZED VIEW CONCURRENTLY     │    │
│  │  (30s context timeout)                      │    │
│  └─────────────────────────────────────────────┘    │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│              PostgreSQL Materialized View             │
│  ┌─────────────────────────────────────────────┐    │
│  │  curator_scores                             │    │
│  │  ├── user_id (unique index)                 │    │
│  │  ├── score (0-1000, indexed DESC)           │    │
│  │  ├── follower_score (0-250)                 │    │
│  │  ├── saves_score (0-250)                    │    │
│  │  ├── creation_score (0-250)                 │    │
│  │  ├── activity_score (0-250)                 │    │
│  │  └── computed_at                            │    │
│  └─────────────────────────────────────────────┘    │
└─────────────────────┬───────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
        ▼             ▼             ▼
   ┌─────────┐  ┌──────────┐  ┌──────────┐
   │ Profile │  │ Search   │  │ Leader-  │
   │  Page   │  │ Results  │  │  board   │
   │ (JOINed)│  │ (JOINed) │  │ (RANK()) │
   └─────────┘  └──────────┘  └──────────┘
```

## Effort Estimate

- **Go backend** (migration, service, handlers, tests): ~4 hours human / ~20 min CC
- **Web frontend** (badge, leaderboard, integrations): ~3 hours human / ~15 min CC
- **Mobile frontend** (badge, integrations): ~1.5 hours human / ~10 min CC
- **Total:** ~8.5 hours human / ~45 min CC

## Implementation Tasks

- [ ] **T1 (P1, human: ~2h / CC: ~10min)** — Backend: migration + materialized view + service + handlers
  - Surfaced by: Architecture review — new curators module
  - Files: `apps/api/pkg/db/migrations/012_curator_scores.sql`, `apps/api/internal/curators/`
  - Verify: `make test-api` passes
- [ ] **T2 (P1, human: ~1h / CC: ~5min)** — Backend: tests for scoring algorithm + handlers
  - Surfaced by: Test review — 21 code path gaps
  - Files: `apps/api/internal/curators/service_test.go`, `apps/api/internal/curators/handler_test.go`
  - Verify: `go test ./internal/curators/...` passes
- [ ] **T3 (P1, human: ~2h / CC: ~10min)** — Web frontend: score badge + leaderboard page + integrations
  - Surfaced by: Architecture review — score display everywhere
  - Files: `apps/web/components/curator-score-badge.tsx`, `apps/web/app/(app)/leaderboard/page.tsx`
  - Verify: manual check on /leaderboard, /profile, /search
- [ ] **T4 (P2, human: ~1h / CC: ~5min)** — Mobile frontend: score badge + integrations
  - Surfaced by: Architecture review — score on mobile profiles/search
  - Files: `apps/mobile/src/components/curator-score-badge.tsx`
  - Verify: manual check on mobile profile and search
- [ ] **T5 (P2, human: ~15min / CC: ~2min)** — Cron config + README docs
  - Surfaced by: Outside voice — cron configuration not documented
  - Files: `README.md`
  - Verify: cron schedule documented

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 1 | CLEAR | 4 issues found, all resolved |
| Outside Voice | `/plan-eng-review` | Independent 2nd opinion | 1 | CLEAR | 14 findings, 6 critical fixes applied |

- **CROSS-MODEL:** Both reviewers agreed on correlated subquery fix, activity score formula, and migration idempotency. Outside voice additionally found materialized view opportunity (adopted), score badge waterfall (fixed), and gaming vulnerability (accepted as future concern).
- **VERDICT:** ENG CLEARED — ready to implement

NO UNRESOLVED DECISIONS
