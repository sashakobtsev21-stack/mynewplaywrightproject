# Restful-Booker Platform — AI-assisted test automation

[![tests](https://github.com/sashakobtsev21-stack/mynewplaywrightproject/actions/workflows/tests.yml/badge.svg)](https://github.com/sashakobtsev21-stack/mynewplaywrightproject/actions/workflows/tests.yml)
[![Allure Report](https://img.shields.io/badge/Allure-Report-orange.svg)](https://sashakobtsev21-stack.github.io/mynewplaywrightproject/)
[![Anthropic API](https://img.shields.io/badge/Anthropic-Claude-d97757.svg)](https://docs.anthropic.com/)
[![Node](https://img.shields.io/badge/Node-22%20LTS-339933.svg?logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> A portfolio project. There's an AI layer — prompts kept as versioned files,
> schema-validated outputs, retries, an eval suite, and per-call cost/latency
> traces — built on top of a working Playwright + TypeScript test suite against
> [Restful-Booker Platform](https://automationintesting.online). The tests are
> the practical use case; how the AI parts are engineered is the point.

[![One-page engineering report](docs/images/report-preview.png)](https://htmlpreview.github.io/?https://github.com/sashakobtsev21-stack/mynewplaywrightproject/blob/main/docs/report.html)

[English](#english) · [Русская версия](#русская-версия)

---

## English

### What this project demonstrates

If you're hiring for AI engineering, these are the parts worth a look — or skim the
**[one-page engineering report](https://htmlpreview.github.io/?https://github.com/sashakobtsev21-stack/mynewplaywrightproject/blob/main/docs/report.html)**:

- **Prompts as code** — every prompt is a versioned markdown file with a declared
  input/output contract, loaded and templated through one small loader.
  See [src/ai/prompts/](src/ai/prompts/) and [prompt-loader.ts](src/ai/prompt-loader.ts).
- **Structured outputs** — model replies are validated with zod, with a strict
  schema, a looser fallback, and recovery for JSON truncated at `max_tokens`.
  See [structured.ts](src/ai/structured.ts) and [schemas.ts](src/ai/schemas.ts).
- **Retrieval grounding (RAG)** — the test generator grounds each draft in the
  existing specs most similar to the requirement, ranked by BM25 over the spec
  corpus (lexical retrieval, no vector DB) — swap in embeddings behind the same
  function. See [retrieval/](src/ai/retrieval/).
- **Reliability** — one entry point for every call with exponential backoff +
  jitter, retrying only on rate limits, 5xx, and transient connection errors.
  See [anthropic-client.ts](src/ai/anthropic-client.ts).
- **Agentic tool-use** — the failure analyzer also runs as a tool-use loop: given
  read/list/grep/screenshot tools (sandboxed to the repo), the model investigates
  the failure itself instead of being handed pre-collected context.
  See [agentic-analyzer.ts](src/ai/agentic-analyzer.ts).
- **Provider-agnostic** — the text helpers go through a small `LLMProvider`
  interface, so the vendor is a config switch (`LLM_PROVIDER`): Anthropic, or any
  OpenAI-compatible endpoint (OpenAI, a local Ollama / LM Studio). Traces and cost
  stay unified across providers. See [providers/](src/ai/providers/).
- **Observability** — each call writes a JSONL trace (latency, tokens, cost,
  prompt name/version, provider, success/error), and can also ship each call as an
  **OpenTelemetry** span over OTLP/HTTP to any collector (Jaeger, Tempo, Honeycomb),
  behind a flag. See [observability.ts](src/ai/observability.ts) and [exporters/](src/ai/exporters/).
- **Cost awareness** — token-based cost per call, a per-developer budget, and
  `npm run ai:budget` to total spend from the trace log. See [budget.ts](src/ai/budget.ts).
- **Safety** — untrusted inputs (a free-text requirement, a failed test's
  error-context + screenshot) are fenced as data with an injection heuristic, and
  secrets/PII are redacted before anything is written to a trace.
  See [redaction.ts](src/ai/redaction.ts).
- **Evals** — a small suite that scores each helper (does the spec type-check, is
  the data schema-valid and diverse, does the analysis name a root cause), with an
  **LLM-as-judge** for analysis quality and a **release gate** that fails CI when
  the bar isn't cleared. Runs offline against fixtures. See [evals/](evals/).
- **A clear position on AI in QA** — where it helps and where it quietly hurts.
  See [below](#where-ai-helps-qa-and-where-it-doesnt).

### Why this project?

I wanted a single repo I could point a hiring manager at and say "this is how I
work" — not a curated list of disconnected snippets. It started as a QA
automation suite; the AI layer is where I've taken it since moving toward AI
engineering. The goals:

- engineer an AI layer I'd be comfortable putting in front of real traffic:
  validated outputs, retries, traces, costs, and evals — not just `await
client.messages.create`;
- prove I can ship a working test pyramid against a real (if toy) app, end to end;
- show modern Playwright, not just the "open browser, click button" subset;
- write code I'd be happy to inherit on day one of a new job.

Restful-Booker Platform is a convenient system under test: it has a public demo
(`https://automationintesting.online`) and a local Docker setup, a documented
REST API, and isn't so big you spend the first week on the domain.

### The AI layer — design & decisions

Three helpers make up the layer — the two text helpers run through a configurable
provider (see _Provider-agnostic_ above), the analyzer is Anthropic + multimodal:

1. **Test generator** — a plain-English requirement in, a `.spec.ts` draft out,
   grounded in the project's Page Objects and the existing specs most similar to
   the requirement (BM25 retrieval).
2. **Failure analyzer** — a failed test's `error-context.md` plus the screenshot
   in (multimodal), a root-cause hypothesis and next steps out.
3. **Data generator** — typed, schema-validated test records, with an sha1 disk
   cache and a faker fallback so tests never break because of it.

What makes the layer worth reading, and why:

- **Prompts live outside the code.** Each is `<name>.v<N>.md` with frontmatter
  (version, inputs, output contract). The loader enforces the contract and does a
  single-pass substitution, so user content containing `{{...}}` can't smuggle in
  a placeholder.
- **Nothing unvalidated reaches a test.** Generated data is parsed, then checked
  against a strict zod schema; on a near miss it falls back to a looser schema
  (one odd phone number shouldn't drop the whole batch to faker); a truncated
  array is trimmed to its last complete element and re-closed.
- **One call path.** `callClaude()` applies the default model, retries with
  backoff, and writes a trace. Reliability and observability are in one place
  instead of copy-pasted across three modules.
- **Spend is measurable.** Every trace carries token counts and a computed
  `cost_usd`; `npm run ai:budget` totals it and warns past a threshold.
- **Quality is measured, not asserted.** The eval suite turns "seems to work"
  into numbers — see below.

Full write-up: **[docs/ai-layer-design.md](docs/ai-layer-design.md)**. Usage,
prompts, and costs: **[docs/ai-features.md](docs/ai-features.md)**.

### Built with an agent team

This repo is developed with a small, curated team of Claude Code subagents in
[.claude/agents/](.claude/agents/): a prompt-engineer, a TypeScript specialist, a
Playwright QA engineer, a code reviewer, an AI-safety specialist (prompt-injection
& PII), a cost analyst, and security / dependency auditors. They're a
project-specific subset of my agent library
([my_agents](https://github.com/sashakobtsev21-stack/my_agents), built on the
MIT-licensed [claude-flow](https://github.com/ruvnet/claude-flow)) — each one
retargeted at this codebase, with the framework's swarm/MCP coupling stripped out.
Running a multi-agent workflow, and engineering the agent definitions themselves,
is part of the AI-engineering story here.

### Quick demo

No key needed for the first two — they run on fixtures / faker:

```bash
npm ci
npm run eval:ai      # scores the AI helpers offline (fixtures), prints a table
npm run test:unit    # node-only unit tests for the AI layer
```

The offline run is a deterministic CI gate — `GATE: PASS`, or the build fails:

![AI evals — offline release gate](docs/images/eval-gate.png)

With a key, the helpers do real work:

```bash
echo "ANTHROPIC_API_KEY=sk-ant-..." >> .env
npm run ai:generate-test -- --requirement "User can cancel a booking" --type ui
npm run ai:budget    # what the calls above cost
```

### Where AI helps QA, and where it doesn't

A lot of QA is mechanical: drafting a new spec from a known pattern, staring at a
stack trace at 23:00, inventing plausible test data. Claude is good at those, and
that's what the three helpers automate.

It's bad at the things that actually matter for quality:

- **Generated tests carry false confidence.** They reproduce patterns they've
  seen, so they test the happy path you already thought of — and quietly skip the
  edge cases that catch real bugs. The generator marks guessed selectors and never
  auto-commits, because the draft needs a human before it's a test.
- **Failure analysis is a hypothesis, not a verdict.** It's a fast first read of a
  trace, sometimes confidently wrong. The eval suite scores it with heuristics and
  a manual 1-5 rubric exactly because "sounds right" isn't "is right".
- **Realistic data isn't representative data.** Faker and an LLM both make
  plausible rows; neither knows which inputs your system actually mishandles.

So: AI to skip the boring parts, a human to own quality. The layer is built to
make that split explicit — validation, traces, and evals are there so you can
trust output as far as it's earned, and no further.

### Tech stack — and why

| Tool                        | Why                                                                                                                                                                 |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Playwright + TypeScript** | Best multi-browser support out of the box, first-class API testing via `APIRequestContext`, real trace viewer, types help a lot when refactoring.                   |
| **@anthropic-ai/sdk**       | The AI layer. Messages API, multimodal input for the failure analyzer, our own retry/trace wrapper on top.                                                          |
| **Zod**                     | Validates the env file on load, and every record the data generator returns. Bad input dies with a useful message instead of `undefined.toLowerCase()` deep inside. |
| **Page Object Model**       | Every project I've seen that started with "let's just use helpers" ended up with a 2000-line `utils.ts`. POM forces a per-page boundary.                            |
| **Faker**                   | Random but reproducible-enough data, and the fallback when AI is off.                                                                                               |
| **AJV**                     | The de-facto JSON Schema validator for Node. Wrapped in a tiny `toMatchSchema` matcher so contract tests read naturally.                                            |
| **Pino**                    | Pretty locally, JSON in CI, fast. Worth more than `console.log`.                                                                                                    |
| **Allure**                  | Recruiters and team leads read screenshots, not stack traces. Allure puts both in one place.                                                                        |
| **Husky + commitlint**      | Saves me from `wip` commits accidentally landing on `main`. (Mostly.)                                                                                               |
| **Docker**                  | Reproducibility for whoever clones the repo without the right Chrome version.                                                                                       |

### Architecture

Tests import a custom `test` fixture, which wires in Page Objects and API
clients. Schemas, factories, and the logger are utilities used across both sides.
The AI layer is independent — the suite runs whether or not it's configured.

```
tests/  ──►  src/fixtures/playwright-fixtures.ts  ──►  src/pages/  + src/api/clients/
                                                  └─►  src/utils/ + src/config/

src/ai/  ──►  prompt-loader + prompts/  ──►  callClaude (retry + trace)  ──►  Anthropic
         └─►  structured + schemas (zod)      observability + budget       evals/
```

Full diagram and per-layer notes in **[docs/architecture.md](docs/architecture.md)**.

### The test suite (the practical use case)

Roughly 214 tests (a few `test.fixme`/`test.skip` — see CHANGELOG for why),
organised by purpose so the CI matrix maps cleanly onto folders, plus a node-only
`unit` project for the AI helpers. Counts below are deduped logical tests
(`npx playwright test --list`), not browser-multiplied.

| Folder                  | What it does                                                                                                                                                                          | Count |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| `tests/smoke/`          | Quick sanity on home, admin login, API health. Runs on every PR before regression.                                                                                                    | 8     |
| `tests/regression/ui/`  | Booking flow, contact form, admin login, navigation, admin rooms/messages/branding.                                                                                                   | 21    |
| `tests/regression/api/` | Auth + booking CRUD/filtering, room admin CRUD, messages, report, branding, sessions.                                                                                                 | 33    |
| `tests/negative/`       | Bad payloads, missing fields, auth gates, overlap/unknown-id, XSS sanity, unicode, etc.                                                                                               | 26    |
| `tests/performance/`    | Navigation timings, FCP, LCP, API response time. Results dumped to JSONL.                                                                                                             | 4     |
| `tests/visual/`         | Pixel snapshots of home, admin, and forms. Dynamic regions are masked.                                                                                                                | 7     |
| `tests/api/contracts/`  | AJV-validated auth / room / booking / message / report / branding responses.                                                                                                          | 12    |
| `tests/unit/`           | Pure unit tests for the AI layer (loader, schemas, parsing, retry, cost, redaction, agentic loop, providers, eval gate + judge, OTLP + Langfuse export, BM25 + embeddings retrieval). | 103   |

### Quick start

#### Prerequisites

- Node 22 LTS
- (Optional) `ANTHROPIC_API_KEY` for the AI helpers
- (Optional) Docker, for containerised runs
- (Optional) Java 17+, only for generating Allure reports locally

#### Install + first run

```bash
npm ci
npx playwright install --with-deps
cp .env.example .env
npm run test:smoke
```

The `.env.example` defaults already point at the public demo with its known admin
creds (`admin` / `password`), so there are no secrets to find. The AI key is
optional — leave it blank and the helpers degrade to faker / local output.

#### Switching environments

`TEST_ENV` decides which `.env.<env>` file is layered on top of `.env`:

```bash
TEST_ENV=public npm test    # default — hits automationintesting.online
TEST_ENV=local  npm test    # hits a locally-running platform
```

For `TEST_ENV=local`, bring up the platform yourself — it's a multi-service
Spring app: [mwinteringham/restful-booker-platform](https://github.com/mwinteringham/restful-booker-platform).

#### Useful npm scripts

```bash
npm run test:smoke           # @smoke-tagged, fast
npm run test:ui              # regression UI on chromium
npm run test:api             # api project, no browser
npm run test:unit            # AI-layer unit tests, no browser
npm run test:negative        # negative API + UI
npm run test:contracts       # JSON Schema contract tests
npm run test:perf            # @perf-tagged, writes JSONL into performance-results/
npm run test:visual          # compare against baselines
npm run eval:ai              # score the AI helpers
npm run ai:budget            # total AI spend from the trace log
npm run lint                 # ESLint
npm run typecheck            # tsc --noEmit
```

#### Running with Docker

```bash
docker compose -f docker/docker-compose.yml run --rm tests           # full chromium suite
docker compose -f docker/docker-compose.yml run --rm tests npm run test:smoke
```

### CI/CD

Three workflows under `.github/workflows/`:

- `tests.yml` — lint + typecheck + unit → smoke (chromium) → regression matrix
  (chromium / firefox / webkit / api). Runs on every PR and push to `main`.
- `nightly.yml` — full project matrix incl. mobile, manual trigger (cron is
  commented out: the public demo is flaky at night and was generating noise).
- `publish-allure.yml` — picks up artifacts from the above on `main`, generates
  the report, deploys it to `gh-pages`.

Full flow + one-time repo setup for GitHub Pages: **[docs/ci-cd.md](docs/ci-cd.md)**.

### Reports

- **Allure** (the main one) — deployed to GitHub Pages by `publish-allure.yml`,
  refreshed after every successful `tests.yml` run on `main`. Locally:
  `npm run allure:serve` (needs Java 17+).
- **Playwright HTML report** — always written to `playwright-report/`. `npm run report` opens it.
- **JUnit XML** — emitted in CI for downstream tooling.
- **Performance JSONL** — `performance-results/<date>.jsonl`. Not visualised yet (on the wishlist).
- **AI traces** — `logs/ai-traces.jsonl` (git-ignored); `npm run ai:budget` reads it
  back. With `TRACE_EXPORT=otlp` each call is also shipped as an OpenTelemetry span.

### Roadmap — what happened each week

Roughly the order I actually built things, not a sales pitch. Most phases have a
CHANGELOG entry and matching commits.

- **Week 1** — project init: configs, Husky, base POMs, env validation, first
  smoke specs. Spent half a day re-doing the env loader after it first crashed in
  CI with no useful message.
- **Week 2** — main regression: full booking flow, admin tests, the API client +
  types layer. Extracted `BookingFormComponent` once the same fields appeared
  twice. Worker-scoped `adminToken` came in here.
- **Week 3** — quality bar: AJV schemas + `toMatchSchema`, negative, perf, visual.
  Then CI: tests pipeline, nightly, Allure on GH Pages.
- **Week 4** — first cut of the three Anthropic helpers, Dockerfile, docs.
- **Since** — the AI engineering pass: prompts moved to versioned files, zod
  validation + JSON recovery, a retry/trace/cost wrapper, an eval suite, and
  unit tests for the helpers.
- **Latest** — the adaptation pass (see the [report](docs/report.html) and the
  [plan](docs/ai-engineer-adaptation-plan.md)): prompt-injection + PII safety, a
  multi-provider `LLMProvider`, an agentic tool-use analyzer, an LLM-as-judge eval
  gate wired into CI, OpenTelemetry trace export, and BM25 retrieval grounding.
  This is the work the repo now leads with.

### Lessons learned

Things I'd put on a "before you start" note for past me:

- **AJV's `strict: true` hates `$schema` in your schema files.** Flipped to
  `strict: false`. Trade-off: less validation of the schemas themselves, fine for tests.
- **`actions/download-artifact` doesn't see other workflow runs.** Built the
  Allure pipeline assuming it did; switched to `dawidd6/action-download-artifact`.
- **Don't pre-build a fat `BasePage`.** Three days later half the "just in case"
  helpers were unused and the rest were better as page-specific methods.
- **Token spam is real.** The first data generator hit the API on every test
  call. Caching by hash dropped cost to basically zero — which is also why the
  AI layer now traces cost per call instead of guessing.
- **LLMs ignore "no code fences".** And occasionally stop mid-array at
  `max_tokens`. The structured parser tolerates both rather than trusting the model.
- **Visual baselines are OS-specific.** CI generates them on Linux; reusing on
  Windows fails spectacularly. Regenerate from CI or pin a Docker build.

### Future improvements

Honest backlog, rough priority order:

- A CI hook running the evals only on PRs that touch `src/ai/` (they currently run on every PR).
- `storageState` for admin UI sessions.
- Mini-dashboard from `performance-results/*.jsonl`.
- Real `trace.zip` parsing in the failure analyzer (currently uses the extracted folder).
- Migrate ESLint to v9 flat config.

### Contacts

Spotted something off, or want to talk shop:

- Email: sashakobtsev21@gmail.com

License: [MIT](LICENSE).

---

## Русская версия

### Что показывает этот проект

Если вы смотрите на позицию AI engineer — вот на что стоит взглянуть (или загляните в
**[одностраничный отчёт](https://htmlpreview.github.io/?https://github.com/sashakobtsev21-stack/mynewplaywrightproject/blob/main/docs/report.html)**):

- **Промпты как код** — каждый промпт это версионированный markdown-файл с
  объявленным контрактом вход/выход, через единый загрузчик.
  См. [src/ai/prompts/](src/ai/prompts/) и [prompt-loader.ts](src/ai/prompt-loader.ts).
- **Структурированные ответы** — вывод модели валидируется zod: строгая схема,
  более мягкий fallback и восстановление JSON, обрезанного на `max_tokens`.
  См. [structured.ts](src/ai/structured.ts) и [schemas.ts](src/ai/schemas.ts).
- **Грунтинг через retrieval (RAG)** — генератор тестов опирается на существующие
  спеки, наиболее похожие на требование, ранжируя их BM25 по корпусу спеков
  (лексический retrieval, без vector-DB) — эмбеддинги ставятся за той же функцией.
  См. [retrieval/](src/ai/retrieval/).
- **Надёжность** — единая точка вызова с экспоненциальным backoff + jitter, retry
  только на rate limit, 5xx и сетевых сбоях. См. [anthropic-client.ts](src/ai/anthropic-client.ts).
- **Агентный tool-use** — анализатор падений умеет работать как tool-use цикл: с
  инструментами read/list/grep/screenshot (в песочнице репозитория) модель сама
  исследует падение, а не получает заранее собранный контекст.
  См. [agentic-analyzer.ts](src/ai/agentic-analyzer.ts).
- **Провайдеро-независимость** — текстовые хелперы ходят через тонкий интерфейс
  `LLMProvider`, поэтому вендор — переключатель в конфиге (`LLM_PROVIDER`):
  Anthropic или любой OpenAI-совместимый эндпоинт (OpenAI, локальный Ollama / LM
  Studio). Трейсы и стоимость единые для всех провайдеров. См. [providers/](src/ai/providers/).
- **Наблюдаемость** — каждый вызов пишет JSONL-трейс (latency, токены, стоимость,
  имя/версия промпта, провайдер, success/error) и может слать каждый вызов как
  **OpenTelemetry**-спан по OTLP/HTTP в любой коллектор (Jaeger, Tempo, Honeycomb)
  за флагом. См. [observability.ts](src/ai/observability.ts) и [exporters/](src/ai/exporters/).
- **Контроль стоимости** — стоимость по токенам на вызов, бюджет на разработчика,
  `npm run ai:budget` суммирует траты из лога. См. [budget.ts](src/ai/budget.ts).
- **Безопасность** — недоверенные входы (текстовое требование, error-context +
  скриншот упавшего теста) ограждаются как данные с эвристикой инъекций, а
  секреты/PII редактируются до записи в трейс. См. [redaction.ts](src/ai/redaction.ts).
- **Evals** — набор, который оценивает каждый хелпер (компилируется ли спек, валидны
  и разнообразны ли данные, назван ли root cause), с **LLM-as-judge** для качества
  анализа и **гейтом релиза**, роняющим CI при непрохождении порога. Запускается
  офлайн на fixtures. См. [evals/](evals/).
- **Чёткая позиция про AI в QA** — где помогает, а где тихо вредит.
  См. [ниже](#где-ai-помогает-qa-а-где-нет).

### Зачем этот проект?

Хотел один репозиторий, на который можно показать рекрутёру или тимлиду и сказать
«вот так я работаю» — а не набор разрозненных сниппетов. Начиналось как QA-набор;
AI-слой — то, куда я его развил, переходя в AI engineering. Цели:

- собрать AI-слой, который не стыдно поставить под реальную нагрузку:
  валидация вывода, ретраи, трейсы, стоимость и evals — а не просто
  `await client.messages.create`;
- показать рабочую пирамиду тестов против реального (пусть и игрового) приложения;
- показать современный Playwright, а не «открой браузер — нажми кнопку»;
- написать код, который мне самому не было бы стыдно унаследовать.

Restful-Booker Platform удобен: есть публичное демо и локальная сборка в Docker,
задокументированный REST API, и он не настолько большой, чтобы первую неделю
тратить на предметную область.

### AI-слой — устройство и решения

Три хелпера составляют слой — текстовые два ходят через настраиваемый провайдер
(см. _Провайдеро-независимость_ выше), анализатор — Anthropic + мультимодальный:

1. **Генератор тестов** — требование текстом на входе, draft `.spec.ts` на выходе,
   с опорой на POMы проекта и наиболее похожие существующие спеки (BM25-retrieval).
2. **Анализатор падений** — `error-context.md` + скриншот упавшего теста
   (мультимодально) на входе, гипотеза о причине и шаги на выходе.
3. **Генератор данных** — типизированные, провалидированные записи, с sha1-кешем
   на диске и fallback на faker, чтобы тесты от него не падали.

Почему слой стоит читать:

- **Промпты вне кода.** Каждый — `<name>.v<N>.md` с frontmatter (версия, входы,
  контракт вывода). Загрузчик проверяет контракт и подставляет за один проход,
  поэтому пользовательский текст с `{{...}}` не протащит новый плейсхолдер.
- **Ничего невалидированного не доходит до теста.** Данные парсятся и проверяются
  строгой zod-схемой; при небольшом промахе — fallback на мягкую схему; обрезанный
  массив укорачивается до последнего полного элемента и закрывается.
- **Один путь вызова.** `callClaude()` подставляет модель, ретраит с backoff и
  пишет трейс — надёжность и наблюдаемость в одном месте, а не размазаны по трём
  модулям.
- **Траты измеримы.** В каждом трейсе токены и посчитанный `cost_usd`;
  `npm run ai:budget` суммирует и предупреждает при превышении порога.
- **Качество измеряется, а не декларируется.** Eval-набор переводит «вроде
  работает» в цифры.

Подробно: **[docs/ai-layer-design.md](docs/ai-layer-design.md)**. Использование,
промпты, стоимость: **[docs/ai-features.md](docs/ai-features.md)**.

### Собрано командой агентов

Проект разрабатывается небольшой кураторской командой Claude Code субагентов в
[.claude/agents/](.claude/agents/): prompt-engineer, специалист по TypeScript,
Playwright QA-инженер, ревьюер кода, AI-safety специалист (prompt-injection и PII),
cost-аналитик и аудиторы безопасности / зависимостей. Это
проектно-специфичная выборка из моей библиотеки агентов
([my_agents](https://github.com/sashakobtsev21-stack/my_agents) на базе
MIT-лицензированного [claude-flow](https://github.com/ruvnet/claude-flow)) — каждый
агент перенацелен на этот код, а swarm/MCP-привязка фреймворка убрана. Работа
мультиагентным процессом и инженерия самих определений агентов — часть
AI-engineering истории проекта.

### Быстрое демо

Для первых двух ключ не нужен — работают на fixtures / faker:

```bash
npm ci
npm run eval:ai      # офлайн-оценка хелперов (fixtures), таблица метрик
npm run test:unit    # node-only unit-тесты AI-слоя
```

С ключом хелперы делают реальную работу:

```bash
echo "ANTHROPIC_API_KEY=sk-ant-..." >> .env
npm run ai:generate-test -- --requirement "User can cancel a booking" --type ui
npm run ai:budget    # во что обошлись вызовы выше
```

### Где AI помогает QA, а где нет

Много в QA — механика: набросать спек по знакомому паттерну, втыкать в стектрейс
в 23:00, придумывать правдоподобные данные. Claude в этом хорош, это и
автоматизируют три хелпера.

И плох в том, что реально важно для качества:

- **Сгенерированные тесты дают ложную уверенность.** Они воспроизводят знакомые
  паттерны — проверяют happy path, который ты и так придумал, и тихо пропускают
  краевые случаи, где живут настоящие баги. Генератор помечает угаданные селекторы
  и никогда не коммитит сам: draft нужно вычитать.
- **Анализ падений — гипотеза, а не вердикт.** Быстрый первый разбор трейса,
  иногда уверенно неверный. Eval оценивает его эвристиками и ручной рубрикой 1-5
  именно потому, что «звучит верно» ≠ «верно».
- **Правдоподобные данные ≠ репрезентативные.** Ни faker, ни LLM не знают, на
  каких входах твоя система реально спотыкается.

Итого: AI — на скучное, человек — на качество. Слой построен так, чтобы это
разделение было явным.

### Стек — и почему

| Инструмент                  | Почему                                                                                                                                           |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Playwright + TypeScript** | Лучшая мультибраузерность из коробки, нативный API-тестинг через `APIRequestContext`, человеческий trace viewer, типы выручают при рефакторинге. |
| **@anthropic-ai/sdk**       | AI-слой. Messages API, мультимодальный вход для анализатора, своя обёртка retry/trace сверху.                                                    |
| **Zod**                     | Валидация env на старте и каждой записи от генератора данных. Плохой вход падает с понятным сообщением.                                          |
| **Page Object Model**       | Каждый проект, начинавшийся с «просто хелперы», заканчивался 2000-строчным `utils.ts`. POM навязывает границу.                                   |
| **Faker**                   | Случайные, но воспроизводимые данные, и fallback при выключенном AI.                                                                             |
| **AJV**                     | Ходовой JSON Schema валидатор под Node, завёрнут в `toMatchSchema`.                                                                              |
| **Pino**                    | Локально красиво, в CI JSON, быстрый.                                                                                                            |
| **Allure**                  | Скриншоты и стектрейсы в одном месте.                                                                                                            |
| **Husky + commitlint**      | Не даёт `wip` уехать в `main`. В основном.                                                                                                       |
| **Docker**                  | Воспроизводимость без нужной версии Chrome.                                                                                                      |

### Архитектура

Тесты импортируют кастомную фикстуру `test`, которая подсовывает Page Objects и
API-клиентов. AI-слой независим — набор работает и без него.

```
tests/  ──►  src/fixtures/playwright-fixtures.ts  ──►  src/pages/  + src/api/clients/
                                                  └─►  src/utils/ + src/config/

src/ai/  ──►  prompt-loader + prompts/  ──►  callClaude (retry + trace)  ──►  Anthropic
         └─►  structured + schemas (zod)      observability + budget       evals/
```

Полная диаграмма и описание слоёв — **[docs/architecture.md](docs/architecture.md)**.

### Тестовый набор (практический use-case)

~214 теста (несколько в `test.fixme`/`test.skip` — причины в CHANGELOG),
разложены по назначению, плюс node-only проект `unit` для AI-хелперов. Числа ниже —
дедуплицированные логические тесты (`npx playwright test --list`), без браузерного множителя.

| Папка                   | Что                                                                                                                                                                             | Кол-во |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `tests/smoke/`          | Базовая проверка главной, админ-логина, API health.                                                                                                                             | 8      |
| `tests/regression/ui/`  | Бронирование, форма связи, админ-логин, навигация, номера/сообщения/бренд.                                                                                                      | 21     |
| `tests/regression/api/` | Auth + booking CRUD/фильтрация, CRUD номеров, сообщения, отчёт, бренд.                                                                                                          | 33     |
| `tests/negative/`       | Невалидные payload, пропуски, auth-гейты, overlap/unknown-id, XSS, unicode.                                                                                                     | 26     |
| `tests/performance/`    | Тайминги навигации, FCP, LCP, время ответа API.                                                                                                                                 | 4      |
| `tests/visual/`         | Пиксельные снапшоты с масками на динамику.                                                                                                                                      | 7      |
| `tests/api/contracts/`  | AJV-валидация ответов по JSON Schema (auth/room/booking/message/report/бренд).                                                                                                  | 12     |
| `tests/unit/`           | Unit-тесты AI-слоя (загрузчик, схемы, парсинг, retry, стоимость, редакция, агентный цикл, провайдеры, eval-гейт + судья, OTLP + Langfuse экспорт, BM25 + embeddings retrieval). | 103    |

### Quick start

```bash
npm ci
npx playwright install --with-deps
cp .env.example .env
npm run test:smoke
```

Дефолты в `.env.example` уже смотрят на публичное демо со штатными кредами
(`admin` / `password`). AI-ключ опционален — без него хелперы деградируют на
faker / локальный вывод.

`TEST_ENV` переключает окружение (`public` по умолчанию / `local`). Полезные
скрипты — те же, что в английской секции выше (`test:*`, `eval:ai`, `ai:budget`).

### CI/CD

- `tests.yml` — lint + typecheck + unit → smoke (chromium) → regression matrix.
- `nightly.yml` — полный matrix включая mobile, ручной запуск (cron закомментирован).
- `publish-allure.yml` — собирает отчёт и деплоит на `gh-pages`.

Подробности — **[docs/ci-cd.md](docs/ci-cd.md)**.

### Что узнал по дороге

- **AJV `strict: true` ругается на `$schema` в файле схемы** — переключил на `strict: false`.
- **`actions/download-artifact` не видит чужие runs** — переделал на `dawidd6/action-download-artifact`.
- **Не пиши толстый `BasePage`** — половина «на всякий случай» оказалась не нужна.
- **Спам токенами реален** — кеш по хешу уронил стоимость почти до нуля; поэтому
  слой теперь и трейсит стоимость на вызов, а не гадает.
- **LLM игнорируют «без code fences»** и иногда обрываются на `max_tokens` —
  парсер терпит и то, и другое.
- **Visual baselines OS-специфичны** — генерить из CI или прибить Docker-сборкой.

### Контакты

- Email: sashakobtsev21@gmail.com

Лицензия: [MIT](LICENSE).
