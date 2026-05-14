# CI/CD

Three workflows under `.github/workflows/`:

| Workflow              | Trigger                                   | Purpose                                |
| --------------------- | ----------------------------------------- | -------------------------------------- |
| `tests.yml`           | PR + push to `main` + manual              | Lint → smoke → regression matrix       |
| `nightly.yml`         | `cron 0 2 * * *` UTC + manual             | Full suite on every project, retains 14d |
| `publish-allure.yml`  | `workflow_run` of the two above + manual  | Merge artifacts, generate report, deploy to GitHub Pages |

## `tests.yml`

```
lint  ─────► smoke (chromium) ─────► regression matrix
                                      ├─ chromium
                                      ├─ firefox
                                      ├─ webkit
                                      └─ api
```

- `concurrency` group cancels in-flight runs on the same ref. Saves minutes
  on noisy PRs.
- Playwright browsers are cached at `~/.cache/ms-playwright` keyed on
  `package-lock.json`. Cache miss → `npx playwright install --with-deps`,
  cache hit → only system deps via `playwright install-deps`.
- `regression` uses `fail-fast: false` so one browser failing doesn't kill
  the others.
- Allure results upload as `regression-<project>-allure` artifacts;
  failures additionally upload `regression-<project>-debug` with the
  `test-results/` and `playwright-report/` folders for download.

### Secrets

| Secret              | Default fallback in workflow |
| ------------------- | ---------------------------- |
| `ADMIN_USERNAME`    | `admin`                      |
| `ADMIN_PASSWORD`    | `password`                   |
| `ANTHROPIC_API_KEY` | not used in the test workflows; only for ad-hoc AI scripts |

Both ADMIN_* defaults match the public demo, so the workflow is green
out-of-the-box without configuring any secrets.

## `nightly.yml`

Same shape as `tests.yml` but with the full project matrix:

```
chromium • firefox • webkit • mobile-chrome • mobile-safari • api
```

Mobile-* projects run only here — they're slower and visual diffs are noisier
on different viewports, not worth slowing down every PR.

Slack/Telegram notification scaffolding is sitting commented out in the
workflow. Plan is to wire it up once I decide what's least annoying to me
at 03:00.

## `publish-allure.yml`

This is the tricky one. GitHub's native `actions/download-artifact` can only
see artifacts from the **same** workflow run. To grab artifacts from a
different workflow (the one that just finished and uploaded the results),
we use `dawidd6/action-download-artifact@v6`. Happy to switch back to native
when GH closes that gap.

Flow:

1. `tests` or `nightly` finishes on `main`.
2. This workflow downloads all artifacts whose name ends in `-allure`.
3. They're merged into one `allure-results/` folder.
4. Java + Allure CLI are installed; the report is generated.
5. `peaceiris/actions-gh-pages@v4` pushes the generated folder to `gh-pages`.
   `force_orphan: true` keeps the branch history small.

The deployed report lives at `https://<your-handle>.github.io/restful-booker-tests/`.

### One-time repo setup

For the Pages deploy to work, in repo Settings:

1. **Actions → General → Workflow permissions** → "Read and write".
2. **Pages → Source** → "Deploy from a branch" → `gh-pages` / `(root)`.

After the first successful `publish-allure` run, the badge in the README
goes green and the link works.

## Local mirroring

Everything the CI runs is runnable locally:

```bash
npm run lint && npm run typecheck     # what the lint job does
npm run test:smoke                    # what the smoke job does
npx playwright test --project=chromium tests/regression   # one matrix slice

# Generate Allure locally (needs Java)
npm test
npm run allure:serve
```

Or with Docker:

```bash
docker compose -f docker/docker-compose.yml run --rm tests npm run test:smoke
```

## What's intentionally NOT in CI

- AI helper scripts (`ai:generate-test`, `ai:analyze`). They're for the QA's
  local workflow, not the gate.
- `test:visual:update`. Visual baselines should be deliberately created by
  a human, then committed — never overwritten in CI.
- Performance trending. The JSONL files land in `performance-results/` but
  no dashboard yet (see [Future Improvements](../README.md#future-improvements)).
