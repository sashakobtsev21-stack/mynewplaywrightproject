#!/usr/bin/env bash
# Generate (and optionally serve) the Allure report locally.
#
# Requires Java + Allure CLI. The npm package allure-commandline pulls a JRE
# wrapper but it's heavy, so we use npx on demand instead of a permanent dep.
#
# Usage:
#   bash scripts/publish-allure.sh             # generate to allure-report/
#   SERVE=1 bash scripts/publish-allure.sh     # generate and open in browser

set -euo pipefail

RESULTS_DIR=${RESULTS_DIR:-allure-results}
OUT_DIR=${OUT_DIR:-allure-report}

if [ ! -d "$RESULTS_DIR" ] || [ -z "$(ls -A "$RESULTS_DIR" 2>/dev/null)" ]; then
  echo "No results found in '$RESULTS_DIR'." >&2
  echo "Run tests first, e.g.  npm test  or  npm run test:smoke" >&2
  exit 1
fi

# allure-commandline ships its own Java check; defer to it.
echo "Generating Allure report from $RESULTS_DIR -> $OUT_DIR"
npx --yes allure-commandline@2.30.0 generate "$RESULTS_DIR" -o "$OUT_DIR" --clean

if [ "${SERVE:-0}" = "1" ]; then
  echo "Opening report..."
  npx --yes allure-commandline@2.30.0 open "$OUT_DIR"
fi

echo "Done."
