# AI layer — design & decisions

How the `src/ai/` layer is put together and why. For usage and costs, see
[ai-features.md](./ai-features.md).

## Shape

```
src/ai/
  anthropic-client.ts   shared client + callClaude() (model, retry, trace)
  prompt-loader.ts      loads versioned prompt files, enforces the contract
  prompts/*.v<N>.md     the prompts themselves
  structured.ts         fence-stripping, JSON recovery, zod parsing
  schemas.ts            strict + loose zod schemas for generated data
  redaction.ts          secret/PII redaction + prompt-injection guards
  observability.ts      JSONL trace writer + cost model
  budget.ts             reads traces back, totals spend
  test-generator.ts     requirement -> .spec.ts draft
  failure-analyzer.ts   failure artifacts -> root-cause hypothesis (single shot)
  agentic-analyzer.ts   tool-use loop: the model reads/greps the repo itself
  data-generator.ts     typed, validated test records
  providers/            LLMProvider interface + anthropic / openai adapters
```

Everything sits behind `isAiEnabled()`. With no key the data generator returns
faker, and the two CLIs print a clean "AI disabled" message instead of throwing.

## Safety — untrusted input & secrets

The helpers take untrusted-ish input and send it to a model, then persist
artifacts, so two surfaces are handled explicitly (`src/ai/redaction.ts`):

- **Prompt injection.** The test-generator's requirement and the failure-analyzer's
  error-context + spec source (and any text inside the failure screenshot) are
  untrusted. The `v2` prompts wrap them in `<untrusted_data>` blocks declared as
  data-only; `sanitizeUntrusted()` strips any stray delimiter so a payload can't
  close the fence and break out. `detectInjection()` is a heuristic that flags
  common phrasings ("ignore previous instructions", a fake `system:` turn) — it
  logs a warning and records `injection_suspected` on the trace rather than
  hard-blocking, because the fence is the real control and a brittle blocklist
  would only create false confidence.
- **Secrets / PII.** `redactSecrets()` masks API keys, JWTs, bearer tokens, URL
  credentials, and emails in the trace's free-text error field before it's
  written — "git-ignored" is not "safe to leak".

Model output stays untrusted downstream too: generated data is zod-validated and
the analysis is a hypothesis, never an auto-applied verdict.

## Agentic analysis (tool-use)

`agentic-analyzer.ts` is the failure analyzer as a tool-use loop instead of a
single shot. The model is given four tools — `list_dir`, `read_file`, `grep`,
`view_screenshot` — and investigates the failure itself: list the results folder,
read `error-context.md`, open the spec, grep for the selector, look at the
screenshot, then conclude. Run it with `npm run ai:analyze -- --trace <dir> --agent`.

Decisions:

- **Sandboxed filesystem.** Every model-supplied path goes through
  `resolveWithinRoot()`, which refuses anything that escapes the project root —
  the model can read the repo but not `../../etc/passwd`. Tool inputs are
  zod-validated; a bad path comes back as an `is_error` tool result, not a throw.
- **Same call path.** The loop calls `callClaude()` per step, so every turn is
  retried and traced (`module: "failure-analyzer-agent"`) like any other call —
  multi-step runs show up as a sequence in `logs/ai-traces.jsonl`.
- **Bounded.** A step cap (after which one final, tool-less call forces an answer),
  read-size caps, and a grep file/match budget keep token cost and latency in check.
- **Untrusted by default.** The system prompt fences file/screenshot contents as
  data; reads are injection-scanned. The `send` function is injectable, so the
  loop is unit-tested with a scripted fake client (no network).

## Provider abstraction (multi-vendor)

The text helpers (data generator, test generator) don't import the Anthropic SDK
directly — they call an `LLMProvider` (`src/ai/providers/`). The vendor is chosen
by `LLM_PROVIDER`:

- `AnthropicProvider` — the default; a thin adapter over `callClaude()`, so it
  keeps the same retry / backoff / trace path.
- `OpenAICompatibleProvider` — `fetch` to any `/chat/completions` endpoint, which
  covers OpenAI, a local Ollama / LM Studio server (set `OPENAI_BASE_URL`),
  OpenRouter, etc. — no extra SDK. It runs its own retry and writes the same trace
  shape with `provider: "openai"` and `cost_usd` from the same `PRICING` table
  (local endpoints are billed at $0).

Decisions:

- **Deliberately partial.** Only the two pure text helpers route through the
  interface. The multimodal failure analyzer (vision) and the tool-use agent stay
  on the Anthropic client — those features aren't uniform across vendors, and a
  one-size interface would be a leaky abstraction. The boundary is explicit.
- **Observability stays unified.** Every provider writes the same `AiTrace` line
  (now carrying a `provider` field), so `npm run ai:budget` totals spend across
  vendors without caring which one served a call.
- **Testable transport.** Both adapters take an injectable transport (the Anthropic
  `call` fn / the `fetch` impl), so request→response mapping and retry are
  unit-tested with no network.

## Prompts as code

Prompts are `<name>.v<N>.md` files with frontmatter:

```
---
name: data-generator
version: 1
description: ...
inputs: count, kind, shape, context
output: A JSON array of objects — no prose, no markdown, no code fences.
---
Generate {{count}} records for kind "{{kind}}".{{context}}
...
```

`loadPrompt(name)` picks the highest version, parses the frontmatter, and returns
a `render(vars)` that substitutes `{{var}}` placeholders. Decisions:

- **Versioned files, not inline strings.** A prompt change is a reviewable diff,
  and you can keep `v1` around while trialling `v2`.
- **Declared input contract.** `render()` throws if a declared input is missing
  or if the body references an undeclared variable — typos fail loudly instead of
  shipping a half-filled prompt.
- **Single-pass substitution.** Injected values aren't re-scanned, so user text
  containing `{{...}}` can't introduce another placeholder.
- **Prompt files are in `.prettierignore`** so formatting never silently reflows
  a template body.

## Structured outputs

The data generator must return data a test can use, so output handling is strict:

1. Strip stray code fences (models add them despite instructions).
2. `JSON.parse`; on failure, `recoverJsonArray()` trims a truncated array to its
   last complete element and re-closes it (handles a reply cut off at `max_tokens`).
3. Validate with a **strict** zod schema (valid email, ISO dates, positive room id).
4. On failure, retry validation with a **loose** schema (right shape, relaxed
   values) — one odd phone number shouldn't drop the whole batch to faker.
5. If both fail, throw — and the caller falls back to faker so tests still run.

The strict schemas mirror `CreateBookingPayload` / `GuestContact`, so validated
output is also correctly typed.

## Reliability

Every call goes through `callClaude()`:

- The SDK's own retry is disabled (`maxRetries: 0`) so it doesn't stack with ours.
- We retry on 429, 408, 5xx, and transient connection errors only — never on a
  4xx like a bad request, which won't get better by retrying.
- Backoff is exponential with jitter, capped; a per-request timeout guards against
  a hung call.

## Observability

Each call appends one line to `logs/ai-traces.jsonl` (git-ignored):

```json
{
  "trace_id": "3f2a...",
  "ts": "2026-05-29T16:42:32.151Z",
  "module": "data-generator",
  "prompt_name": "data-generator",
  "prompt_version": 1,
  "model": "claude-sonnet-4-5",
  "input_hash": "a1b2c3d4e5f6a7b8",
  "latency_ms": 842,
  "input_tokens": 210,
  "output_tokens": 180,
  "cost_usd": 0.00333,
  "success": true
}
```

Failures write the same line with `success: false` and an `error` string. Writing
is best-effort and wrapped in try/catch — a logging problem must never fail a real
call. This is the cheap version of what you'd send to Langfuse or similar; the
shape is deliberately flat so it's easy to grep or load into a notebook.

## Cost

`computeCost(model, inTokens, outTokens)` uses a small per-million-token price
table (matched by model-name prefix, so dated ids like `-20251001` still resolve).
`npm run ai:budget` reads the trace log, totals spend by day / month / module, and
warns past a configurable percentage of the monthly budget in `.ai-budget.json`
(git-ignored; copy from `.ai-budget.example.json`).

## Evals

Quality is measured, not claimed. `npm run eval:ai` scores each helper:

- **test-generator** — static checks (imports the fixtures barrel, has a
  describe/test/expect, no invented import paths) plus a real `tsc --noEmit`
  compile check on the draft.
- **data-generator** — strict-schema validity ratio and diversity (unique / total).
- **failure-analyzer** — heuristics (names a root cause, gives actionable steps,
  sensible length), backed by a manual 1-5 rubric in [evals/README.md](../evals/README.md).

Live mode (with a key) scores fresh model output; offline mode scores committed
fixtures so the suite runs for free in CI. Results go to `evals/results/`
(git-ignored) for tracking over time.

## Safety

This is a demo, not a hardened product, but the obvious footguns are handled:

- **Prompt-injection awareness.** User-controlled fields (a requirement, a data
  context, a page's `error-context.md`) are wrapped with instructions to treat
  them as data, and the loader's single-pass substitution stops `{{...}}` smuggling.
  This reduces the risk; it does not eliminate it, and the prompts say so.
- **No auto-commit of generated code.** Drafts land in a git-ignored folder with an
  `[AI-DRAFT]` header and need a human before they become a test.
- **Output is validated, not trusted.** See structured outputs above.

What's deliberately _not_ claimed: this isn't an injection-proof system. Treat
generated specs and analyses as drafts from an untrusted source, because that's
what they are.
