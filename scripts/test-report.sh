#!/usr/bin/env bash
# Consolidated test & coverage report.
# Runs unit+integration with coverage, then e2e, and prints a summary.
#
# Usage: ./scripts/test-report.sh  or  pnpm run test:report

set -euo pipefail

BOLD='\033[1m'
DIM='\033[2m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
RESET='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DESKTOP_DIR="$REPO_ROOT/apps/desktop"

UNIT_OK=0
E2E_OK=0
OVERALL=0

step() {
  echo ""
  echo -e "${BOLD}━━━ $1 ━━━${RESET}"
}

# ── 1. Unit + integration tests with coverage ──────────────────────
step "Unit & integration tests (with coverage)"
if pnpm --filter @vienna/desktop run test:coverage 2>&1; then
  UNIT_OK=1
else
  UNIT_OK=0
  OVERALL=1
fi

# ── 2. E2E tests ───────────────────────────────────────────────────
step "E2E tests"
if pnpm --filter @vienna/desktop run test:e2e 2>&1; then
  E2E_OK=1
else
  E2E_OK=0
  OVERALL=1
fi

# ── 3. Consolidated summary ────────────────────────────────────────
echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}║            Test & Coverage Report                ║${RESET}"
echo -e "${BOLD}╚══════════════════════════════════════════════════╝${RESET}"

# Test results
echo ""
echo -e "${BOLD}Test Results${RESET}"
if [ "$UNIT_OK" -eq 1 ]; then
  echo -e "  ${GREEN}✓${RESET} Unit & integration tests passed"
else
  echo -e "  ${RED}✗${RESET} Unit & integration tests failed"
fi
if [ "$E2E_OK" -eq 1 ]; then
  echo -e "  ${GREEN}✓${RESET} E2E tests passed"
else
  echo -e "  ${RED}✗${RESET} E2E tests failed"
fi

# Coverage summary from JSON
SUMMARY_FILE="$DESKTOP_DIR/coverage/coverage-summary.json"
if [ -f "$SUMMARY_FILE" ]; then
  echo ""
  echo -e "${BOLD}Coverage Summary${RESET} ${DIM}(unit + integration)${RESET}"

  # Parse coverage-summary.json with node (available in any Node project)
  node -e "
    const fs = require('fs');
    const summary = JSON.parse(fs.readFileSync('$SUMMARY_FILE', 'utf8'));
    const t = summary.total;
    const threshold = 80;
    const fmt = (metric) => {
      const pct = t[metric].pct;
      const covered = t[metric].covered;
      const total = t[metric].total;
      const icon = pct >= threshold ? '✓' : '✗';
      const color = pct >= threshold ? '\x1b[32m' : '\x1b[31m';
      return '  ' + color + icon + '\x1b[0m ' + metric.padEnd(12) + pct.toString().padStart(5) + '% (' + covered + '/' + total + ')';
    };
    console.log(fmt('statements'));
    console.log(fmt('branches'));
    console.log(fmt('functions'));
    console.log(fmt('lines'));
    console.log('');
    console.log('  \x1b[2mThreshold: ' + threshold + '% (all metrics)\x1b[0m');
  "

  echo ""
  echo -e "${DIM}  HTML report: apps/desktop/coverage/index.html${RESET}"
  echo -e "${DIM}  JSON report: apps/desktop/coverage/coverage-summary.json${RESET}"
  if [ -d "$DESKTOP_DIR/playwright-report" ]; then
    echo -e "${DIM}  E2E report:  apps/desktop/playwright-report/index.html${RESET}"
  fi
else
  echo ""
  echo -e "  ${YELLOW}⚠ No coverage data found${RESET}"
fi

echo ""
if [ "$OVERALL" -eq 0 ]; then
  echo -e "${GREEN}${BOLD}━━━ All tests passed ━━━${RESET}"
else
  echo -e "${RED}${BOLD}━━━ Some tests failed ━━━${RESET}"
fi

# ── 4. Open HTML coverage report ──────────────────────────────────
COVERAGE_HTML="$DESKTOP_DIR/coverage/index.html"
if [ -f "$COVERAGE_HTML" ]; then
  open "$COVERAGE_HTML"
fi

if [ "$OVERALL" -ne 0 ]; then
  exit 1
fi
