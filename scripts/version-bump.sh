#!/bin/bash
# Bump the desktop app version using semantic versioning.
#
# Usage:
#   pnpm version:bump patch   # 0.0.7 → 0.0.8
#   pnpm version:bump minor   # 0.0.7 → 0.1.0
#   pnpm version:bump major   # 0.0.7 → 1.0.0
#   pnpm version:bump 0.1.0   # set explicit version
#
# This only updates the version in package.json — it does NOT commit or tag.
# The release script handles committing, tagging, and changelog generation.

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
DESKTOP_PKG="$REPO_ROOT/apps/desktop/package.json"

if [ -z "${1:-}" ]; then
  echo "Usage: pnpm version:bump <patch|minor|major|X.Y.Z>" >&2
  exit 1
fi

CURRENT="$(node -p "require('$DESKTOP_PKG').version")"
BUMP_TYPE="$1"

# ── Calculate new version ────────────────────────────────────────────────────

case "$BUMP_TYPE" in
  patch)
    IFS='.' read -r major minor patch <<< "$CURRENT"
    NEW_VERSION="$major.$minor.$((patch + 1))"
    ;;
  minor)
    IFS='.' read -r major minor patch <<< "$CURRENT"
    NEW_VERSION="$major.$((minor + 1)).0"
    ;;
  major)
    IFS='.' read -r major minor patch <<< "$CURRENT"
    NEW_VERSION="$((major + 1)).0.0"
    ;;
  *)
    # Explicit version — validate format
    if [[ ! "$BUMP_TYPE" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
      echo "Error: Invalid version format '$BUMP_TYPE'. Use X.Y.Z" >&2
      exit 1
    fi
    NEW_VERSION="$BUMP_TYPE"
    ;;
esac

if [ "$CURRENT" = "$NEW_VERSION" ]; then
  echo "Version is already $CURRENT"
  exit 0
fi

# ── Update package.json ──────────────────────────────────────────────────────

node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('$DESKTOP_PKG', 'utf8'));
pkg.version = '$NEW_VERSION';
fs.writeFileSync('$DESKTOP_PKG', JSON.stringify(pkg, null, 2) + '\n');
"

echo "Version bumped: $CURRENT → $NEW_VERSION"
