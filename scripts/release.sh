#!/bin/bash
# Build and upload a Vienna release to hellodrift/vienna-releases.
#
# Usage:
#   pnpm release              # uses version from apps/desktop/package.json
#   pnpm release 0.1.0        # override version
#
# Prerequisites:
#   - gh CLI authenticated with access to hellodrift/vienna-releases
#   - For signed builds: .env.build configured in apps/desktop/
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
RELEASES_REPO="hellodrift/vienna-releases"
DESKTOP_DIR="apps/desktop"

# ── Resolve version ──────────────────────────────────────────────────────────

if [ -n "${1:-}" ]; then
  VERSION="$1"
else
  VERSION="$(node -p "require('./$DESKTOP_DIR/package.json').version")"
fi

TAG="v$VERSION"
COMMIT="$(git rev-parse --short HEAD)"
FULL_COMMIT="$(git rev-parse HEAD)"

echo "══════════════════════════════════════════"
echo "  Vienna Release"
echo "  Version:  $VERSION ($TAG)"
echo "  Commit:   $COMMIT ($FULL_COMMIT)"
echo "══════════════════════════════════════════"
echo ""

# ── Check prerequisites ─────────────────────────────────────────────────────

if ! command -v gh &>/dev/null; then
  echo "Error: gh CLI not found. Install it: https://cli.github.com" >&2
  exit 1
fi

if ! gh auth status &>/dev/null 2>&1; then
  echo "Error: gh CLI not authenticated. Run: gh auth login" >&2
  exit 1
fi

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
  echo "Warning: You have uncommitted changes."
  if [ -t 0 ]; then
    read -rp "Continue anyway? [y/N] " confirm
    [ "$confirm" = "y" ] || exit 1
  else
    echo "Error: Commit or stash changes first (or run directly: ./scripts/release.sh)" >&2
    exit 1
  fi
fi

# ── Ensure native DMG dependencies are built ────────────────────────────────
# In pnpm worktrees, transitive native modules (macos-alias, fs-xattr) used by
# appdmg may not have their .node binaries built. Rebuild them if missing.

for mod_path in \
  node_modules/.pnpm/macos-alias@*/node_modules/macos-alias \
  node_modules/.pnpm/fs-xattr@*/node_modules/fs-xattr; do
  # glob may not match — skip silently
  for dir in $mod_path; do
    [ -d "$dir" ] || continue
    if [ ! -d "$dir/build/Release" ]; then
      echo "Rebuilding native module: $(basename "$dir")..."
      (cd "$dir" && npx node-gyp rebuild 2>&1 | tail -1)
    fi
  done
done

# ── Build ────────────────────────────────────────────────────────────────────

echo "Building desktop distributables..."
if [ -f "$DESKTOP_DIR/.env.build" ]; then
  echo "  (using signed build via .env.build)"
  pnpm --filter @vienna/desktop make:signed
else
  echo "  (unsigned build — no .env.build found)"
  pnpm --filter @vienna/desktop make
fi

# ── Find artifacts ───────────────────────────────────────────────────────────

echo ""
echo "Build artifacts:"
ARTIFACTS=()
while IFS= read -r -d '' f; do
  ARTIFACTS+=("$f")
  echo "  $(basename "$f") ($(du -h "$f" | cut -f1 | xargs))"
done < <(find "$DESKTOP_DIR/out/make" -type f \( -name '*.dmg' -o -name '*.zip' \) -print0)

if [ ${#ARTIFACTS[@]} -eq 0 ]; then
  echo "Error: No build artifacts found in $DESKTOP_DIR/out/make/" >&2
  exit 1
fi

# ── Upload release ───────────────────────────────────────────────────────────

echo ""
echo "Creating release $TAG on $RELEASES_REPO..."

# ── Generate release notes from CHANGELOG.md ─────────────────────────────────

NOTES="Vienna $VERSION

Commit: $FULL_COMMIT
Built: $(date -u '+%Y-%m-%d %H:%M UTC')"

# Extract the current version's changelog entry for GitHub release notes
CHANGELOG_NOTES="$(node "$REPO_ROOT/scripts/parse-changelog.js" --version "v$VERSION" 2>/dev/null || echo "")"
if [ -n "$CHANGELOG_NOTES" ]; then
  NOTES="$CHANGELOG_NOTES

---
Commit: $FULL_COMMIT
Built: $(date -u '+%Y-%m-%d %H:%M UTC')"

  # Generate standalone release-notes.md artifact for in-app update checker
  RELEASE_NOTES_FILE="$DESKTOP_DIR/out/release-notes.md"
  mkdir -p "$(dirname "$RELEASE_NOTES_FILE")"
  echo "$CHANGELOG_NOTES" > "$RELEASE_NOTES_FILE"
  ARTIFACTS+=("$RELEASE_NOTES_FILE")
  echo "  release-notes.md generated"
fi

gh release create "$TAG" \
  "${ARTIFACTS[@]}" \
  --repo "$RELEASES_REPO" \
  --title "Vienna $VERSION" \
  --notes "$NOTES"

echo ""
echo "Release published: https://github.com/$RELEASES_REPO/releases/tag/$TAG"
