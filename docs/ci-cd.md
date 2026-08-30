# CI/CD

Four workflows under `.github/workflows/`:

| Workflow               | Trigger                                   | Purpose                                                            |
| ---------------------- | ----------------------------------------- | ------------------------------------------------------------------ |
| `tests.yml`            | PR + push to `main` + manual              | Lint → smoke → regression matrix → visual (gate) + perf (advisory) |
| `nightly.yml`          | `cron 0 2 * * *` UTC + manual             | Full suite on every project, retains 14d                           |
| `publish-allure.yml`   | `workflow_run` of the above + manual      | Merge artifacts, generate report, deploy to GitHub Pages           |
| `update-snapshots.yml` | **manual only**, requires a stated reason | Regenerate visual baselines on linux/chromium and commit them      |

## `tests.yml`

```
lint  ─────► smoke (chromium) ─────► regression matrix ─┬─► visual (chromium)   ← gate
                                      ├─ chromium        │
                                      ├─ firefox         └─► perf (chromium)    ← advisory
                                      ├─ webkit                continue-on-error
                                      └─ api
```

**Why `perf` does not gate.** Its budgets are measured against a shared public demo
on infrastructure we do not control, so a red result means "the demo was slow today",
not "this change regressed performance". The job still runs and publishes its samples;
only the verdict is advisory. Gating on someone else's infrastructure teaches the team
to ignore red, which costs more than the signal is worth.

**Why `visual` does gate.** A pixel diff against a committed baseline is a real signal
about our own code — provided the baseline exists for the platform being compared. It
had not: no `-chromium-linux` snapshots were ever committed, so every run wrote the
actual image and failed. See `update-snapshots.yml` below.

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

| Secret              | Default fallback in workflow                               |
| ------------------- | ---------------------------------------------------------- |
| `ADMIN_USERNAME`    | `admin`                                                    |
| `ADMIN_PASSWORD`    | `password`                                                 |
| `ANTHROPIC_API_KEY` | not used in the test workflows; only for ad-hoc AI scripts |

Both ADMIN\_\* defaults match the public demo, so the workflow is green
out-of-the-box without configuring any secrets.

## `nightly.yml`

Same shape as `tests.yml` but with the full project matrix:

```
chromium • firefox • webkit • mobile-chrome • mobile-safari • api
```

Mobile-\* projects run only here — they're slower and visual diffs are noisier
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

The deployed report lives at `https://sashakobtsev21-stack.github.io/mynewplaywrightproject/`.

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
- `test:visual:update` **inside the gating job**. A job that regenerates its own
  expectation cannot fail, so `visual` never passes `--update-snapshots`.
  Regeneration is a separate, manually triggered workflow that requires a stated
  reason — see below. It runs in CI rather than on a developer's machine for a
  physical reason: a baseline rendered on macOS can never match linux/chromium,
  so "created by a human locally, then committed" produces a permanently red gate.
  The deliberateness is preserved by the trigger, not by the location.
- Performance trending. The JSONL files land in `performance-results/` but
  no dashboard yet (see [Future Improvements](../README.md#future-improvements)).

## `update-snapshots.yml`

Manual only (`workflow_dispatch`), and it asks for a reason that ends up in the commit
message. It runs the visual specs with `--update-snapshots` on `ubuntu-latest` — the
same platform the gating job compares against — and commits any changed PNGs back to
the branch. If the regenerated images are byte-identical it says so and commits nothing.

Use it when a visual change is intentional. Review the image diff in the resulting
commit exactly as you would review code: that diff is the only thing standing between
an intended redesign and an unnoticed regression.
