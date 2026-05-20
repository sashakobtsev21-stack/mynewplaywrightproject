# Restful-Booker Platform — Test Automation

[![tests](https://github.com/sashakobtsev21-stack/mynewplaywrightproject/actions/workflows/tests.yml/badge.svg)](https://github.com/sashakobtsev21-stack/mynewplaywrightproject/actions/workflows/tests.yml)
[![nightly](https://github.com/sashakobtsev21-stack/mynewplaywrightproject/actions/workflows/nightly.yml/badge.svg)](https://github.com/sashakobtsev21-stack/mynewplaywrightproject/actions/workflows/nightly.yml)
[![Allure Report](https://img.shields.io/badge/Allure-Report-orange.svg)](https://sashakobtsev21-stack.github.io/mynewplaywrightproject/)
[![Node](https://img.shields.io/badge/Node-22%20LTS-339933.svg?logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> A personal portfolio project — UI + API + visual + contract tests against
> [Restful-Booker Platform](https://automationintesting.online) using Playwright + TypeScript.
> Built over four evenings-and-weekends weeks.

<!-- TODO: replace placeholder once first Allure report is live -->
<!-- ![Allure dashboard screenshot](docs/images/allure-dashboard.png) -->

[English](#english) · [Русская версия](#русская-версия)

---

## English

### Why this project?

I wanted a single repo that I could point a hiring manager at and say "this is
how I work" — not a curated list of disconnected snippets. The goals were:

- prove I can ship a working test pyramid against a real (if toy) app, end to end;
- show I know modern Playwright, not just the "open browser, click button" subset;
- play with a few AI helpers without pretending AI replaces a QA;
- write code I'd be happy to inherit on day one of a new job.

Restful-Booker Platform is convenient because it has both a public demo
(`https://automationintesting.online`) and a local Docker setup, exposes a
documented REST API, and isn't so big you spend the first week understanding
the domain.

### Tech stack — and why

| Tool | Why it |
| --- | --- |
| **Playwright + TypeScript** | Best multi-browser support out of the box, first-class API testing via `APIRequestContext`, real trace viewer, types help a lot when refactoring. |
| **Page Object Model** | Every project I've seen that started with "let's just use helpers" ended up with a 2000-line `utils.ts`. POM forces a per-page boundary. |
| **Faker** | Random but reproducible-enough data without writing boring fixture files. |
| **Zod** | Validating the env file the second it's loaded means tests die with a useful message instead of `undefined.toLowerCase()` deep inside. |
| **AJV** | The de-facto JSON Schema validator for Node. Wrapped in a tiny `toMatchSchema` matcher so contract tests read naturally. |
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
tests/  ──►  src/fixtures/playwright-fixtures.ts  ──►  src/pages/  + src/api/clients/
                                                  └─►  src/utils/ + src/config/
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
TEST_ENV=public npm test    # default — hits automationintesting.online
TEST_ENV=local  npm test    # hits a locally-running platform (see below)
```

For `TEST_ENV=local`, bring up the platform yourself — it's a multi-service
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

### AI features

Three optional helpers behind a single `ANTHROPIC_API_KEY` toggle. They work
in isolation — the rest of the suite is unaware.

1. **Test Generator** — `npm run ai:generate-test -- --requirement "..." --type ui|api`.
   Drafts a `.spec.ts` in `tests/_generated/` using the project's POMs and an
   example spec as context. Never auto-commits.
2. **Failure Analyzer** — `npm run ai:analyze -- --trace path/to/test-results/<folder>`.
   Sends `error-context.md` plus the failure screenshot to Claude, returns a
   short markdown analysis. Without an API key, prints a structured local dump.
3. **Data Generator** — `aiDataGenerator.generate('booking', { context, count })`.
   Programmatic. Caches by sha1 on disk. Falls back to faker when AI is off
   or anything goes wrong — tests never break because of it.

Detailed docs, prompts, and rough cost estimates: **[docs/ai-features.md](docs/ai-features.md)**.

> AI here is an assistant, not a QA. Generated specs need a human review,
> failure analyses are hypotheses. The point is to skip the boring bits, not
> to outsource judgement.

### CI/CD

Three workflows under `.github/workflows/`:

- `tests.yml` — lint + typecheck → smoke (chromium) → regression matrix
  (chromium / firefox / webkit / api). Runs on every PR and push to `main`.
- `nightly.yml` — full project matrix incl. mobile, on a 02:00 UTC cron.
- `publish-allure.yml` — picks up artifacts from the two above on `main`,
  generates the report, deploys it to `gh-pages`.

Full flow + one-time repo setup for GitHub Pages: **[docs/ci-cd.md](docs/ci-cd.md)**.

### Reports

- **Allure** (the main one) — deployed to GitHub Pages by `publish-allure.yml`.
  Once you've run the suite locally (`npm test`) you can also generate it on
  your machine: `npm run allure:serve` (needs Java 17+).
- **Playwright HTML report** — always written to `playwright-report/` after
  a run. `npm run report` opens it.
- **JUnit XML** — emitted in CI for whatever downstream tooling expects it.
- **Performance JSONL** — `performance-results/<date>.jsonl`. Not visualised
  yet (on the wishlist below).

### Roadmap — what happened each week

This is roughly the order I actually built things, not a sales pitch. I left
the receipts: most phases have a CHANGELOG entry and matching commits.

- **Week 1** — project init: configs, Husky, base POMs, env validation, first
  smoke specs. Spent half a day re-doing the env loader after the first time
  it crashed in CI with no useful message.
- **Week 2** — main regression: full booking flow, admin tests, all of the
  API client + types layer. Extracted `BookingFormComponent` once the same
  set of fields appeared in two places. Worker-scoped `adminToken` came in
  here to stop spamming `/auth/login`.
- **Week 3** — quality bar: AJV schemas + `toMatchSchema` matcher, negative
  tests, perf, visual. Spent more time than I'd like to admit on Playwright
  project routing rules so the right tests land in the right CI matrix slice.
  Then CI itself: tests pipeline, nightly, Allure on GH Pages.
- **Week 4** — three Anthropic helpers (test generator, failure analyzer,
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
  did NOT put it in devDeps — `npx allure-commandline@version` in the
  script keeps local installs slim.
- **Token spam.** First version of the AI data generator hit `/v1/messages`
  on every test call. Cache by hash → costs dropped to basically zero.

### Future improvements

Honest backlog, in rough priority order:

- `storageState` for admin UI sessions — would shave a second per admin test.
- Telegram or Slack notification for nightly failures (scaffolding's commented
  out in `nightly.yml`).
- Mini-dashboard from `performance-results/*.jsonl` — even a static HTML
  with Chart.js would do.
- Migrate ESLint to v9 flat config.
- Mutation testing pilot with Stryker on the API clients.
- Real `trace.zip` parsing in the failure analyzer (currently relies on the
  per-test folder Playwright already extracts to).

### Contacts

If you spotted something off, or just want to chat about QA tooling:

- Email: sashakobtsev21@gmail.com

License: [MIT](LICENSE).

---

## Русская версия

### Зачем этот проект?

Хотел сделать один репозиторий, на который можно показать рекрутеру или
тимлиду и сказать «вот так я работаю» — а не набор разрозненных сниппетов.
Цели были такие:

- продемонстрировать, что я умею собрать рабочую пирамиду тестов против
  реального (пусть и игрового) приложения от и до;
- показать современный Playwright, а не «открой браузер — нажми кнопку»;
- поиграться с парой AI-хелперов, не делая вид, что AI заменяет QA;
- написать код, который мне самому не было бы стыдно унаследовать.

Restful-Booker Platform удобен тем, что у него есть и публичное демо
(`https://automationintesting.online`), и локальная сборка в Docker, есть
задокументированный REST API, и он не настолько большой, чтобы первую неделю
тратить на разбор предметной области.

### Стек — и почему

| Инструмент | Почему |
| --- | --- |
| **Playwright + TypeScript** | Лучшая поддержка нескольких браузеров из коробки, нативный API-тестинг через `APIRequestContext`, человеческий trace viewer, типы выручают при рефакторинге. |
| **Page Object Model** | Каждый проект из моей практики, который начинался с «давайте просто хелперы», заканчивался 2000-строчным `utils.ts`. POM навязывает границу «один объект — одна страница». |
| **Faker** | Случайные, но воспроизводимые-достаточно данные без портянок фикстур. |
| **Zod** | Валидация env-файла на старте — тесты падают с понятным сообщением, а не `undefined.toLowerCase()` где-то в середине. |
| **AJV** | Самый ходовой JSON Schema валидатор под Node. Завёрнут в маленький `toMatchSchema`, contract-тесты читаются естественно. |
| **Pino** | Локально красиво, в CI — JSON, быстрый. Лучше, чем `console.log`. |
| **Allure** | Скриншоты и стектрейсы рекрутеры читают охотнее логов. Allure кладёт всё в одном месте. |
| **Husky + commitlint** | Не даёт случайно отправить `wip` в `main`. В основном. |
| **Docker** | Воспроизводимость для тех, кто склонирует репо без нужной версии Chrome. |
| **@anthropic-ai/sdk** | Опциональный слой для трёх AI-хелперов (ниже). |

### Архитектура

Коротко: тесты импортируют кастомную фикстуру `test`, которая подсовывает
Page Objects и API-клиентов. Схемы, фабрики и логгер — утилиты, которые
используются с обеих сторон.

```
tests/  ──►  src/fixtures/playwright-fixtures.ts  ──►  src/pages/  + src/api/clients/
                                                  └─►  src/utils/ + src/config/
```

Полная диаграмма и описание слоёв — **[docs/architecture.md](docs/architecture.md)**.

### Quick start

#### Что нужно

- Node 22 LTS
- (Опционально) Docker — если хочется запускать в контейнере
- (Опционально) Java 17+ — только если хочется собирать Allure-отчёт локально

#### Установка и первый запуск

```bash
npm ci
npx playwright install --with-deps
cp .env.example .env
npm run test:smoke
```

И всё. Дефолты в `.env.example` уже смотрят на публичное демо со штатными
кредами админа (`admin` / `password`), никаких секретов искать не нужно.

#### Запуск через Docker

```bash
docker compose -f docker/docker-compose.yml run --rm tests           # полный chromium-набор
docker compose -f docker/docker-compose.yml run --rm tests npm run test:smoke
```

#### Переключение окружений

`TEST_ENV` решает, какой `.env.<env>` подкладывается поверх `.env`:

```bash
TEST_ENV=public npm test    # дефолт — против automationintesting.online
TEST_ENV=local  npm test    # против локально поднятой платформы (см. ниже)
```

Локальный SUT поднимай сам — это мультисервис на Spring, и upstream его
развивает. Репо: [mwinteringham/restful-booker-platform](https://github.com/mwinteringham/restful-booker-platform).

#### Полезные npm-скрипты

```bash
npm run test:smoke           # @smoke-теги, быстро
npm run test:ui              # regression UI на chromium
npm run test:api             # api-project, без браузера
npm run test:negative        # negative API + UI
npm run test:contracts       # contract-тесты по JSON Schema
npm run test:perf            # @perf-теги, пишет JSONL в performance-results/
npm run test:visual:update   # создать / обновить визуальные baselines
npm run test:visual          # сверка с baselines
npm run lint                 # ESLint
npm run typecheck            # tsc --noEmit
npm run allure:serve         # сгенерить и открыть Allure локально (нужен Java)
```

### Типы тестов

~70 тестов, разложены по назначению — так CI-матрица аккуратно ложится на
структуру папок.

| Папка | Что | Кол-во |
| --- | --- | --- |
| `tests/smoke/` | Базовая проверка главной, админ-логина, API health. Гонится на каждый PR до regression. | 8 |
| `tests/regression/ui/` | Полный флоу бронирования, форма обратной связи, админ-логин, навигация. | 16 |
| `tests/regression/api/` | Auth + booking CRUD (serial) + фильтрация списка. | 13 |
| `tests/negative/` | Невалидные payload, пропущенные поля, нелогичные даты, XSS-санити, unicode и т.п. | 18 |
| `tests/performance/` | Тайминги навигации, FCP, LCP, время ответа API. Результаты — в JSONL. | 4 |
| `tests/visual/` | Пиксельные снапшоты главной, админки, формы. С масками на динамику. | 7 |
| `tests/api/contracts/` | AJV-валидация ответов auth / room / booking по JSON Schema. | 5 |

### AI-фичи

Три опциональных хелпера за одним переключателем `ANTHROPIC_API_KEY`. Работают
изолированно — остальной набор тестов про них не знает.

1. **Test Generator** — `npm run ai:generate-test -- --requirement "..." --type ui|api`.
   Делает draft `.spec.ts` в `tests/_generated/`, используя POMы проекта и
   пример спека как контекст. **Никогда не коммитит сам.**
2. **Failure Analyzer** — `npm run ai:analyze -- --trace path/to/test-results/<folder>`.
   Отправляет в Claude `error-context.md` + скриншот падения, возвращает
   короткий markdown с гипотезой и шагами. Без ключа — печатает структурированный
   локальный дамп.
3. **Data Generator** — `aiDataGenerator.generate('booking', { context, count })`.
   Программный. Кеширует по sha1 на диске. При выключенном AI или любой
   ошибке — fallback на faker, тесты от этого не падают.

Подробности, промпты и примерная стоимость — **[docs/ai-features.md](docs/ai-features.md)**.

> AI тут помощник, а не QA. Сгенерированные тесты нужно вычитать,
> анализ падений — это гипотеза. Цель — скинуть скучное, а не аутсорсить
> суждение.

### CI/CD

Три воркфлоу в `.github/workflows/`:

- `tests.yml` — lint + typecheck → smoke (chromium) → regression matrix
  (chromium / firefox / webkit / api). На каждый PR и push в `main`.
- `nightly.yml` — полный matrix включая mobile, по крону 02:00 UTC.
- `publish-allure.yml` — забирает артефакты двух выше после `main`, собирает
  отчёт, деплоит на `gh-pages`.

Полный поток + одноразовая настройка GH Pages — **[docs/ci-cd.md](docs/ci-cd.md)**.

### Отчёты

- **Allure** (основной) — деплоится на GitHub Pages воркфлоу `publish-allure.yml`.
  Локально после прогона (`npm test`) тоже можно: `npm run allure:serve`
  (нужен Java 17+).
- **Playwright HTML report** — всегда пишется в `playwright-report/` после
  прогона. `npm run report` его открывает.
- **JUnit XML** — пишется в CI для всего, что его ждёт.
- **Performance JSONL** — `performance-results/<date>.jsonl`. Визуализации
  пока нет (см. wishlist ниже).

### Roadmap — что было по неделям

Это примерно в том порядке, в котором я реально это писал, а не маркетинговый
питч. Чеки остались: у большинства фаз есть запись в CHANGELOG и серия
коммитов.

- **Неделя 1** — инициализация: конфиги, Husky, базовые POMы, валидация env,
  первые smoke. Полдня переделывал env-загрузчик после того, как первый раз
  упал в CI без понятного сообщения.
- **Неделя 2** — основной regression: полный флоу бронирования, админ-тесты,
  весь слой API-клиентов и типов. Вынес `BookingFormComponent`, когда тот же
  набор полей повторился в двух местах. Worker-scoped `adminToken` родился
  здесь же — чтобы не лупить `/auth/login` из каждого теста.
- **Неделя 3** — качество: AJV-схемы и матчер `toMatchSchema`, negative,
  perf, visual. Дольше, чем хочется признавать, разбирался с роутингом
  проектов Playwright, чтобы нужные тесты попали в нужный кусок матрицы.
  Потом сам CI: PR-пайплайн, ночной, Allure на GH Pages.
- **Неделя 4** — три хелпера через Anthropic (test generator, failure
  analyzer, data generator), Dockerfile, документация (которую ты читаешь).
  Плюс re-read всех файлов с поиском «слишком вылизанных» мест.

### Что узнал по дороге

То, что я бы записал в шпаргалку «прежде чем начнёшь» для прошлого себя:

- **AJV в `strict: true` ругается на `$schema` в файле схемы.** Минут
  пятнадцать втыкал, потом переключил на `strict: false`. Трейд-офф —
  меньше валидации самих схем, для тестов терпимо.
- **`actions/download-artifact` не видит чужие runs.** Я предполагал, что
  видит, и собрал Allure-пайплайн под это. Переделал на
  `dawidd6/action-download-artifact`. Раздражает, но работает.
- **Не пиши толстый `BasePage`.** Первый порыв был набить туда хелперы
  «на всякий случай». Через три дня половина была не нужна, остальная
  лучше жила как методы конкретных страниц.
- **Вынос компонентов — реакция на боль, а не план.** `BookingFormComponent`
  выделил, только когда поля гостя реально появились в двух местах. День
  первый это было бы спекулятивно.
- **Visual baselines OS-специфичны.** CI генерит на Linux, попытка
  переиспользовать на Windows ломается красочно. Решение — всегда генерить
  из CI или прибить Docker-сборкой.
- **`allure-commandline` тяжёлый.** Тянет за собой JRE-обёртку. Сознательно
  НЕ положил в devDeps — `npx allure-commandline@version` в скрипте даёт
  лёгкую локальную установку.
- **Спам токенами.** Первая версия AI data generator ходила в `/v1/messages`
  на каждый вызов. Кеш по хешу — стоимость упала практически до нуля.

### Что улучшил бы

Честный бэклог, грубо по приоритету:

- `storageState` для админ-сессий — сэкономит секунду на каждый админ-тест.
- Telegram или Slack-нотификации на падения nightly (заготовка закомменчена
  в `nightly.yml`).
- Маленький dashboard из `performance-results/*.jsonl` — даже статика на
  Chart.js покатит.
- Перейти на ESLint v9 flat config.
- Пилот mutation testing через Stryker на API-клиентах.
- Реальный парсинг `trace.zip` в failure analyzer (сейчас работает по
  папке, в которую Playwright уже распаковал артефакты).

### Контакты

Заметил что-то странное или хочется пообсуждать QA-инструменты:

- Email: sashakobtsev21@gmail.com

Лицензия: [MIT](LICENSE).
