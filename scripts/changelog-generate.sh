#!/bin/bash
# Generate a changelog draft from conventional commits between two version bumps.
#
# Usage:
#   ./scripts/changelog-generate.sh                # changes since last release
#   ./scripts/changelog-generate.sh v0.0.6 v0.0.7  # between specific versions
#   ./scripts/changelog-generate.sh --dry-run       # preview without writing
#
# Output: writes a draft to CHANGELOG-DRAFT.md for human review.
# After review, run `./scripts/changelog-finalize.sh` to merge into CHANGELOG.md.

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
DESKTOP_PKG="$REPO_ROOT/apps/desktop/package.json"
DRAFT_FILE="$REPO_ROOT/CHANGELOG-DRAFT.md"
DRY_RUN=false

# ── Parse args ───────────────────────────────────────────────────────────────

POSITIONAL=()
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    *) POSITIONAL+=("$arg") ;;
  esac
done

# ── Resolve version range ───────────────────────────────────────────────────

CURRENT_VERSION="$(node -p "require('$DESKTOP_PKG').version")"

# Use git tags as the canonical source of truth for release boundaries.
# Falls back to the previous version bump commit if no tags exist yet.
PREV_REF=""
PREV_TAG="$(git describe --tags --abbrev=0 HEAD 2>/dev/null || echo "")"
if [ -n "$PREV_TAG" ]; then
  # If current HEAD is the tagged commit, find the tag before it
  if [ "$(git rev-parse "$PREV_TAG")" = "$(git rev-parse HEAD)" ]; then
    PREV_TAG="$(git describe --tags --abbrev=0 "$PREV_TAG^" 2>/dev/null || echo "")"
  fi
  PREV_REF="$PREV_TAG"
fi

# Fallback: find the most recent version bump commit (for repos without tags yet)
if [ -z "$PREV_REF" ]; then
  BUMP_COMMITS=()
  while IFS= read -r line; do
    [ -n "$line" ] && BUMP_COMMITS+=("$line")
  done < <(git log --all --format="%H" --grep="^chore.*bump.*version\|^chore.*bump.*desktop")
  # Second entry is the previous bump (first is current version's bump)
  PREV_REF="${BUMP_COMMITS[1]:-}"
fi

FROM="${POSITIONAL[0]:-$PREV_REF}"
TO="${POSITIONAL[1]:-HEAD}"

if [ -z "$FROM" ]; then
  echo "Error: Could not determine previous version. Provide explicit range." >&2
  echo "Usage: $0 <from-ref> <to-ref>" >&2
  exit 1
fi

FROM_SHORT="$(git rev-parse --short "$FROM" 2>/dev/null || echo "$FROM")"
TO_SHORT="$(git rev-parse --short "$TO" 2>/dev/null || echo "$TO")"

echo "Generating changelog for v$CURRENT_VERSION"
echo "  Range: $FROM_SHORT..$TO_SHORT"
echo ""

# ── Collect commits ──────────────────────────────────────────────────────────

# Parse conventional commits into categories
declare -a FEATURES=()
declare -a FIXES=()
declare -a IMPROVEMENTS=()
declare -a OTHER=()

while IFS= read -r line; do
  [ -z "$line" ] && continue

  hash="${line%% *}"
  msg="${line#* }"
  short_hash="$(git rev-parse --short "$hash")"

  # Strip scope for cleaner display, but keep for context
  clean_msg="$msg"

  case "$msg" in
    feat:*|feat\(*)
      # Extract the description part after type(scope):
      desc="$(echo "$msg" | sed -E 's/^feat(\([^)]*\))?:? *//')"
      FEATURES+=("- $desc")
      ;;
    fix:*|fix\(*)
      desc="$(echo "$msg" | sed -E 's/^fix(\([^)]*\))?:? *//')"
      FIXES+=("- $desc")
      ;;
    refactor:*|refactor\(*|perf:*|perf\(*)
      desc="$(echo "$msg" | sed -E 's/^[a-z]+(\([^)]*\))?:? *//')"
      IMPROVEMENTS+=("- $desc")
      ;;
    chore:*|chore\(*|docs:*|docs\(*|ci:*|ci\(*|build:*|build\(*)
      # Skip chores/docs/ci from public changelog
      ;;
    Merge\ *)
      # Skip merge commits
      ;;
    *)
      # Include uncategorized commits that aren't trivial
      OTHER+=("- $msg")
      ;;
  esac
done < <(git log --oneline --no-merges "$FROM..$TO" 2>/dev/null)

# ── Build draft ──────────────────────────────────────────────────────────────

# Portable date: macOS uses %-d, GNU/Linux uses %e (space-padded, then trimmed)
if date '+%-d' &>/dev/null 2>&1; then
  RELEASE_DATE="$(date '+%B %-d, %Y')"
else
  RELEASE_DATE="$(date '+%B %e, %Y' | sed 's/  / /')"
fi

DRAFT="## v$CURRENT_VERSION — $RELEASE_DATE

"

has_content=false

if [ ${#FEATURES[@]} -gt 0 ]; then
  DRAFT+="### New
"
  for entry in "${FEATURES[@]}"; do
    DRAFT+="$entry
"
  done
  DRAFT+="
"
  has_content=true
fi

if [ ${#IMPROVEMENTS[@]} -gt 0 ]; then
  DRAFT+="### Improved
"
  for entry in "${IMPROVEMENTS[@]}"; do
    DRAFT+="$entry
"
  done
  DRAFT+="
"
  has_content=true
fi

if [ ${#FIXES[@]} -gt 0 ]; then
  DRAFT+="### Fixed
"
  for entry in "${FIXES[@]}"; do
    DRAFT+="$entry
"
  done
  DRAFT+="
"
  has_content=true
fi

if [ ${#OTHER[@]} -gt 0 ]; then
  DRAFT+="### Other
"
  for entry in "${OTHER[@]}"; do
    DRAFT+="$entry
"
  done
  DRAFT+="
"
  has_content=true
fi

if [ "$has_content" = false ]; then
  echo "No user-facing changes found in range."
  exit 0
fi

# ── Output ───────────────────────────────────────────────────────────────────

if [ "$DRY_RUN" = true ]; then
  echo "$DRAFT"
  echo "---"
  echo "(dry run — nothing written)"
else
  echo "$DRAFT" > "$DRAFT_FILE"
  echo "Draft written to CHANGELOG-DRAFT.md"
  echo ""
  echo "Next steps:"
  echo "  1. Review and edit CHANGELOG-DRAFT.md (rewrite for users, not developers)"
  echo "  2. Run: pnpm changelog:finalize"
fi
