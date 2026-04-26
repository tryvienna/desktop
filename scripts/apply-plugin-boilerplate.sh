#!/bin/bash
# apply-plugin-boilerplate.sh
#
# Copies Vienna's standard plugin boilerplate (LICENSE, README template,
# CONTRIBUTING, issue/PR templates) into a plugin repo that doesn't have
# them yet. Existing files are preserved unless --force is passed.
#
# Usage:
#   ./scripts/apply-plugin-boilerplate.sh <target-dir> [--force]
#
# Examples:
#   ./scripts/apply-plugin-boilerplate.sh ../plugins/weather
#   ./scripts/apply-plugin-boilerplate.sh ../plugins/weather --force
#
# What it copies:
#   LICENSE                                       (Apache 2.0, verbatim)
#   CONTRIBUTING.md                               (short, points at main repo)
#   .github/PULL_REQUEST_TEMPLATE.md
#   .github/ISSUE_TEMPLATE/bug_report.yml
#   .github/ISSUE_TEMPLATE/feature_request.yml
#   .github/ISSUE_TEMPLATE/config.yml
#   README.md                                     (only if missing — from README.md.tmpl,
#                                                  with {{PLACEHOLDERS}} to fill in)
#
# Also patches the target's package.json to add license: "Apache-2.0" and
# repository/homepage/bugs fields (only if missing).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BOILERPLATE_DIR="$SCRIPT_DIR/plugin-boilerplate"

if [ $# -lt 1 ]; then
  echo "Usage: $0 <target-dir> [--force]" >&2
  exit 1
fi

TARGET="$1"
FORCE="false"
if [ "${2:-}" = "--force" ]; then FORCE="true"; fi

if [ ! -d "$TARGET" ]; then
  echo "Error: target directory does not exist: $TARGET" >&2
  exit 1
fi

if [ ! -d "$BOILERPLATE_DIR" ]; then
  echo "Error: boilerplate directory missing: $BOILERPLATE_DIR" >&2
  exit 1
fi

# Plugin-name hint for the README template. Uses the basename of the target dir.
PLUGIN_DIR_NAME="$(basename "$TARGET")"
PLUGIN_NAME="$PLUGIN_DIR_NAME"

# Try to derive a GitHub repo URL from the existing git remote if available.
PLUGIN_REPO_URL="https://github.com/tryvienna/$PLUGIN_DIR_NAME"
if [ -d "$TARGET/.git" ] || git -C "$TARGET" rev-parse --git-dir >/dev/null 2>&1; then
  REMOTE="$(git -C "$TARGET" remote get-url origin 2>/dev/null || true)"
  if [ -n "$REMOTE" ]; then
    # Normalize to https form
    case "$REMOTE" in
      git@github.com:*) PLUGIN_REPO_URL="https://github.com/${REMOTE#git@github.com:}"; PLUGIN_REPO_URL="${PLUGIN_REPO_URL%.git}" ;;
      https://github.com/*) PLUGIN_REPO_URL="${REMOTE%.git}" ;;
    esac
  fi
fi

echo "Target:      $TARGET"
echo "Plugin name: $PLUGIN_NAME"
echo "Repo URL:    $PLUGIN_REPO_URL"
echo "Force:       $FORCE"
echo ""

# ── Helpers ─────────────────────────────────────────────────────────────────

copy_if_missing() {
  local src="$1"
  local dst="$2"
  if [ -e "$dst" ] && [ "$FORCE" != "true" ]; then
    echo "  [=] exists: ${dst#$TARGET/}"
    return 0
  fi
  mkdir -p "$(dirname "$dst")"
  cp "$src" "$dst"
  echo "  [+] wrote:  ${dst#$TARGET/}"
}

# ── Copy static files ──────────────────────────────────────────────────────

copy_if_missing "$BOILERPLATE_DIR/LICENSE"                             "$TARGET/LICENSE"
copy_if_missing "$BOILERPLATE_DIR/CONTRIBUTING.md"                     "$TARGET/CONTRIBUTING.md"
copy_if_missing "$BOILERPLATE_DIR/.github/PULL_REQUEST_TEMPLATE.md"    "$TARGET/.github/PULL_REQUEST_TEMPLATE.md"
copy_if_missing "$BOILERPLATE_DIR/.github/ISSUE_TEMPLATE/bug_report.yml"      "$TARGET/.github/ISSUE_TEMPLATE/bug_report.yml"
copy_if_missing "$BOILERPLATE_DIR/.github/ISSUE_TEMPLATE/feature_request.yml" "$TARGET/.github/ISSUE_TEMPLATE/feature_request.yml"
copy_if_missing "$BOILERPLATE_DIR/.github/ISSUE_TEMPLATE/config.yml"          "$TARGET/.github/ISSUE_TEMPLATE/config.yml"

# ── README.md — only if missing (template has placeholders) ────────────────

if [ ! -e "$TARGET/README.md" ] || [ "$FORCE" = "true" ]; then
  sed -e "s|{{PLUGIN_NAME}}|$PLUGIN_NAME|g" \
      -e "s|{{PLUGIN_REPO_URL}}|$PLUGIN_REPO_URL|g" \
      -e "s|{{PLUGIN_DIR_NAME}}|$PLUGIN_DIR_NAME|g" \
      "$BOILERPLATE_DIR/README.md.tmpl" > "$TARGET/README.md"
  echo "  [+] wrote:  README.md"
else
  echo "  [=] exists: README.md"
fi

# ── package.json metadata ──────────────────────────────────────────────────

if [ -f "$TARGET/package.json" ]; then
  node -e '
    const { readFileSync, writeFileSync } = require("fs");
    const path = process.argv[1];
    const repoUrl = process.argv[2];
    const pkg = JSON.parse(readFileSync(path, "utf8"));
    let changed = false;
    const after = ["description", "private", "version", "name"];

    const entries = Object.entries(pkg);
    const insertIdx = Math.max(
      ...after.map(k => entries.findIndex(([key]) => key === k))
    );

    const additions = [];
    if (!pkg.license)    { additions.push(["license", "Apache-2.0"]); changed = true; }
    if (!pkg.author)     { additions.push(["author", "Vienna contributors"]); changed = true; }
    if (!pkg.homepage)   { additions.push(["homepage", "https://tryvienna.dev/docs"]); changed = true; }
    if (!pkg.repository) { additions.push(["repository", { type: "git", url: `git+${repoUrl}.git` }]); changed = true; }
    if (!pkg.bugs)       { additions.push(["bugs", { url: `${repoUrl}/issues` }]); changed = true; }

    if (changed) {
      entries.splice(insertIdx + 1, 0, ...additions);
      writeFileSync(path, JSON.stringify(Object.fromEntries(entries), null, 2) + "\n");
      console.log("  [+] wrote:  package.json (metadata)");
    } else {
      console.log("  [=] exists: package.json (metadata already present)");
    }
  ' "$TARGET/package.json" "$PLUGIN_REPO_URL"
fi

echo ""
echo "Done. Review changes, tweak the README placeholders, and commit."
