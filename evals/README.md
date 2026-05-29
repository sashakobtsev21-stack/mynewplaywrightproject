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
over time. The process exits non-zero if any sample fails its gate.

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

## Manual rubric (the part metrics can't do)

For failure analysis, real quality needs a human read. Score 1-5:

| Score | Meaning                                          |
| ----- | ------------------------------------------------ |
| 5     | Correct root cause, actionable, no wrong claims. |
| 4     | Correct cause, minor noise or a soft step.       |
| 3     | Plausible but unconfirmed; would still help.     |
| 2     | Partly wrong or generic; little signal.          |
| 1     | Wrong or hallucinated.                           |

Spot-check a few live runs this way before trusting the analyzer on anything
that matters.
