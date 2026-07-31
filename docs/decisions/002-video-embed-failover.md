# Decision 002 — Multi-Source Video Embed with Failover

**Status:** ✅ ACCEPTED

## Context

Playback was a single third-party iframe to `vidking.net`. Load time was out of
our control (it's their server), but two things made it worse than it had to be:

1. The watch page deferred mounting the player until the movie-details roundtrip
   (web → Go API → TMDB) resolved — pure dead time on first load.
2. There was no fallback: when Vidking was slow or down, nothing played, and no
   browser hint (preconnect/dns-prefetch) prepared the connection ahead of time.

These embed providers are all unofficial, third-party, and their domains churn
frequently. A single hardcoded provider is a reliability liability.

## Decision

Introduce a **source-chain player** with API-driven ordering and client-side
failover:

- `GET /api/v1/stream/embed?type=movie|tv&tmdbId=…[&season=…&episode=…]` returns
  the ordered list of candidate embed URLs, fastest-alive first.
- The Go API **health-probes** the provider registry (8 providers) concurrently
  per title, classifies each response, and caches the ordered result in Redis
  for 5 minutes (singleflight-guarded to prevent stampedes).
  - `alive`: 2xx + player markup → ranked by TTFB.
  - `bot-gated`: 403/429/503 or a Cloudflare-style challenge → kept but
    deprioritized (it works in a real browser iframe even though it blocks
    server-side fetches).
  - `dead`/no-markup/404 → pruned.
  - If nothing survives server-side, the static registry order is returned so
    the client still has candidates to try directly.
- The web player tries the top-ranked source. If it hasn't responded within
  ~15s (no iframe `onLoad` and no Vidking `PLAYER_EVENT` postMessage), it
  swaps to the next source. If all sources fail it shows an explicit
  "unavailable / try again" state instead of a silent black box.
- The watch page mounts the player **immediately** (it only needs URL params),
  decoupled from the movie-details fetch; the header shows a skeleton while
  details load.
- The player emits `preconnect` + `dns-prefetch` hints for the active source
  origin (and Vidking, the likely primary) so DNS/TLS are off the critical path.
- If the embed-source API is unreachable, the player falls back to a built-in
  Vidking URL (identical to the previous behavior).

## Consequences

- **Faster and more reliable playback** under our control: the player no longer
  waits on metadata, connections are pre-warmed, and a slow/dead source is
  swapped automatically instead of failing silently.
- **Provider churn is handled at runtime** by the probe/prune loop, not by
  redeploys. The registry is a starting point, not ground truth.
- **Watch-progress tracking degrades for non-Vidking sources**: progress is
  written from Vidking's `PLAYER_EVENT` postMessage only. Other sources play
  fine but don't update resume position.
- These remain **unofficial third-party embeds** (as is the whole playback
  feature). No DRM/legal streaming API is available for full titles; TMDB's
  official API only exposes trailers (already used on detail pages).
- Adding/removing a provider is a one-line change in
  `apps/api/internal/content/embed_source.go`.
