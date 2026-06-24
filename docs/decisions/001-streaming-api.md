# Decision 001 — Streaming Availability API

**Status:** ⚠️ PENDING — complete TASK-002 first

## Context

Reelstack shows users which streaming services carry each title. This requires a third-party data source.

## Candidates

| API | Free tier | NG coverage | Notes |
|-----|-----------|-------------|-------|
| Watchmode | 1000 req/mo | Unknown | Best global coverage |
| Utelly | 500 req/mo | Unknown | EU/US focused |
| JustWatch (unofficial) | Unlimited (risky) | Good | ToS grey area, no official API |

## Decision

> TODO: Fill in after completing TASK-002 (test 20 titles × 3 countries).
>
> Choose one of:
> (a) Watchmode as primary source
> (b) Watchmode + JustWatch link fallback for missing NG data
> (c) Skip NG streaming data for V1, focus US/UK launch

## Consequences

- If (c): update streaming-badge.tsx to show "Check JustWatch" link for NG users
- If (a) or (b): implement Watchmode client in TASK-027
