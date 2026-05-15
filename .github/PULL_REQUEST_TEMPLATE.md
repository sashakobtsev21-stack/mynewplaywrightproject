## What

<!-- Short description. One or two sentences. -->

## Why

<!-- The reason behind the change. Linked issue / requirement / bug. -->

## How to verify

<!-- Steps to run locally. -->

```bash
npm install
# ...
```

## Checklist

- [ ] `npm run lint` clean
- [ ] `npm run typecheck` clean
- [ ] Relevant tests pass locally (`npm test` or a focused subset)
- [ ] New tests cover the change (if behaviour added/changed)
- [ ] Visual baselines regenerated if affected (`npm run test:visual:update`)
- [ ] README / docs updated if the public surface changed
