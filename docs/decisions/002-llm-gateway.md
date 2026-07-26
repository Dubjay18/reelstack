# Decision 002 — Multi-provider LLM Gateway

**Status:** ✅ ACCEPTED — implemented in `apps/api/pkg/llm`

## Context

Riley talked to exactly one LLM provider. `internal/riley/llm.go` built a single client from
`LLM_API_KEY` / `LLM_BASE_URL` / `LLM_MODEL`, and every budget constant in `internal/riley/service.go`
was calibrated to Groq's free tier: 30 RPM, 1K req/day, 12K TPM, **100K tokens/day**. At roughly 2K
tokens per chat turn, tokens-per-day was the binding constraint — capping Riley at **~50-60 chat calls
per day across all users combined**. `globalChatPerDay = 50` existed purely because one free tier ran out.

Groq, OpenRouter, and Gemini AI Studio each expose an OpenAI-compatible `/chat/completions` endpoint
and each has an independent free tier. Pooling them multiplies capacity at no cost.

## Candidates

| Option | Distributes load | Complexity | Notes |
|---|---|---|---|
| Standalone gateway service | Yes | High | Reusable across projects, but needs its own deploy, auth, and adds a network hop + failure point |
| In-process, quota-aware least-loaded | Evenly | Medium | Truly spreads spend; needs live budget state to pick a provider |
| **In-process, strict priority + failover** | On exhaustion | **Low** | Best latency (fastest provider first); spillover happens naturally as tiers run out |

## Decision

**In-process package (`pkg/llm`), strict priority + failover, Redis-backed quota counters.**

Providers are tried in order (Groq → OpenRouter → Gemini). Redis counters aren't just bookkeeping:
a read-only `MGET` pre-flight lets the router **skip a provider it already knows is exhausted**
instead of burning a request to rediscover the 429.

Key design points:

- **Failover replaces same-provider retry for 429s.** A provider's daily quota does not clear in two
  seconds, so the old retry loop was pure added latency on the dominant failure mode. Same-provider
  retry survives only on the last provider, where there's nothing left to fall through to.
- **Outcomes are classified, not lumped together.** 429 → cooldown from `Retry-After`; 401/403 →
  15m cooldown (a bad key won't fix itself); 5xx/transport → short cooldown after repeated failures;
  **400 → no cooldown at all**, since a 400 is usually prompt- or capability-specific (cf. Groq's
  documented `tool_use_failed`) and poisoning the provider would be wrong.
- **Estimate to gate, actual to ledger.** Token cost is only known after a call, so pre-flight uses a
  chars/4 estimate plus a completion reserve, and the response's `usage` field reconciles it. When a
  provider omits `usage` the estimate is recorded instead, so a silent provider can't earn infinite budget.
- **Fail-open on Redis error, with an in-process cooldown map.** Losing quota accounting must never
  block LLM traffic. But fail-open alone would lose cooldown memory and re-probe an exhausted provider
  on every call, so the Gateway keeps its own mutex-guarded cooldown map. Redis is the cross-instance
  sharing layer, not a hard dependency.
- **`ChatMessage` is a true type alias** (`type ChatMessage = llm.ChatMessage`) in `internal/riley`.
  It appears in the exported `IService.Chat` signature and the handler's request body; a new type
  definition would have rippled through every call site.

## Consequences

- Riley's global budget constants change meaning: per-user limits stay as abuse controls (3/min,
  10/day), global limits become a coarse backstop (20/min, 200/day) because provider capacity is now
  the gateway's concern.
- New sentinel `ErrAllProvidersExhausted`, distinct from `ErrLLMDisabled`, maps to 503 +
  `Retry-After: 300`. It means "configured and working, temporarily out of capacity" — not "turned off".
- Widening `Service.llm` from `*LLMClient` to the `ILLM` interface made Riley's LLM path unit-testable
  for the first time (`internal/riley/llm_test.go`).
- Output *quality* can now shift silently on failover, since the three providers run different models.
  Every served call logs its provider so quality complaints stay diagnosable.
- Three API keys now live in the deploy env instead of one. If Railway vars aren't updated, the legacy
  `LLM_API_KEY` shim keeps the old single-provider behaviour rather than breaking.
- JSON-mode support varies by provider and model. Mitigated with a per-provider `JSONMode` capability
  plus a gateway-level `stripJSONFence()`, because two call sites `json.Unmarshal` the reply with no
  tolerance for markdown fences.
