#!/usr/bin/env bash
# Local CI pipeline — mirrors what remote CI will run.
# Usage: ./scripts/ci-local.sh  or  pnpm run ci:local
#
# Runs at reduced CPU priority so foreground apps stay responsive.
# Exits on first failure (set -e).

set -euo pipefail

BOLD='\033[1m'
GREEN='\033[0;32m'
RED='\033[0;31m'
RESET='\033[0m'

step() {
  echo ""
  echo -e "${BOLD}━━━ $1 ━━━${RESET}"
}

pass() {
  echo -e "${GREEN}✓ $1${RESET}"
}

fail() {
  echo -e "${RED}✗ $1${RESET}"
  exit 1
}

# If running inside a worktree, use the main repo's node_modules
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

NICE="nice -n 10"

# Native module (better-sqlite3) must be compiled for the right ABI:
# - Node.js for unit tests   (NODE_MODULE_VERSION 127 on Node 22)
# - Electron for E2E tests   (NODE_MODULE_VERSION 143 on Electron 40)
BETTER_SQLITE3_DIR="node_modules/.pnpm/better-sqlite3@12.6.2/node_modules/better-sqlite3"

rebuild_native_for_node() {
  step "Rebuilding native modules for Node.js"
  (cd "$BETTER_SQLITE3_DIR" && npx --yes node-gyp rebuild --loglevel=warn 2>&1 | tail -1)
}

rebuild_native_for_electron() {
  step "Rebuilding native modules for Electron"
  (cd "$BETTER_SQLITE3_DIR" && npx --yes @electron/rebuild -v "$(npx electron --version | tr -d v)" -m . 2>&1 | tail -1)
}

step "Typecheck"
$NICE pnpm turbo typecheck --concurrency=50% && pass "Typecheck" || fail "Typecheck"

step "Lint"
$NICE pnpm turbo lint --concurrency=50% && pass "Lint" || fail "Lint"

step "Format check"
$NICE pnpm turbo format:check --concurrency=50% && pass "Format check" || fail "Format check"

rebuild_native_for_node

step "Unit & integration tests (with coverage)"
$NICE pnpm turbo test:coverage --concurrency=50% && pass "Unit & integration tests" || fail "Unit & integration tests"

rebuild_native_for_electron

step "E2E tests"
$NICE pnpm turbo test:e2e && pass "E2E tests" || fail "E2E tests"

echo ""
echo -e "${GREEN}${BOLD}━━━ All checks passed ━━━${RESET}"
