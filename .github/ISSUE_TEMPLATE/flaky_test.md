---
name: Flaky test
about: A test that fails intermittently — track and triage
labels: flaky
---

## Test

- Spec file: `tests/...`
- Test name: ...
- Project (chromium / firefox / webkit / mobile-\* / api): ...

## How often

- Failures observed: ... out of last ... runs
- First seen: ... (link to a failing run if available)

## Symptoms

<!-- Locator timeout? Assertion mismatch? Network error? -->

## Suspected cause

<!-- Optional, fine to leave blank. -->

## Workaround applied

- [ ] None
- [ ] `test.fixme` with a TODO
- [ ] Increased timeout — by how much: ...
- [ ] Added a `waitFor(...)` — where: ...

## Trace / logs

<!-- Attach trace.zip from the failing run if you have it. -->
