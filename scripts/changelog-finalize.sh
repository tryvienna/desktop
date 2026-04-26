#!/bin/bash
# Merge the reviewed CHANGELOG-DRAFT.md into CHANGELOG.md and
# generate the JSON file that powers tryvienna.dev/changelogs.
#
# Usage:
#   pnpm changelog:finalize

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
DRAFT_FILE="$REPO_ROOT/CHANGELOG-DRAFT.md"
CHANGELOG_FILE="$REPO_ROOT/CHANGELOG.md"

# ── Validate draft exists ────────────────────────────────────────────────────

if [ ! -f "$DRAFT_FILE" ]; then
  echo "Error: No CHANGELOG-DRAFT.md found." >&2
  echo "Run: pnpm changelog:generate" >&2
  exit 1
fi

DRAFT="$(cat "$DRAFT_FILE")"

if [ -z "$DRAFT" ]; then
  echo "Error: CHANGELOG-DRAFT.md is empty." >&2
  exit 1
fi

# ── Merge into CHANGELOG.md ─────────────────────────────────────────────────

if [ -f "$CHANGELOG_FILE" ]; then
  # Insert new entry after the first "# Changelog" heading.
  # Uses sed to find the heading line, then reads the draft from a temp file.
  # This avoids awk's multiline string limitations.
  DRAFT_TMP="$(mktemp)"
  printf '%s\n' "$DRAFT" > "$DRAFT_TMP"

  # Find the line number of "# Changelog", insert draft after it
  HEADER_LINE="$(grep -n '^# Changelog' "$CHANGELOG_FILE" | head -1 | cut -d: -f1)"
  if [ -n "$HEADER_LINE" ]; then
    {
      head -n "$HEADER_LINE" "$CHANGELOG_FILE"
      echo ""
      cat "$DRAFT_TMP"
      # Skip any blank lines immediately after the header to avoid double-spacing
      tail -n +"$((HEADER_LINE + 1))" "$CHANGELOG_FILE"
    } > "$CHANGELOG_FILE.tmp" && mv "$CHANGELOG_FILE.tmp" "$CHANGELOG_FILE"
  else
    # No header found — prepend
    { echo "# Changelog"; echo ""; cat "$DRAFT_TMP"; echo ""; cat "$CHANGELOG_FILE"; } > "$CHANGELOG_FILE.tmp" && mv "$CHANGELOG_FILE.tmp" "$CHANGELOG_FILE"
  fi
  rm -f "$DRAFT_TMP"
else
  cat > "$CHANGELOG_FILE" <<EOF
# Changelog

$DRAFT
EOF
fi

echo "Updated CHANGELOG.md"

# ── Generate JSON for web ────────────────────────────────────────────────────

# Parse CHANGELOG.md into JSON entries for the web changelog page.
# Each ## heading starts a new version entry.

node "$REPO_ROOT/scripts/parse-changelog.js"

# ── Clean up draft ───────────────────────────────────────────────────────────

rm "$DRAFT_FILE"
echo "Removed CHANGELOG-DRAFT.md"
echo ""
echo "Done! Next steps:"
echo "  1. Commit CHANGELOG.md (+ changelogs.json if it was generated)"
echo "  2. Tag and release"
