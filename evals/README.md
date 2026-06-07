# AI evals

Quality gates for the three AI helpers. Run with:

```bash
npm run eval:ai
```

## Modes

- **live** — set `ANTHROPIC_API_KEY` and the runner calls the real modules, then
  scores the output.
- **offline** — no key: the runner scores committed fixtures in `fixtures/`
  instead. This keeps the harness (and CI) runnable for free. Offline numbers
  describe the fixtures, not Claude — they prove the metrics work, not that the
  model is good today.

Per-run results land in `results/<timestamp>.json` (git-ignored) for tracking
over time, alongside the gate verdict.

## Release gate

The run ends in a **gate**, not just a report: `evaluateGate()` (`gate.ts`) checks
the run against `thresholds.json` and the process exits non-zero when the bar isn't
cleared — so CI fails the build.

- `minPassRate` — fraction of samples that must pass their heuristics (default 1.0).
- `minJudgeScore` — minimum **average** LLM-judge score, live runs only (default 4).

CI runs `npm run eval:ai` offline on every PR (`.github/workflows/tests.yml`):
fixtures + faker are deterministic, so it's a stable gate with no key or spend.

## What each metric checks

### test-generator (`scoreSpec` + `typechecksSpec`)

- imports the fixtures barrel, has a `describe`, a `test`, and an `expect`
- stays within a line budget and invents no relative import paths
- `typechecks`: the draft is written into `tests/_generated/` and run through
  `tsc --noEmit`. This is the "does it compile" gate.

### data-generator (`scoreData`)

- every record validates against the strict zod schema (`strictValidRatio`)
- records are distinct (`diversity` = unique / total)
- offline this scores the faker fallback, which should pass cleanly.

### failure-analyzer (`scoreAnalysis`)

Heuristics only: the output names a root cause, lists actionable next steps, and
is a sensible length. These catch empty or rambling answers. They do **not**
judge whether the diagnosis is correct.

## LLM-as-judge (live runs)

Heuristics can't tell whether a diagnosis is _correct_. In live mode an LLM judge
(`judge.ts`, on the cheap haiku tier) grades each analysis against this rubric and
returns a zod-validated
`{ score, correct_root_cause, actionable, hallucination_risk, rationale }`:

| Score | Meaning                                          |
| ----- | ------------------------------------------------ |
| 5     | Correct root cause, actionable, no wrong claims. |
| 4     | Correct cause, minor noise or a soft step.       |
| 3     | Plausible but unconfirmed; would still help.     |
| 2     | Partly wrong or generic; little signal.          |
| 1     | Wrong or hallucinated.                           |

The judge is itself an LLM — a cheap proxy, not ground truth — so the gate uses the
**average** score across samples (`minJudgeScore`), never an individual one, and it
reports a `hallucination_risk` because "sounds right" still isn't "is right". It
raises the floor; it doesn't replace a manual spot-check on anything that matters.
