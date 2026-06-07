# AI-engineer adaptation plan

A roadmap for sharpening this repo toward an **AI Engineer** role. The project
already ships an engineered AI layer (`src/ai/`); this plan closes the specific
gaps that come up in AI-engineering interviews rather than rebuilding anything.

Each item names the [agent](../.claude/agents/) that owns it, a rough effort, and
the signal it sends. Status is tracked in the table at the bottom.

## What's already strong (don't touch)

| Capability                                     | Where                                 |
| ---------------------------------------------- | ------------------------------------- |
| Prompts as versioned files + typed loader      | `src/ai/prompts/`, `prompt-loader.ts` |
| Structured output (zod strict+loose, recovery) | `structured.ts`, `schemas.ts`         |
| One call path: backoff+jitter, scoped retry    | `anthropic-client.ts`                 |
| Observability: per-call JSONL trace            | `observability.ts`                    |
| Cost per call + budget                         | `budget.ts`, `npm run ai:budget`      |
| Offline evals + AI-layer unit tests            | `evals/`, `tests/unit/`               |

## Gaps, prioritized

### P0 — highest leverage

**P0.1 — LLM safety: prompt-injection defense + PII/secret redaction.**
The failure-analyzer ingests untrusted `error-context.md` **and a screenshot**
(multimodal injection surface); traces and generated files can leak PII/secrets.
Add explicit delimiting of untrusted input, an output-trust posture, an injection
heuristic, and a redaction pass before anything is persisted.
Owner: `ai-safety-specialist`. Effort: ~1–1.5d. Signal: high — AI security.

**P0.2 — Multi-provider `LLMProvider` abstraction.**
Decouple from Anthropic with a thin interface and a second implementation
(OpenAI or local Ollama), switchable by env, compared on evals for cost/quality.
Owner: `typescript-specialist` (+ `cost-analyst`). Effort: ~2d. Signal: architecture, no vendor lock-in.

### P1 — depth / seniority

**P1.1 — One genuinely agentic helper (tool-use loop).** ⭐
All three helpers are single-shot. Rewrite the failure-analyzer as a tool-use loop
where the model reads files/traces itself (`read_file`, `list_dir`, `grep`).
Owner: `prompt-engineer` (+ `typescript-specialist`). Effort: ~2–3d. Signal: **highest** — agents/tool-use is the core of the role.

**P1.2 — Evals as a release gate + LLM-as-judge.**
Grow the dataset, add an LLM-as-judge metric (with the existing "sounds right ≠ is
right" caveat), and fail CI when eval scores regress.
Owner: `playwright-qa-engineer` (+ `prompt-engineer`). Effort: ~1.5d. Signal: gating releases on evals.

**P1.3 — External tracing (OpenTelemetry / Langfuse).**
Export traces beyond local JSONL, behind a flag, on top of `writeTrace`.
Owner: `typescript-specialist`. Effort: ~1d. Signal: production observability.

### P2 — polish / optional

- **P2.1 RAG grounding** for the test-generator (retrieve the most relevant existing
  specs/POMs instead of a static example). Keep it minimal — no heavy vector DB.
- **P2.2 CI hook** running evals on PRs that touch `src/ai/`.
- **P2.3 Honesty/debt fixes:** verify the default `MODEL` id is current; add a
  "last verified" date to the hardcoded `PRICING`; reconcile the README test counts
  with reality.

## Suggested sequence

1. **Sprint 1** — P0.1 + the safe P2.3 fixes (PRICING date). High ROI, visible README upgrade.
2. **Sprint 2** — P1.1 (agentic tool-use helper). The flagship interview piece.
3. **Sprint 3** — P0.2 + P1.2.
4. **Sprint 4 (optional)** — P1.3 + P2.1.

After each sprint: update the README "What this project demonstrates" section and CHANGELOG.

## Out of scope (deliberately)

A portfolio is curated. We do **not** pull in the full claude-flow framework
(swarm/MCP/121 agents), unrelated plugins (blockchain/IoT/trading), a second
application domain, or a heavy vector DB for a token RAG demo. The agent team in
`.claude/agents/` is a curated subset for exactly this reason.

## Status

| Item                                     | Status      |
| ---------------------------------------- | ----------- |
| Agent team connected (`.claude/agents/`) | ✅ done     |
| P0.1 LLM safety                          | ✅ done     |
| P2.3 PRICING date                        | ✅ done     |
| P0.2 multi-provider                      | ⬜ planned  |
| P1.1 agentic helper                      | ⬜ planned  |
| P1.2 evals gate                          | ⬜ planned  |
| P1.3 external tracing                    | ⬜ planned  |
| P2.1 RAG grounding                       | ⬜ optional |
