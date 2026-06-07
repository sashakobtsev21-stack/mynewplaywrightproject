# Changelog

Roughly follows [Keep a Changelog](https://keepachangelog.com/) +
[Semantic Versioning](https://semver.org/).

Versions correspond to the project's weekly phases (see roadmap in README).
No public releases yet — everything is pre-1.0.

## [Unreleased]

### Added

- Retrieval grounding (lightweight **RAG**) for the test generator. Instead of one
  fixed example, it now grounds each draft in the existing specs most relevant to
  the requirement, ranked by **BM25** over the spec corpus (`src/ai/retrieval/`) —
  lexical, deterministic, no embeddings API or vector DB; a semantic retriever
  drops in behind the same function. Scoped by kind, top-2, with a fallback. 6 unit
  tests (97 total).
- External trace export over **OpenTelemetry** (OTLP/HTTP), behind `TRACE_EXPORT`.
  With `TRACE_EXPORT=otlp`, `writeTrace()` also ships each (redacted) call as a
  CLIENT span to `OTEL_EXPORTER_OTLP_ENDPOINT` — so the AI layer appears in Jaeger /
  Tempo / Honeycomb / any otel-collector. Pluggable `TraceExporter` interface
  (`src/ai/exporters/`): `NoopExporter` (default) and a `fetch`-based
  `OtlpHttpExporter` (no SDK); the span payload (`toResourceSpans`) uses the GenAI
  semantic conventions plus `ai.cost_usd` / `ai.injection_suspected`. Fire-and-forget
  and non-throwing — telemetry never breaks a call. 6 unit tests (mapping + transport).
- AI evals are now a **release gate** with an **LLM-as-judge**. `evaluateGate()`
  (`evals/gate.ts`) checks each run against committed `evals/thresholds.json`
  (`minPassRate`, `minJudgeScore`) and exits non-zero when the bar isn't cleared;
  CI runs `npm run eval:ai` offline on every PR (deterministic — fixtures/faker,
  no key). In live runs an LLM judge (`evals/judge.ts`, haiku, prompt
  `eval-judge.v1.md`) grades each failure analysis 1-5 with a zod-validated verdict
  (score, correct-root-cause, actionable, hallucination-risk) and gates the
  _average_ — it's a proxy, not ground truth. 11 unit tests for the gate + judge
  parsing.
- Multi-provider AI layer behind a small `LLMProvider` interface
  (`src/ai/providers/`). The text helpers (data generator, test generator) are now
  vendor-agnostic, switched by `LLM_PROVIDER`: `AnthropicProvider` (default, wraps
  `callClaude`) or `OpenAICompatibleProvider` — a `fetch`-based adapter for any
  OpenAI-compatible `/chat/completions` endpoint (OpenAI, local Ollama / LM Studio,
  OpenRouter), no extra SDK. Traces gained a `provider` field and `PRICING` gained
  the GPT-4o / 4.1 families, so `npm run ai:budget` totals spend across vendors
  (local endpoints billed at $0). The multimodal analyzer and the tool-use agent
  deliberately stay Anthropic-only. New env: `LLM_PROVIDER`, `OPENAI_API_KEY`,
  `OPENAI_BASE_URL`, `OPENAI_MODEL`. 6 provider unit tests (mocked transport).
- Agentic (tool-use) failure analyzer (`src/ai/agentic-analyzer.ts`, opt-in via
  `npm run ai:analyze -- --trace <dir> --agent`). The model investigates the
  failure itself with four sandboxed tools — `list_dir` / `read_file` / `grep` /
  `view_screenshot` — every path confined to the project root by
  `resolveWithinRoot()` and every tool input zod-validated. The loop runs through
  `callClaude()`, so each step is retried and traced; a step cap, read caps, and a
  grep budget bound cost. New system prompt `failure-analyzer-agent.v1.md` and 10
  unit tests driving the loop with a fake client (no network).
- Curated Claude Code agent team under `.claude/agents/` (prompt-engineer,
  typescript-specialist, playwright-qa-engineer, code-reviewer,
  ai-safety-specialist, cost-analyst, security/dependency auditors), adapted from
  the my_agents library with the framework's swarm/MCP coupling removed. See
  `.claude/agents/README.md` and the roadmap in
  `docs/ai-engineer-adaptation-plan.md`.

### Security

- AI-layer prompt-injection hardening. Untrusted inputs (the test-generator
  requirement; the failure-analyzer's error-context + spec source, including text
  inside the failure screenshot) are fenced in `<untrusted_data>` blocks — prompts
  bumped to `v2` — and sanitized against fence breakout. A `detectInjection()`
  heuristic flags suspicious input, logs it, and records `injection_suspected` on
  the trace. `redactSecrets()` masks keys/JWTs/tokens/credentials/emails from the
  trace error field before it's persisted. New `src/ai/redaction.ts` + 12 unit
  tests; `PRICING` now carries a "last verified" date.

### Planned

- Storage state for admin UI tests (skip the login form per session)
- Slack/Telegram nightly failure notifications
- Performance trending dashboard from `performance-results/*.jsonl`

## [0.9.0] — 2026-05-30

Broadened the test suite across the admin-only and previously-uncovered
endpoints (rooms, messages, report, branding) and deepened the AI-layer unit
tests.

### Added

- Admin room management API coverage (create / update / delete under the admin
  token), with typed `RoomClient` mutations and a `roomFactory`.
- Contact message API coverage (create, inbox listing, count, detail, mark-read,
  delete) via a new typed `MessageClient`.
- Occupancy report and branding API coverage via `ReportClient` / `BrandingClient`.
- Booking list filter edges (unknown room → empty, room/name scoping) and auth
  session validation edges.
- Contract tests and JSON Schemas for the message list/detail, report, branding,
  and a created-room round-trip.
- Negative API coverage: room/message/report auth (401/403), invalid room
  payload (400), unknown ids (404), and a booking date overlap (409).
- Admin UI specs and Page Objects: rooms table and create-room form, message
  inbox, branding page, and navigation out of the portal (Front Page, logout).
  Nav-dependent specs skip on mobile widths where the nav collapses.
- AI-layer unit tests: retry/backoff on a fake client, `isRetryable`, JSON
  recovery edges, budget summarize edges, and an eval-dataset integrity guard.
  `sendWithRetry` is exported so the backoff loop can be driven under test.
- Two eval spec cases (admin room creation, contact message API).

### Changed

- README test-suite table refreshed (~160 tests across the matrix).

### Notes

- The live demo does not invalidate a token on logout; that assertion is kept as
  a documented `test.fixme` rather than a passing test.

## [0.8.0] — 2026-05-29

Repositioned toward AI engineering: the AI layer grew from three thin helpers
into something with reliability, observability, and evals around it.

### Added

- Prompts extracted to versioned files (`src/ai/prompts/*.v1.md`) with a loader
  that enforces the declared input/output contract.
- Zod validation of generated data, with a strict/loose fallback and recovery of
  JSON truncated at `max_tokens` (`src/ai/structured.ts`, `schemas.ts`).
- `callClaude()` wrapper: exponential-backoff retries plus a per-call JSONL trace
  (latency, tokens, cost) in `logs/ai-traces.jsonl`.
- `npm run ai:budget` — totals AI spend from the trace log against `.ai-budget.json`.
- `npm run eval:ai` — eval suite scoring all three helpers, runnable offline against fixtures.
- `tests/unit/` — node-only `unit` Playwright project covering the AI layer; runs in CI.
- `docs/ai-layer-design.md`.

### Changed

- README restructured around the AI layer; `ai-features.md` expanded with traces,
  costs, evals, and a safety note.
- All ESLint warnings cleared (assert-name patterns + targeted spec fixes).
- `POST >1MB` negative test moved from `test.skip` to `test.fixme` (same effect, clearer intent).

## [0.7.1] — 2026-05-28

### Fixed

- CI: per-project Playwright browser cache so firefox/webkit actually install.
- Selectors aligned with the live demo on the reservation page (Reserve Now /
  Cancel / form inputs).
- `HomePage` now waits for room booking links before `assertLoaded` resolves.
- Authenticated `GET /booking/{id}` (platform requires a token now).
- `bookingFactory` uses far-future random dates to avoid 409 slot collisions.
- Booking schema no longer requires `email`/`phone` (platform stopped returning them).
- Test-design fixes: 403/404 tolerance on unauth `GET`, factory dates in `PUT`.
- Two flows marked `test.fixme`: happy-path POST (rate-limit) and the cancel
  test (UI state machine mismatch).
- Schemas synced with platform: `PUT` response unwrap, `PATCH` endpoint removed.
- Default env vars to public demo so CI runs without secrets.
- Corrected API base path so clients hit the REST API, not the frontend.
- Added `scrollToContact()` to `HomePage` and fixed `toMatchSchema` matcher typing.

## [0.7.0] — Week 4, end

### Added

- Full bilingual README (EN + RU sections).
- `docs/architecture.md` with a Mermaid diagram of the layers.
- `docs/ai-features.md` — usage, prompts, fallbacks, costs.
- `docs/ci-cd.md` — workflow flow + one-time GH Pages setup.
- Issue templates (`bug_report.md`, `flaky_test.md`) and a PR template.
- `CHANGELOG.md` (this file).

### Changed

- Tidied a few comments after a re-read. No behaviour changes.

## [0.6.0] — Week 4

### Added

- `@anthropic-ai/sdk` + `tsx` for TS script entrypoints.
- `src/ai/anthropic-client.ts` — shared lazy-initialised client.
- `src/ai/test-generator.ts` + `scripts/generate-test.ts` — draft `.spec.ts`
  from a plain-English requirement.
- `src/ai/failure-analyzer.ts` + `scripts/analyze-failure.ts` — Claude reads
  `error-context.md` + screenshot, returns hypothesis + next steps.
- `src/ai/data-generator.ts` — typed `aiDataGenerator.generate('booking' | 'guest', ...)`
  with sha1-keyed disk cache and a faker fallback chain.

### Notes

- All three AI modules degrade gracefully without `ANTHROPIC_API_KEY` — tests
  themselves are unaffected.

## [0.5.0] — Week 3

### Added

- `.github/workflows/tests.yml` — PR + push pipeline.
- `.github/workflows/nightly.yml` — full matrix on a cron, retains 14d.
- `.github/workflows/publish-allure.yml` — `workflow_run` → merge artifacts →
  deploy to `gh-pages` via `peaceiris/actions-gh-pages`.
- `docker/Dockerfile` (pinned to `playwright:v1.55.0-jammy`) + `docker-compose.yml`.
- `.dockerignore`.
- `scripts/publish-allure.sh` for local report generation (Java needed).
- `allure-playwright` reporter, wired into `playwright.config.ts`.

### Changed

- README got CI/Allure/Docker badges and a Quick start.

## [0.4.0] — Week 3, early

### Added

- AJV-based JSON Schema validation:
  - `src/api/schemas/{booking,booking-list,room,room-list,auth}.schema.json`
  - `src/utils/schema-validator.ts` wrapper (AJV with `strict: false`)
  - `src/utils/custom-matchers.ts` registering `expect(...).toMatchSchema(...)`
- `src/utils/perf-recorder.ts` — appends JSONL samples to
  `performance-results/<date>.jsonl`.
- Contract tests under `tests/api/contracts/` (3 specs, 5 tests).
- Negative tests:
  - `tests/negative/api/{booking-negative,auth-negative}.spec.ts` (11 tests)
  - `tests/negative/ui/booking-form-negative.spec.ts` (7 tests)
- Performance: `tests/performance/home-metrics.spec.ts` (FCP/LCP/navigation)
  and `tests/performance/api/api-latency.spec.ts`.
- Visual: `tests/visual/{home,admin,booking-form}.spec.ts` with
  `maxDiffPixelRatio` and masks on volatile bits (images, prices).

### Changed

- npm scripts: added `test:negative`, `test:contracts`, `test:perf`,
  `test:visual`, `test:visual:update`.
- `.gitignore` learnt about `performance-results/`.

## [0.3.0] — Week 2

### Added

- `@faker-js/faker` and a `src/fixtures/data-factory.ts`
  (`guestFactory`, `bookingFactory`, `uiGuestFactory`).
- `src/utils/date-helpers.ts` (`toIsoDate`, `addDays`, `bookingWindow`) and
  `api-helpers.ts` (cookie + basic auth header).
- API layer: `BaseClient`, `AuthClient`, `BookingClient`, `RoomClient` + types.
- Worker-scoped `adminToken` fixture (login once per worker, reuse).
- Smoke specs: `home`, `admin-portal`, `api/api-health` (8 tests).
- Regression UI: `admin-login`, `booking-flow`, `contact-form`, `home-navigation` (16 tests).
- Regression API: `auth`, `booking-crud` (serial), `booking-list` (13 tests).

### Refactored

- Extracted `BookingFormComponent` from `BookingPage` once the same guest
  fields appeared in two places. `GuestDetails` type moved with it to avoid
  a circular import.

## [0.2.0] — Week 1, end

### Added

- `src/config/env.ts` — zod-validated env loader; fails loudly on bad input.
- `src/config/constants.ts` — `ROUTES`, `TIMEOUTS`, `API` prefixes.
- `src/utils/logger.ts` — pino, pretty-print local / JSON in CI.
- `BasePage` + first POMs: `HomePage`, `BookingPage`, `AdminLoginPage`.
- `src/fixtures/playwright-fixtures.ts` — custom `test` with page object
  fixtures and a per-test `log` fixture.

### Changed

- `playwright.config.ts` now reads from `src/config/env.ts` instead of doing
  its own dotenv dance (resolves a Week 1 TODO).

## [0.1.0] — Week 1, day 1-2

### Added

- Project skeleton, `package.json`, `tsconfig.json` (strict).
- `playwright.config.ts` — 6 projects: chromium, firefox, webkit, mobile-chrome,
  mobile-safari, api.
- ESLint (`.eslintrc.json`), Prettier, commitlint, Husky pre-commit + commit-msg.
- `.env.example`, `.gitignore`.
- Empty folder scaffolding and a stub README.
