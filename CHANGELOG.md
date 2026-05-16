# Changelog

Roughly follows [Keep a Changelog](https://keepachangelog.com/) +
[Semantic Versioning](https://semver.org/).

Versions correspond to the project's weekly phases (see roadmap in README).
No public releases yet — everything is pre-1.0.

## [Unreleased]

- Storage state for admin UI tests (skip the login form per session)
- Slack/Telegram nightly failure notifications
- Performance trending dashboard from `performance-results/*.jsonl`

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
