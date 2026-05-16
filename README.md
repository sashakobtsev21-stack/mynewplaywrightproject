# рџЏЁ Restful-Booker Platform вЂ” Test Automation

[![tests](https://github.com/USER/restful-booker-tests/actions/workflows/tests.yml/badge.svg)](https://github.com/USER/restful-booker-tests/actions/workflows/tests.yml)
[![nightly](https://github.com/USER/restful-booker-tests/actions/workflows/nightly.yml/badge.svg)](https://github.com/USER/restful-booker-tests/actions/workflows/nightly.yml)
[![Allure Report](https://img.shields.io/badge/Allure-Report-orange.svg)](https://USER.github.io/restful-booker-tests/)
[![Node](https://img.shields.io/badge/Node-20%20LTS-339933.svg?logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> A personal portfolio project вЂ” UI + API + visual + contract tests against
> [Restful-Booker Platform](https://automationintesting.online) using Playwright + TypeScript.
> Built over four evenings-and-weekends weeks.

<!-- TODO: replace placeholder once first Allure report is live -->
<!-- ![Allure dashboard screenshot](docs/images/allure-dashboard.png) -->

рџ‡¬рџ‡§ [English](#-english) В· рџ‡·рџ‡є [Р СѓСЃСЃРєР°СЏ РІРµСЂСЃРёСЏ](#-СЂСѓСЃСЃРєР°СЏ-РІРµСЂСЃРёСЏ)

> Replace `USER` in the badges/links above with your GitHub handle.

---

## рџ‡¬рџ‡§ English

### Why this project?

I wanted a single repo that I could point a hiring manager at and say "this is
how I work" вЂ” not a curated list of disconnected snippets. The goals were:

- prove I can ship a working test pyramid against a real (if toy) app, end to end;
- show I know modern Playwright, not just the "open browser, click button" subset;
- play with a few AI helpers without pretending AI replaces a QA;
- write code I'd be happy to inherit on day one of a new job.

Restful-Booker Platform is convenient because it has both a public demo
(`https://automationintesting.online`) and a local Docker setup, exposes a
documented REST API, and isn't so big you spend the first week understanding
the domain.

### Tech stack вЂ” and why

| Tool | Why it |
| --- | --- |
| **Playwright + TypeScript** | Best multi-browser support out of the box, first-class API testing via `APIRequestContext`, real trace viewer, types help a lot when refactoring. |
| **Page Object Model** | Every project I've seen that started with "let's just use helpers" ended up with a 2000-line `utils.ts`. POM forces a per-page boundary. |
| **Faker** | Random but reproducible-enough data without writing boring fixture files. |
| **Zod** | Validating the env file the second it's loaded means tests die with a useful message instead of `undefined.toLowerCase()` deep inside. |
| **AJV** | Industry standard for JSON Schema. Wrapped in a tiny matcher (`toMatchSchema`) so contract tests read naturally. |
| **Pino** | Pretty locally, JSON in CI, fast. Worth more than `console.log`. |
| **Allure** | Recruiters and team leads read screenshots, not stack traces. Allure puts both in one place. |
| **Husky + commitlint** | Saves me from `wip` commits accidentally landing on `main`. (Mostly.) |
| **Docker** | Reproducibility for whoever clones the repo without the right Chrome version. |
| **@anthropic-ai/sdk** | Optional layer for the three AI helpers (see below). |

### Architecture

Short version: tests import a custom `test` fixture, which wires in Page
Objects and API clients. Schemas, factories, and the logger are utilities used
across both sides.

```
tests/  в”Ђв”Ђв–є  src/fixtures/playwright-fixtures.ts  в”Ђв”Ђв–є  src/pages/  + src/api/clients/
                                                  в””в”Ђв–є  src/utils/ + src/config/
```

Full diagram and per-layer notes in **[docs/architecture.md](docs/architecture.md)**.

### Quick start

#### Prerequisites

- Node 22 LTS
- (Optional) Docker, for containerised runs
- (Optional) Java 17+, only if you want to generate Allure reports locally

#### Install + first run

```bash
npm ci
npx playwright install --with-deps
cp .env.example .env
npm run test:smoke
```

That's the full setup. The `.env.example` defaults already point at the public
demo with its known admin creds (`admin` / `password`), so no secrets to find.

#### Running with Docker

```bash
docker compose -f docker/docker-compose.yml run --rm tests           # full chromium suite
docker compose -f docker/docker-compose.yml run --rm tests npm run test:smoke
```

#### Switching environments

`TEST_ENV` decides which `.env.<env>` file is layered on top of `.env`:

```bash
TEST_ENV=public npm test    # default вЂ” hits automationintesting.online
TEST_ENV=local  npm test    # hits a locally-running platform (see below)
```

For `TEST_ENV=local`, bring up the platform yourself вЂ” it's a multi-service
Spring app and they evolve it upstream. Repo: [mwinteringham/restful-booker-platform](https://github.com/mwinteringham/restful-booker-platform).

#### Useful npm scripts

```bash
npm run test:smoke           # @smoke-tagged, fast
npm run test:ui              # regression UI on chromium
npm run test:api             # api project, no browser
npm run test:negative        # negative API + UI
npm run test:contracts       # JSON Schema contract tests
npm run test:perf            # @perf-tagged, writes JSONL into performance-results/
npm run test:visual:update   # create / refresh visual baselines
npm run test:visual          # compare against baselines
npm run lint                 # ESLint
npm run typecheck            # tsc --noEmit
npm run allure:serve         # generate Allure + open it locally (needs Java)
```

### Test types

Roughly 70 tests, organised by purpose so the CI matrix maps cleanly onto folders.

| Folder | What it does | Count |
| --- | --- | --- |
| `tests/smoke/` | Quick sanity on home, admin login, API health. Runs on every PR before regression. | 8 |
| `tests/regression/ui/` | Full booking flow, contact form, admin login, navigation. | 16 |
| `tests/regression/api/` | Auth + booking CRUD (serial) + list filtering. | 13 |
| `tests/negative/` | Bad payloads, missing fields, malformed dates, XSS sanity, unicode, etc. | 18 |
| `tests/performance/` | Navigation timings, FCP, LCP, API response time. Results dumped to JSONL. | 4 |
| `tests/visual/` | Pixel-diff snapshots of home, admin, booking form. Masks volatile bits. | 7 |
| `tests/api/contracts/` | AJV-validated JSON Schema checks on auth / room / booking responses. | 5 |

### AI features рџ¤–

Three optional helpers behind a single `ANTHROPIC_API_KEY` toggle. They work
in isolation вЂ” the rest of the suite is unaware.

1. **Test Generator** вЂ” `npm run ai:generate-test -- --requirement "..." --type ui|api`.
   Drafts a `.spec.ts` in `tests/_generated/` using the project's POMs and an
   example spec as context. Never auto-commits.
2. **Failure Analyzer** вЂ” `npm run ai:analyze -- --trace path/to/test-results/<folder>`.
   Sends `error-context.md` plus the failure screenshot to Claude, returns a
   short markdown analysis. Without an API key, prints a structured local dump.
3. **Data Generator** вЂ” `aiDataGenerator.generate('booking', { context, count })`.
   Programmatic. Caches by sha1 on disk. Falls back to faker when AI is off
   or anything goes wrong вЂ” tests never break because of it.

Detailed docs, prompts, and rough cost estimates: **[docs/ai-features.md](docs/ai-features.md)**.

> AI here is an assistant, not a QA. Generated specs need a human review,
> failure analyses are hypotheses. The point is to skip the boring bits, not
> to outsource judgement.

### CI/CD

Three workflows under `.github/workflows/`:

- `tests.yml` вЂ” lint + typecheck в†’ smoke (chromium) в†’ regression matrix
  (chromium / firefox / webkit / api). Runs on every PR and push to `main`.
- `nightly.yml` вЂ” full project matrix incl. mobile, on a 02:00 UTC cron.
- `publish-allure.yml` вЂ” picks up artifacts from the two above on `main`,
  generates the report, deploys it to `gh-pages`.

Full flow + one-time repo setup for GitHub Pages: **[docs/ci-cd.md](docs/ci-cd.md)**.

### Reports

- **Allure** (the main one) вЂ” deployed to GitHub Pages by `publish-allure.yml`.
  Once you've run the suite locally (`npm test`) you can also generate it on
  your machine: `npm run allure:serve` (needs Java 17+).
- **Playwright HTML report** вЂ” always written to `playwright-report/` after
  a run. `npm run report` opens it.
- **JUnit XML** вЂ” emitted in CI for whatever downstream tooling expects it.
- **Performance JSONL** вЂ” `performance-results/<date>.jsonl`. Not visualised
  yet (on the wishlist below).

### Roadmap вЂ” what happened each week

This is roughly the order I actually built things, not a sales pitch. I left
the receipts: most phases have a CHANGELOG entry and matching commits.

- **Week 1** вЂ” project init: configs, Husky, base POMs, env validation, first
  smoke specs. Spent half a day re-doing the env loader after the first time
  it crashed in CI with no useful message.
- **Week 2** вЂ” main regression: full booking flow, admin tests, all of the
  API client + types layer. Extracted `BookingFormComponent` once the same
  set of fields appeared in two places. Worker-scoped `adminToken` came in
  here to stop spamming `/auth/login`.
- **Week 3** вЂ” quality bar: AJV schemas + `toMatchSchema` matcher, negative
  tests, perf, visual. Spent more time than I'd like to admit on Playwright
  project routing rules so the right tests land in the right CI matrix slice.
  Then CI itself: tests pipeline, nightly, Allure on GH Pages.
- **Week 4** вЂ” three Anthropic helpers (test generator, failure analyzer,
  data generator), Dockerfile, and the docs you're reading now. Plus a
  re-read of every file looking for AI-flavoured perfectionism to soften.

### Lessons learned

Things I'd put on a "before you start" note for past me:

- **AJV's `strict: true` hates `$schema` in your schema files.** Spent 15
  minutes confused before flipping to `strict: false`. Trade-off: you give
  up some validation of the schemas themselves, but that's fine for tests.
- **`actions/download-artifact` doesn't see other workflow runs.** I assumed
  it would and built the Allure pipeline around that. Had to switch to
  `dawidd6/action-download-artifact`. Annoying but works.
- **Don't pre-build a fat `BasePage`.** My first instinct was to put every
  conceivable helper there "just in case". Three days later half of them
  were unused and the rest were better as page-specific methods.
- **Component extraction is a smell-driven decision.** I split out
  `BookingFormComponent` only after the guest fields appeared twice. Doing
  it on day one would have been speculative.
- **Visual baselines are OS-specific.** CI generates them on Linux; trying
  to reuse those on Windows fails in spectacular ways. Fix is to always
  regenerate from CI or pin a Docker build.
- **`allure-commandline` is heavy.** It pulls a JRE wrapper. I deliberately
  did NOT put it in devDeps вЂ” `npx allure-commandline@version` in the
  script keeps local installs slim.
- **Token spam.** First version of the AI data generator hit `/v1/messages`
  on every test call. Cache by hash в†’ costs dropped to basically zero.

### Future improvements

Honest backlog, in rough priority order:

- `storageState` for admin UI sessions вЂ” would shave a second per admin test.
- Telegram or Slack notification for nightly failures (scaffolding's commented
  out in `nightly.yml`).
- Mini-dashboard from `performance-results/*.jsonl` вЂ” even a static HTML
  with Chart.js would do.
- Migrate ESLint to v9 flat config.
- Mutation testing pilot with Stryker on the API clients.
- Real `trace.zip` parsing in the failure analyzer (currently relies on the
  per-test folder Playwright already extracts to).

### Contacts

If you spotted something off, or want to chat about QA tooling:

- вњ‰пёЏ <oleksandr@example.com> *(replace with real)*
- рџ’ј [linkedin.com/in/USER](https://www.linkedin.com/in/USER) *(replace)*
- рџ’¬ Telegram: `@USER` *(replace)*

License: [MIT](LICENSE).

---

## рџ‡·рџ‡є Р СѓСЃСЃРєР°СЏ РІРµСЂСЃРёСЏ

### Р—Р°С‡РµРј СЌС‚РѕС‚ РїСЂРѕРµРєС‚?

РҐРѕС‚РµР» СЃРґРµР»Р°С‚СЊ РѕРґРёРЅ СЂРµРїРѕР·РёС‚РѕСЂРёР№, РЅР° РєРѕС‚РѕСЂС‹Р№ РјРѕР¶РЅРѕ РїРѕРєР°Р·Р°С‚СЊ СЂРµРєСЂСѓС‚РµСЂСѓ РёР»Рё
С‚РёРјР»РёРґСѓ Рё СЃРєР°Р·Р°С‚СЊ В«РІРѕС‚ С‚Р°Рє СЏ СЂР°Р±РѕС‚Р°СЋВ» вЂ” Р° РЅРµ РЅР°Р±РѕСЂ СЂР°Р·СЂРѕР·РЅРµРЅРЅС‹С… СЃРЅРёРїРїРµС‚РѕРІ.
Р¦РµР»Рё Р±С‹Р»Рё С‚Р°РєРёРµ:

- РїСЂРѕРґРµРјРѕРЅСЃС‚СЂРёСЂРѕРІР°С‚СЊ, С‡С‚Рѕ СЏ СѓРјРµСЋ СЃРѕР±СЂР°С‚СЊ СЂР°Р±РѕС‡СѓСЋ РїРёСЂР°РјРёРґСѓ С‚РµСЃС‚РѕРІ РїСЂРѕС‚РёРІ
  СЂРµР°Р»СЊРЅРѕРіРѕ (РїСѓСЃС‚СЊ Рё РёРіСЂРѕРІРѕРіРѕ) РїСЂРёР»РѕР¶РµРЅРёСЏ РѕС‚ Рё РґРѕ;
- РїРѕРєР°Р·Р°С‚СЊ СЃРѕРІСЂРµРјРµРЅРЅС‹Р№ Playwright, Р° РЅРµ В«РѕС‚РєСЂРѕР№ Р±СЂР°СѓР·РµСЂ вЂ” РЅР°Р¶РјРё РєРЅРѕРїРєСѓВ»;
- РїРѕРёРіСЂР°С‚СЊСЃСЏ СЃ РїР°СЂРѕР№ AI-С…РµР»РїРµСЂРѕРІ, РЅРµ РґРµР»Р°СЏ РІРёРґ, С‡С‚Рѕ AI Р·Р°РјРµРЅСЏРµС‚ QA;
- РЅР°РїРёСЃР°С‚СЊ РєРѕРґ, РєРѕС‚РѕСЂС‹Р№ РјРЅРµ СЃР°РјРѕРјСѓ РЅРµ Р±С‹Р»Рѕ Р±С‹ СЃС‚С‹РґРЅРѕ СѓРЅР°СЃР»РµРґРѕРІР°С‚СЊ.

Restful-Booker Platform СѓРґРѕР±РµРЅ С‚РµРј, С‡С‚Рѕ Сѓ РЅРµРіРѕ РµСЃС‚СЊ Рё РїСѓР±Р»РёС‡РЅРѕРµ РґРµРјРѕ
(`https://automationintesting.online`), Рё Р»РѕРєР°Р»СЊРЅР°СЏ СЃР±РѕСЂРєР° РІ Docker, РµСЃС‚СЊ
Р·Р°РґРѕРєСѓРјРµРЅС‚РёСЂРѕРІР°РЅРЅС‹Р№ REST API, Рё РѕРЅ РЅРµ РЅР°СЃС‚РѕР»СЊРєРѕ Р±РѕР»СЊС€РѕР№, С‡С‚РѕР±С‹ РїРµСЂРІСѓСЋ РЅРµРґРµР»СЋ
С‚СЂР°С‚РёС‚СЊ РЅР° СЂР°Р·Р±РѕСЂ РїСЂРµРґРјРµС‚РЅРѕР№ РѕР±Р»Р°СЃС‚Рё.

### РЎС‚РµРє вЂ” Рё РїРѕС‡РµРјСѓ

| РРЅСЃС‚СЂСѓРјРµРЅС‚ | РџРѕС‡РµРјСѓ |
| --- | --- |
| **Playwright + TypeScript** | Р›СѓС‡С€Р°СЏ РїРѕРґРґРµСЂР¶РєР° РЅРµСЃРєРѕР»СЊРєРёС… Р±СЂР°СѓР·РµСЂРѕРІ РёР· РєРѕСЂРѕР±РєРё, РЅР°С‚РёРІРЅС‹Р№ API-С‚РµСЃС‚РёРЅРі С‡РµСЂРµР· `APIRequestContext`, С‡РµР»РѕРІРµС‡РµСЃРєРёР№ trace viewer, С‚РёРїС‹ РІС‹СЂСѓС‡Р°СЋС‚ РїСЂРё СЂРµС„Р°РєС‚РѕСЂРёРЅРіРµ. |
| **Page Object Model** | РљР°Р¶РґС‹Р№ РїСЂРѕРµРєС‚ РёР· РјРѕРµР№ РїСЂР°РєС‚РёРєРё, РєРѕС‚РѕСЂС‹Р№ РЅР°С‡РёРЅР°Р»СЃСЏ СЃ В«РґР°РІР°Р№С‚Рµ РїСЂРѕСЃС‚Рѕ С…РµР»РїРµСЂС‹В», Р·Р°РєР°РЅС‡РёРІР°Р»СЃСЏ 2000-СЃС‚СЂРѕС‡РЅС‹Рј `utils.ts`. POM РЅР°РІСЏР·С‹РІР°РµС‚ РіСЂР°РЅРёС†Сѓ В«РѕРґРёРЅ РѕР±СЉРµРєС‚ вЂ” РѕРґРЅР° СЃС‚СЂР°РЅРёС†Р°В». |
| **Faker** | РЎР»СѓС‡Р°Р№РЅС‹Рµ, РЅРѕ РІРѕСЃРїСЂРѕРёР·РІРѕРґРёРјС‹Рµ-РґРѕСЃС‚Р°С‚РѕС‡РЅРѕ РґР°РЅРЅС‹Рµ Р±РµР· РїРѕСЂС‚СЏРЅРѕРє С„РёРєСЃС‚СѓСЂ. |
| **Zod** | Р’Р°Р»РёРґР°С†РёСЏ env-С„Р°Р№Р»Р° РЅР° СЃС‚Р°СЂС‚Рµ вЂ” С‚РµСЃС‚С‹ РїР°РґР°СЋС‚ СЃ РїРѕРЅСЏС‚РЅС‹Рј СЃРѕРѕР±С‰РµРЅРёРµРј, Р° РЅРµ `undefined.toLowerCase()` РіРґРµ-С‚Рѕ РІ СЃРµСЂРµРґРёРЅРµ. |
| **AJV** | РЎС‚Р°РЅРґР°СЂС‚ РґР»СЏ JSON Schema. РћР±С‘СЂРЅСѓС‚ РІ РјР°Р»РµРЅСЊРєРёР№ РјР°С‚С‡РµСЂ (`toMatchSchema`), contract-С‚РµСЃС‚С‹ С‡РёС‚Р°СЋС‚СЃСЏ РµСЃС‚РµСЃС‚РІРµРЅРЅРѕ. |
| **Pino** | Р›РѕРєР°Р»СЊРЅРѕ РєСЂР°СЃРёРІРѕ, РІ CI вЂ” JSON, Р±С‹СЃС‚СЂС‹Р№. Р›СѓС‡С€Рµ, С‡РµРј `console.log`. |
| **Allure** | РЎРєСЂРёРЅС€РѕС‚С‹ Рё СЃС‚РµРєС‚СЂРµР№СЃС‹ СЂРµРєСЂСѓС‚РµСЂС‹ С‡РёС‚Р°СЋС‚ РѕС…РѕС‚РЅРµРµ Р»РѕРіРѕРІ. Allure РєР»Р°РґС‘С‚ РІСЃС‘ РІ РѕРґРЅРѕРј РјРµСЃС‚Рµ. |
| **Husky + commitlint** | РќРµ РґР°С‘С‚ СЃР»СѓС‡Р°Р№РЅРѕ РѕС‚РїСЂР°РІРёС‚СЊ `wip` РІ `main`. Р’ РѕСЃРЅРѕРІРЅРѕРј. |
| **Docker** | Р’РѕСЃРїСЂРѕРёР·РІРѕРґРёРјРѕСЃС‚СЊ РґР»СЏ С‚РµС…, РєС‚Рѕ СЃРєР»РѕРЅРёСЂСѓРµС‚ СЂРµРїРѕ Р±РµР· РЅСѓР¶РЅРѕР№ РІРµСЂСЃРёРё Chrome. |
| **@anthropic-ai/sdk** | РћРїС†РёРѕРЅР°Р»СЊРЅС‹Р№ СЃР»РѕР№ РґР»СЏ С‚СЂС‘С… AI-С…РµР»РїРµСЂРѕРІ (РЅРёР¶Рµ). |

### РђСЂС…РёС‚РµРєС‚СѓСЂР°

РљРѕСЂРѕС‚РєРѕ: С‚РµСЃС‚С‹ РёРјРїРѕСЂС‚РёСЂСѓСЋС‚ РєР°СЃС‚РѕРјРЅСѓСЋ С„РёРєСЃС‚СѓСЂСѓ `test`, РєРѕС‚РѕСЂР°СЏ РїРѕРґСЃРѕРІС‹РІР°РµС‚
Page Objects Рё API-РєР»РёРµРЅС‚РѕРІ. РЎС…РµРјС‹, С„Р°Р±СЂРёРєРё Рё Р»РѕРіРіРµСЂ вЂ” СѓС‚РёР»РёС‚С‹, РєРѕС‚РѕСЂС‹Рµ
РёСЃРїРѕР»СЊР·СѓСЋС‚СЃСЏ СЃ РѕР±РµРёС… СЃС‚РѕСЂРѕРЅ.

```
tests/  в”Ђв”Ђв–є  src/fixtures/playwright-fixtures.ts  в”Ђв”Ђв–є  src/pages/  + src/api/clients/
                                                  в””в”Ђв–є  src/utils/ + src/config/
```

РџРѕР»РЅР°СЏ РґРёР°РіСЂР°РјРјР° Рё РѕРїРёСЃР°РЅРёРµ СЃР»РѕС‘РІ вЂ” **[docs/architecture.md](docs/architecture.md)**.

### Quick start

#### Р§С‚Рѕ РЅСѓР¶РЅРѕ

- Node 22 LTS
- (РћРїС†РёРѕРЅР°Р»СЊРЅРѕ) Docker вЂ” РµСЃР»Рё С…РѕС‡РµС‚СЃСЏ Р·Р°РїСѓСЃРєР°С‚СЊ РІ РєРѕРЅС‚РµР№РЅРµСЂРµ
- (РћРїС†РёРѕРЅР°Р»СЊРЅРѕ) Java 17+ вЂ” С‚РѕР»СЊРєРѕ РµСЃР»Рё С…РѕС‡РµС‚СЃСЏ СЃРѕР±РёСЂР°С‚СЊ Allure-РѕС‚С‡С‘С‚ Р»РѕРєР°Р»СЊРЅРѕ

#### РЈСЃС‚Р°РЅРѕРІРєР° Рё РїРµСЂРІС‹Р№ Р·Р°РїСѓСЃРє

```bash
npm ci
npx playwright install --with-deps
cp .env.example .env
npm run test:smoke
```

Р РІСЃС‘. Р”РµС„РѕР»С‚С‹ РІ `.env.example` СѓР¶Рµ СЃРјРѕС‚СЂСЏС‚ РЅР° РїСѓР±Р»РёС‡РЅРѕРµ РґРµРјРѕ СЃРѕ С€С‚Р°С‚РЅС‹РјРё
РєСЂРµРґР°РјРё Р°РґРјРёРЅР° (`admin` / `password`), РЅРёРєР°РєРёС… СЃРµРєСЂРµС‚РѕРІ РёСЃРєР°С‚СЊ РЅРµ РЅСѓР¶РЅРѕ.

#### Р—Р°РїСѓСЃРє С‡РµСЂРµР· Docker

```bash
docker compose -f docker/docker-compose.yml run --rm tests           # РїРѕР»РЅС‹Р№ chromium-РЅР°Р±РѕСЂ
docker compose -f docker/docker-compose.yml run --rm tests npm run test:smoke
```

#### РџРµСЂРµРєР»СЋС‡РµРЅРёРµ РѕРєСЂСѓР¶РµРЅРёР№

`TEST_ENV` СЂРµС€Р°РµС‚, РєР°РєРѕР№ `.env.<env>` РїРѕРґРєР»Р°РґС‹РІР°РµС‚СЃСЏ РїРѕРІРµСЂС… `.env`:

```bash
TEST_ENV=public npm test    # РґРµС„РѕР»С‚ вЂ” РїСЂРѕС‚РёРІ automationintesting.online
TEST_ENV=local  npm test    # РїСЂРѕС‚РёРІ Р»РѕРєР°Р»СЊРЅРѕ РїРѕРґРЅСЏС‚РѕР№ РїР»Р°С‚С„РѕСЂРјС‹ (СЃРј. РЅРёР¶Рµ)
```

Р›РѕРєР°Р»СЊРЅС‹Р№ SUT РїРѕРґРЅРёРјР°Р№ СЃР°Рј вЂ” СЌС‚Рѕ РјСѓР»СЊС‚РёСЃРµСЂРІРёСЃ РЅР° Spring, Рё upstream РµРіРѕ
СЂР°Р·РІРёРІР°РµС‚. Р РµРїРѕ: [mwinteringham/restful-booker-platform](https://github.com/mwinteringham/restful-booker-platform).

#### РџРѕР»РµР·РЅС‹Рµ npm-СЃРєСЂРёРїС‚С‹

```bash
npm run test:smoke           # @smoke-С‚РµРіРё, Р±С‹СЃС‚СЂРѕ
npm run test:ui              # regression UI РЅР° chromium
npm run test:api             # api-project, Р±РµР· Р±СЂР°СѓР·РµСЂР°
npm run test:negative        # negative API + UI
npm run test:contracts       # contract-С‚РµСЃС‚С‹ РїРѕ JSON Schema
npm run test:perf            # @perf-С‚РµРіРё, РїРёС€РµС‚ JSONL РІ performance-results/
npm run test:visual:update   # СЃРѕР·РґР°С‚СЊ / РѕР±РЅРѕРІРёС‚СЊ РІРёР·СѓР°Р»СЊРЅС‹Рµ baselines
npm run test:visual          # СЃРІРµСЂРєР° СЃ baselines
npm run lint                 # ESLint
npm run typecheck            # tsc --noEmit
npm run allure:serve         # СЃРіРµРЅРµСЂРёС‚СЊ Рё РѕС‚РєСЂС‹С‚СЊ Allure Р»РѕРєР°Р»СЊРЅРѕ (РЅСѓР¶РµРЅ Java)
```

### РўРёРїС‹ С‚РµСЃС‚РѕРІ

~70 С‚РµСЃС‚РѕРІ, СЂР°Р·Р»РѕР¶РµРЅС‹ РїРѕ РЅР°Р·РЅР°С‡РµРЅРёСЋ вЂ” С‚Р°Рє CI-РјР°С‚СЂРёС†Р° Р°РєРєСѓСЂР°С‚РЅРѕ Р»РѕР¶РёС‚СЃСЏ РЅР°
СЃС‚СЂСѓРєС‚СѓСЂСѓ РїР°РїРѕРє.

| РџР°РїРєР° | Р§С‚Рѕ | РљРѕР»-РІРѕ |
| --- | --- | --- |
| `tests/smoke/` | Р‘Р°Р·РѕРІР°СЏ РїСЂРѕРІРµСЂРєР° РіР»Р°РІРЅРѕР№, Р°РґРјРёРЅ-Р»РѕРіРёРЅР°, API health. Р“РѕРЅРёС‚СЃСЏ РЅР° РєР°Р¶РґС‹Р№ PR РґРѕ regression. | 8 |
| `tests/regression/ui/` | РџРѕР»РЅС‹Р№ С„Р»РѕСѓ Р±СЂРѕРЅРёСЂРѕРІР°РЅРёСЏ, С„РѕСЂРјР° РѕР±СЂР°С‚РЅРѕР№ СЃРІСЏР·Рё, Р°РґРјРёРЅ-Р»РѕРіРёРЅ, РЅР°РІРёРіР°С†РёСЏ. | 16 |
| `tests/regression/api/` | Auth + booking CRUD (serial) + С„РёР»СЊС‚СЂР°С†РёСЏ СЃРїРёСЃРєР°. | 13 |
| `tests/negative/` | РќРµРІР°Р»РёРґРЅС‹Рµ payload, РїСЂРѕРїСѓС‰РµРЅРЅС‹Рµ РїРѕР»СЏ, РЅРµР»РѕРіРёС‡РЅС‹Рµ РґР°С‚С‹, XSS-СЃР°РЅРёС‚Рё, unicode Рё С‚.Рї. | 18 |
| `tests/performance/` | РўР°Р№РјРёРЅРіРё РЅР°РІРёРіР°С†РёРё, FCP, LCP, РІСЂРµРјСЏ РѕС‚РІРµС‚Р° API. Р РµР·СѓР»СЊС‚Р°С‚С‹ вЂ” РІ JSONL. | 4 |
| `tests/visual/` | РџРёРєСЃРµР»СЊРЅС‹Рµ СЃРЅР°РїС€РѕС‚С‹ РіР»Р°РІРЅРѕР№, Р°РґРјРёРЅРєРё, С„РѕСЂРјС‹. РЎ РјР°СЃРєР°РјРё РЅР° РґРёРЅР°РјРёРєСѓ. | 7 |
| `tests/api/contracts/` | AJV-РІР°Р»РёРґР°С†РёСЏ РѕС‚РІРµС‚РѕРІ auth / room / booking РїРѕ JSON Schema. | 5 |

### AI-С„РёС‡Рё рџ¤–

РўСЂРё РѕРїС†РёРѕРЅР°Р»СЊРЅС‹С… С…РµР»РїРµСЂР° Р·Р° РѕРґРЅРёРј РїРµСЂРµРєР»СЋС‡Р°С‚РµР»РµРј `ANTHROPIC_API_KEY`. Р Р°Р±РѕС‚Р°СЋС‚
РёР·РѕР»РёСЂРѕРІР°РЅРЅРѕ вЂ” РѕСЃС‚Р°Р»СЊРЅРѕР№ РЅР°Р±РѕСЂ С‚РµСЃС‚РѕРІ РїСЂРѕ РЅРёС… РЅРµ Р·РЅР°РµС‚.

1. **Test Generator** вЂ” `npm run ai:generate-test -- --requirement "..." --type ui|api`.
   Р”РµР»Р°РµС‚ draft `.spec.ts` РІ `tests/_generated/`, РёСЃРїРѕР»СЊР·СѓСЏ POMС‹ РїСЂРѕРµРєС‚Р° Рё
   РїСЂРёРјРµСЂ СЃРїРµРєР° РєР°Рє РєРѕРЅС‚РµРєСЃС‚. **РќРёРєРѕРіРґР° РЅРµ РєРѕРјРјРёС‚РёС‚ СЃР°Рј.**
2. **Failure Analyzer** вЂ” `npm run ai:analyze -- --trace path/to/test-results/<folder>`.
   РћС‚РїСЂР°РІР»СЏРµС‚ РІ Claude `error-context.md` + СЃРєСЂРёРЅС€РѕС‚ РїР°РґРµРЅРёСЏ, РІРѕР·РІСЂР°С‰Р°РµС‚
   РєРѕСЂРѕС‚РєРёР№ markdown СЃ РіРёРїРѕС‚РµР·РѕР№ Рё С€Р°РіР°РјРё. Р‘РµР· РєР»СЋС‡Р° вЂ” РїРµС‡Р°С‚Р°РµС‚ СЃС‚СЂСѓРєС‚СѓСЂРёСЂРѕРІР°РЅРЅС‹Р№
   Р»РѕРєР°Р»СЊРЅС‹Р№ РґР°РјРї.
3. **Data Generator** вЂ” `aiDataGenerator.generate('booking', { context, count })`.
   РџСЂРѕРіСЂР°РјРјРЅС‹Р№. РљРµС€РёСЂСѓРµС‚ РїРѕ sha1 РЅР° РґРёСЃРєРµ. РџСЂРё РІС‹РєР»СЋС‡РµРЅРЅРѕРј AI РёР»Рё Р»СЋР±РѕР№
   РѕС€РёР±РєРµ вЂ” fallback РЅР° faker, С‚РµСЃС‚С‹ РѕС‚ СЌС‚РѕРіРѕ РЅРµ РїР°РґР°СЋС‚.

РџРѕРґСЂРѕР±РЅРѕСЃС‚Рё, РїСЂРѕРјРїС‚С‹ Рё РїСЂРёРјРµСЂРЅР°СЏ СЃС‚РѕРёРјРѕСЃС‚СЊ вЂ” **[docs/ai-features.md](docs/ai-features.md)**.

> AI С‚СѓС‚ РїРѕРјРѕС‰РЅРёРє, Р° РЅРµ QA. РЎРіРµРЅРµСЂРёСЂРѕРІР°РЅРЅС‹Рµ С‚РµСЃС‚С‹ РЅСѓР¶РЅРѕ РІС‹С‡РёС‚Р°С‚СЊ,
> Р°РЅР°Р»РёР· РїР°РґРµРЅРёР№ вЂ” СЌС‚Рѕ РіРёРїРѕС‚РµР·Р°. Р¦РµР»СЊ вЂ” СЃРєРёРЅСѓС‚СЊ СЃРєСѓС‡РЅРѕРµ, Р° РЅРµ Р°СѓС‚СЃРѕСЂСЃРёС‚СЊ
> СЃСѓР¶РґРµРЅРёРµ.

### CI/CD

РўСЂРё РІРѕСЂРєС„Р»РѕСѓ РІ `.github/workflows/`:

- `tests.yml` вЂ” lint + typecheck в†’ smoke (chromium) в†’ regression matrix
  (chromium / firefox / webkit / api). РќР° РєР°Р¶РґС‹Р№ PR Рё push РІ `main`.
- `nightly.yml` вЂ” РїРѕР»РЅС‹Р№ matrix РІРєР»СЋС‡Р°СЏ mobile, РїРѕ РєСЂРѕРЅСѓ 02:00 UTC.
- `publish-allure.yml` вЂ” Р·Р°Р±РёСЂР°РµС‚ Р°СЂС‚РµС„Р°РєС‚С‹ РґРІСѓС… РІС‹С€Рµ РїРѕСЃР»Рµ `main`, СЃРѕР±РёСЂР°РµС‚
  РѕС‚С‡С‘С‚, РґРµРїР»РѕРёС‚ РЅР° `gh-pages`.

РџРѕР»РЅС‹Р№ РїРѕС‚РѕРє + РѕРґРЅРѕСЂР°Р·РѕРІР°СЏ РЅР°СЃС‚СЂРѕР№РєР° GH Pages вЂ” **[docs/ci-cd.md](docs/ci-cd.md)**.

### РћС‚С‡С‘С‚С‹

- **Allure** (РѕСЃРЅРѕРІРЅРѕР№) вЂ” РґРµРїР»РѕРёС‚СЃСЏ РЅР° GitHub Pages РІРѕСЂРєС„Р»РѕСѓ `publish-allure.yml`.
  Р›РѕРєР°Р»СЊРЅРѕ РїРѕСЃР»Рµ РїСЂРѕРіРѕРЅР° (`npm test`) С‚РѕР¶Рµ РјРѕР¶РЅРѕ: `npm run allure:serve`
  (РЅСѓР¶РµРЅ Java 17+).
- **Playwright HTML report** вЂ” РІСЃРµРіРґР° РїРёС€РµС‚СЃСЏ РІ `playwright-report/` РїРѕСЃР»Рµ
  РїСЂРѕРіРѕРЅР°. `npm run report` РµРіРѕ РѕС‚РєСЂС‹РІР°РµС‚.
- **JUnit XML** вЂ” РїРёС€РµС‚СЃСЏ РІ CI РґР»СЏ РІСЃРµРіРѕ, С‡С‚Рѕ РµРіРѕ Р¶РґС‘С‚.
- **Performance JSONL** вЂ” `performance-results/<date>.jsonl`. Р’РёР·СѓР°Р»РёР·Р°С†РёРё
  РїРѕРєР° РЅРµС‚ (СЃРј. wishlist РЅРёР¶Рµ).

### Roadmap вЂ” С‡С‚Рѕ Р±С‹Р»Рѕ РїРѕ РЅРµРґРµР»СЏРј

Р­С‚Рѕ РїСЂРёРјРµСЂРЅРѕ РІ С‚РѕРј РїРѕСЂСЏРґРєРµ, РІ РєРѕС‚РѕСЂРѕРј СЏ СЂРµР°Р»СЊРЅРѕ СЌС‚Рѕ РїРёСЃР°Р», Р° РЅРµ РјР°СЂРєРµС‚РёРЅРіРѕРІС‹Р№
РїРёС‚С‡. Р§РµРєРё РѕСЃС‚Р°Р»РёСЃСЊ: Сѓ Р±РѕР»СЊС€РёРЅСЃС‚РІР° С„Р°Р· РµСЃС‚СЊ Р·Р°РїРёСЃСЊ РІ CHANGELOG Рё СЃРµСЂРёСЏ
РєРѕРјРјРёС‚РѕРІ.

- **РќРµРґРµР»СЏ 1** вЂ” РёРЅРёС†РёР°Р»РёР·Р°С†РёСЏ: РєРѕРЅС„РёРіРё, Husky, Р±Р°Р·РѕРІС‹Рµ POMС‹, РІР°Р»РёРґР°С†РёСЏ env,
  РїРµСЂРІС‹Рµ smoke. РџРѕР»РґРЅСЏ РїРµСЂРµРґРµР»С‹РІР°Р» env-Р·Р°РіСЂСѓР·С‡РёРє РїРѕСЃР»Рµ С‚РѕРіРѕ, РєР°Рє РїРµСЂРІС‹Р№ СЂР°Р·
  СѓРїР°Р» РІ CI Р±РµР· РїРѕРЅСЏС‚РЅРѕРіРѕ СЃРѕРѕР±С‰РµРЅРёСЏ.
- **РќРµРґРµР»СЏ 2** вЂ” РѕСЃРЅРѕРІРЅРѕР№ regression: РїРѕР»РЅС‹Р№ С„Р»РѕСѓ Р±СЂРѕРЅРёСЂРѕРІР°РЅРёСЏ, Р°РґРјРёРЅ-С‚РµСЃС‚С‹,
  РІРµСЃСЊ СЃР»РѕР№ API-РєР»РёРµРЅС‚РѕРІ Рё С‚РёРїРѕРІ. Р’С‹РЅРµСЃ `BookingFormComponent`, РєРѕРіРґР° С‚РѕС‚ Р¶Рµ
  РЅР°Р±РѕСЂ РїРѕР»РµР№ РїРѕРІС‚РѕСЂРёР»СЃСЏ РІ РґРІСѓС… РјРµСЃС‚Р°С…. Worker-scoped `adminToken` СЂРѕРґРёР»СЃСЏ
  Р·РґРµСЃСЊ Р¶Рµ вЂ” С‡С‚РѕР±С‹ РЅРµ Р»СѓРїРёС‚СЊ `/auth/login` РёР· РєР°Р¶РґРѕРіРѕ С‚РµСЃС‚Р°.
- **РќРµРґРµР»СЏ 3** вЂ” РєР°С‡РµСЃС‚РІРѕ: AJV-СЃС…РµРјС‹ Рё РјР°С‚С‡РµСЂ `toMatchSchema`, negative,
  perf, visual. Р”РѕР»СЊС€Рµ, С‡РµРј С…РѕС‡РµС‚СЃСЏ РїСЂРёР·РЅР°РІР°С‚СЊ, СЂР°Р·Р±РёСЂР°Р»СЃСЏ СЃ СЂРѕСѓС‚РёРЅРіРѕРј
  РїСЂРѕРµРєС‚РѕРІ Playwright, С‡С‚РѕР±С‹ РЅСѓР¶РЅС‹Рµ С‚РµСЃС‚С‹ РїРѕРїР°Р»Рё РІ РЅСѓР¶РЅС‹Р№ РєСѓСЃРѕРє РјР°С‚СЂРёС†С‹.
  РџРѕС‚РѕРј СЃР°Рј CI: PR-РїР°Р№РїР»Р°Р№РЅ, РЅРѕС‡РЅРѕР№, Allure РЅР° GH Pages.
- **РќРµРґРµР»СЏ 4** вЂ” С‚СЂРё С…РµР»РїРµСЂР° С‡РµСЂРµР· Anthropic (test generator, failure
  analyzer, data generator), Dockerfile, РґРѕРєСѓРјРµРЅС‚Р°С†РёСЏ (РєРѕС‚РѕСЂСѓСЋ С‚С‹ С‡РёС‚Р°РµС€СЊ).
  РџР»СЋСЃ re-read РІСЃРµС… С„Р°Р№Р»РѕРІ СЃ РїРѕРёСЃРєРѕРј В«СЃР»РёС€РєРѕРј РІС‹Р»РёР·Р°РЅРЅС‹С…В» РјРµСЃС‚.

### Р§С‚Рѕ СѓР·РЅР°Р» РїРѕ РґРѕСЂРѕРіРµ

РўРѕ, С‡С‚Рѕ СЏ Р±С‹ Р·Р°РїРёСЃР°Р» РІ С€РїР°СЂРіР°Р»РєСѓ В«РїСЂРµР¶РґРµ С‡РµРј РЅР°С‡РЅС‘С€СЊВ» РґР»СЏ РїСЂРѕС€Р»РѕРіРѕ СЃРµР±СЏ:

- **AJV РІ `strict: true` СЂСѓРіР°РµС‚СЃСЏ РЅР° `$schema` РІ С„Р°Р№Р»Рµ СЃС…РµРјС‹.** РњРёРЅСѓС‚
  РїСЏС‚РЅР°РґС†Р°С‚СЊ РІС‚С‹РєР°Р», РїРѕС‚РѕРј РїРµСЂРµРєР»СЋС‡РёР» РЅР° `strict: false`. РўСЂРµР№Рґ-РѕС„С„ вЂ”
  РјРµРЅСЊС€Рµ РІР°Р»РёРґР°С†РёРё СЃР°РјРёС… СЃС…РµРј, РґР»СЏ С‚РµСЃС‚РѕРІ С‚РµСЂРїРёРјРѕ.
- **`actions/download-artifact` РЅРµ РІРёРґРёС‚ С‡СѓР¶РёРµ runs.** РЇ РїСЂРµРґРїРѕР»Р°РіР°Р», С‡С‚Рѕ
  РІРёРґРёС‚, Рё СЃРѕР±СЂР°Р» Allure-РїР°Р№РїР»Р°Р№РЅ РїРѕРґ СЌС‚Рѕ. РџРµСЂРµРґРµР»Р°Р» РЅР°
  `dawidd6/action-download-artifact`. Р Р°Р·РґСЂР°Р¶Р°РµС‚, РЅРѕ СЂР°Р±РѕС‚Р°РµС‚.
- **РќРµ РїРёС€Рё С‚РѕР»СЃС‚С‹Р№ `BasePage`.** РџРµСЂРІС‹Р№ РїРѕСЂС‹РІ Р±С‹Р» РЅР°Р±РёС‚СЊ С‚СѓРґР° С…РµР»РїРµСЂС‹
  В«РЅР° РІСЃСЏРєРёР№ СЃР»СѓС‡Р°Р№В». Р§РµСЂРµР· С‚СЂРё РґРЅСЏ РїРѕР»РѕРІРёРЅР° Р±С‹Р»Р° РЅРµ РЅСѓР¶РЅР°, РѕСЃС‚Р°Р»СЊРЅР°СЏ
  Р»СѓС‡С€Рµ Р¶РёР»Р° РєР°Рє РјРµС‚РѕРґС‹ РєРѕРЅРєСЂРµС‚РЅС‹С… СЃС‚СЂР°РЅРёС†.
- **Р’С‹РЅРѕСЃ РєРѕРјРїРѕРЅРµРЅС‚РѕРІ вЂ” СЂРµР°РєС†РёСЏ РЅР° Р±РѕР»СЊ, Р° РЅРµ РїР»Р°РЅ.** `BookingFormComponent`
  РІС‹РґРµР»РёР», С‚РѕР»СЊРєРѕ РєРѕРіРґР° РїРѕР»СЏ РіРѕСЃС‚СЏ СЂРµР°Р»СЊРЅРѕ РїРѕСЏРІРёР»РёСЃСЊ РІ РґРІСѓС… РјРµСЃС‚Р°С…. Р”РµРЅСЊ
  РїРµСЂРІС‹Р№ СЌС‚Рѕ Р±С‹Р»Рѕ Р±С‹ СЃРїРµРєСѓР»СЏС‚РёРІРЅРѕ.
- **Visual baselines OS-СЃРїРµС†РёС„РёС‡РЅС‹.** CI РіРµРЅРµСЂРёС‚ РЅР° Linux, РїРѕРїС‹С‚РєР°
  РїРµСЂРµРёСЃРїРѕР»СЊР·РѕРІР°С‚СЊ РЅР° Windows Р»РѕРјР°РµС‚СЃСЏ РєСЂР°СЃРѕС‡РЅРѕ. Р РµС€РµРЅРёРµ вЂ” РІСЃРµРіРґР° РіРµРЅРµСЂРёС‚СЊ
  РёР· CI РёР»Рё РїСЂРёР±РёС‚СЊ Docker-СЃР±РѕСЂРєРѕР№.
- **`allure-commandline` С‚СЏР¶С‘Р»С‹Р№.** РўСЏРЅРµС‚ Р·Р° СЃРѕР±РѕР№ JRE-РѕР±С‘СЂС‚РєСѓ. РЎРѕР·РЅР°С‚РµР»СЊРЅРѕ
  РќР• РїРѕР»РѕР¶РёР» РІ devDeps вЂ” `npx allure-commandline@version` РІ СЃРєСЂРёРїС‚Рµ РґР°С‘С‚
  Р»С‘РіРєСѓСЋ Р»РѕРєР°Р»СЊРЅСѓСЋ СѓСЃС‚Р°РЅРѕРІРєСѓ.
- **РЎРїР°Рј С‚РѕРєРµРЅР°РјРё.** РџРµСЂРІР°СЏ РІРµСЂСЃРёСЏ AI data generator С…РѕРґРёР»Р° РІ `/v1/messages`
  РЅР° РєР°Р¶РґС‹Р№ РІС‹Р·РѕРІ. РљРµС€ РїРѕ С…РµС€Сѓ вЂ” СЃС‚РѕРёРјРѕСЃС‚СЊ СѓРїР°Р»Р° РїСЂР°РєС‚РёС‡РµСЃРєРё РґРѕ РЅСѓР»СЏ.

### Р§С‚Рѕ СѓР»СѓС‡С€РёР» Р±С‹

Р§РµСЃС‚РЅС‹Р№ Р±СЌРєР»РѕРі, РіСЂСѓР±Рѕ РїРѕ РїСЂРёРѕСЂРёС‚РµС‚Сѓ:

- `storageState` РґР»СЏ Р°РґРјРёРЅ-СЃРµСЃСЃРёР№ вЂ” СЃСЌРєРѕРЅРѕРјРёС‚ СЃРµРєСѓРЅРґСѓ РЅР° РєР°Р¶РґС‹Р№ Р°РґРјРёРЅ-С‚РµСЃС‚.
- Telegram РёР»Рё Slack-РЅРѕС‚РёС„РёРєР°С†РёРё РЅР° РїР°РґРµРЅРёСЏ nightly (Р·Р°РіРѕС‚РѕРІРєР° Р·Р°РєРѕРјРјРµРЅС‡РµРЅР°
  РІ `nightly.yml`).
- РњР°Р»РµРЅСЊРєРёР№ dashboard РёР· `performance-results/*.jsonl` вЂ” РґР°Р¶Рµ СЃС‚Р°С‚РёРєР° РЅР°
  Chart.js РїРѕРєР°С‚РёС‚.
- РџРµСЂРµР№С‚Рё РЅР° ESLint v9 flat config.
- РџРёР»РѕС‚ mutation testing С‡РµСЂРµР· Stryker РЅР° API-РєР»РёРµРЅС‚Р°С….
- Р РµР°Р»СЊРЅС‹Р№ РїР°СЂСЃРёРЅРі `trace.zip` РІ failure analyzer (СЃРµР№С‡Р°СЃ СЂР°Р±РѕС‚Р°РµС‚ РїРѕ
  РїР°РїРєРµ, РІ РєРѕС‚РѕСЂСѓСЋ Playwright СѓР¶Рµ СЂР°СЃРїР°РєРѕРІР°Р» Р°СЂС‚РµС„Р°РєС‚С‹).

### РљРѕРЅС‚Р°РєС‚С‹

Р—Р°РјРµС‚РёР» С‡С‚Рѕ-С‚Рѕ СЃС‚СЂР°РЅРЅРѕРµ РёР»Рё С…РѕС‡РµС‚СЃСЏ РїРѕРѕР±СЃСѓР¶РґР°С‚СЊ QA-РёРЅСЃС‚СЂСѓРјРµРЅС‚С‹:

- вњ‰пёЏ <oleksandr@example.com> *(РїРѕРґСЃС‚Р°РІРёС‚СЊ РЅР°СЃС‚РѕСЏС‰РёР№)*
- рџ’ј [linkedin.com/in/USER](https://www.linkedin.com/in/USER) *(РїРѕРґСЃС‚Р°РІРёС‚СЊ)*
- рџ’¬ Telegram: `@USER` *(РїРѕРґСЃС‚Р°РІРёС‚СЊ)*

Р›РёС†РµРЅР·РёСЏ: [MIT](LICENSE).

---

## Project status

| Phase                                       | Done |
| ------------------------------------------- | ---- |
| 1. Init project, configs, husky             | вњ…   |
| 2. Base POM + fixtures + env                | вњ…   |
| 3. Smoke + РїРµСЂРІР°СЏ С‡Р°СЃС‚СЊ regression          | вњ…   |
| 4. Negative / perf / visual / contracts     | вњ…   |
| 5. CI/CD + Docker + Allure                  | вњ…   |
| 6. AI helpers                               | вњ…   |
| 7. Docs, diagram, screenshots               | вњ…   |
| 8. Realistic git history                    | вњ…   |
