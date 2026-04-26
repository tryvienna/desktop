#!/bin/bash
# ┌──────────────────────────────────────────┐
# │  Vienna Ship — Interactive Release Tool  │
# │                                          │
# │  Usage: pnpm ship                        │
# │                                          │
# │  Walks you through the entire release:   │
# │  version bump → changelog → commit →     │
# │  build → publish to GitHub Releases      │
# └──────────────────────────────────────────┘
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
DESKTOP_PKG="$REPO_ROOT/apps/desktop/package.json"
CHANGELOG_FILE="$REPO_ROOT/CHANGELOG.md"
DRAFT_FILE="$REPO_ROOT/CHANGELOG-DRAFT.md"

# ── Colors & formatting ─────────────────────────────────────────────────────

if [ -t 1 ]; then
  BOLD="\033[1m"
  DIM="\033[2m"
  RESET="\033[0m"
  GREEN="\033[32m"
  YELLOW="\033[33m"
  CYAN="\033[36m"
  RED="\033[31m"
  CHECK="${GREEN}✓${RESET}"
  ARROW="${CYAN}→${RESET}"
  WARN="${YELLOW}!${RESET}"
  CROSS="${RED}✗${RESET}"
else
  BOLD="" DIM="" RESET="" GREEN="" YELLOW="" CYAN="" RED=""
  CHECK="✓" ARROW="→" WARN="!" CROSS="✗"
fi

step() { echo -e "\n${BOLD}[$1/7]${RESET} $2"; }
info() { echo -e "  ${DIM}$1${RESET}"; }
ok()   { echo -e "  ${CHECK} $1"; }
warn() { echo -e "  ${WARN} $1"; }
fail() { echo -e "  ${CROSS} $1" >&2; }

ask() {
  local prompt="$1" default="${2:-}"
  if [ -n "$default" ]; then
    echo -en "  ${ARROW} ${prompt} ${DIM}[$default]${RESET} "
  else
    echo -en "  ${ARROW} ${prompt} "
  fi
  read -r answer
  echo "${answer:-$default}"
}

confirm() {
  local prompt="$1"
  echo -en "  ${ARROW} ${prompt} ${DIM}[Y/n]${RESET} "
  read -r answer
  case "${answer:-y}" in
    [Yy]*) return 0 ;;
    *) return 1 ;;
  esac
}

bail() {
  echo -e "\n${DIM}Aborted. No changes were made.${RESET}"
  exit 0
}

# ── Banner ───────────────────────────────────────────────────────────────────

CURRENT_VERSION="$(node -p "require('$DESKTOP_PKG').version")"

echo ""
echo -e "${BOLD}  Vienna Ship${RESET}"
echo -e "  ${DIM}Current version: v${CURRENT_VERSION}${RESET}"
echo ""

# ── Step 1: Preflight checks ────────────────────────────────────────────────

step 1 "Preflight checks"

ERRORS=0

# git clean?
if [ -n "$(git status --porcelain)" ]; then
  warn "Uncommitted changes detected"
  git status --short | head -5 | while read -r line; do info "  $line"; done
  DIRTY=true
else
  ok "Working tree clean"
  DIRTY=false
fi

# gh CLI?
if command -v gh &>/dev/null && gh auth status &>/dev/null 2>&1; then
  ok "GitHub CLI authenticated"
else
  warn "GitHub CLI not authenticated (build+upload will be skipped)"
fi

# On main?
BRANCH="$(git branch --show-current)"
if [ "$BRANCH" = "main" ] || [ "$BRANCH" = "master" ]; then
  ok "On branch ${BOLD}$BRANCH${RESET}"
else
  warn "On branch ${BOLD}$BRANCH${RESET} (releases usually ship from main)"
fi

# ── Step 2: Review changes ──────────────────────────────────────────────────

step 2 "Changes since last release"

# Find the previous release boundary
PREV_REF=""
PREV_TAG="$(git describe --tags --abbrev=0 HEAD 2>/dev/null || echo "")"
if [ -n "$PREV_TAG" ]; then
  if [ "$(git rev-parse "$PREV_TAG")" = "$(git rev-parse HEAD)" ]; then
    PREV_TAG="$(git describe --tags --abbrev=0 "$PREV_TAG^" 2>/dev/null || echo "")"
  fi
  PREV_REF="$PREV_TAG"
fi
if [ -z "$PREV_REF" ]; then
  BUMP_COMMITS=()
  while IFS= read -r line; do
    [ -n "$line" ] && BUMP_COMMITS+=("$line")
  done < <(git log --all --format="%H" --grep="^chore.*bump.*version\|^chore.*bump.*desktop")
  PREV_REF="${BUMP_COMMITS[1]:-}"
fi

if [ -z "$PREV_REF" ]; then
  warn "Could not find previous release boundary"
  info "Showing last 10 commits instead"
  echo ""
  git log --oneline -10 | while read -r line; do info "  $line"; done
  COMMIT_COUNT="?"
else
  COMMIT_COUNT="$(git rev-list --count "$PREV_REF..HEAD" 2>/dev/null || echo "?")"
  info "${COMMIT_COUNT} commits since $(git rev-parse --short "$PREV_REF" 2>/dev/null)"
  echo ""

  # Categorize and show a summary
  FEAT_COUNT=0 FIX_COUNT=0 OTHER_COUNT=0
  while IFS= read -r line; do
    [ -z "$line" ] && continue
    msg="${line#* }"
    case "$msg" in
      feat:*|feat\(*) FEAT_COUNT=$((FEAT_COUNT + 1)) ;;
      fix:*|fix\(*)   FIX_COUNT=$((FIX_COUNT + 1)) ;;
      Merge\ *)       ;; # skip
      chore:*|docs:*|ci:*|build:*) ;; # skip
      *)              OTHER_COUNT=$((OTHER_COUNT + 1)) ;;
    esac
  done < <(git log --oneline --no-merges "$PREV_REF..HEAD" 2>/dev/null)

  [ "$FEAT_COUNT" -gt 0 ]  && info "  ${GREEN}$FEAT_COUNT${RESET} features"
  [ "$FIX_COUNT" -gt 0 ]   && info "  ${YELLOW}$FIX_COUNT${RESET} fixes"
  [ "$OTHER_COUNT" -gt 0 ] && info "  ${DIM}$OTHER_COUNT${RESET} other"
fi

echo ""
if ! confirm "Continue with release?"; then bail; fi

# ── Step 3: Version bump ────────────────────────────────────────────────────

step 3 "Version bump"

# Suggest bump type based on commits
SUGGESTED="patch"
if [ "${FEAT_COUNT:-0}" -gt 0 ]; then SUGGESTED="minor"; fi

info "Current version: ${BOLD}v${CURRENT_VERSION}${RESET}"

IFS='.' read -r V_MAJOR V_MINOR V_PATCH <<< "$CURRENT_VERSION"
PATCH_VER="$V_MAJOR.$V_MINOR.$((V_PATCH + 1))"
MINOR_VER="$V_MAJOR.$((V_MINOR + 1)).0"
MAJOR_VER="$((V_MAJOR + 1)).0.0"

echo ""
echo -e "  ${DIM}1)${RESET} patch  → ${BOLD}v${PATCH_VER}${RESET}  ${DIM}(bug fixes only)${RESET}"
echo -e "  ${DIM}2)${RESET} minor  → ${BOLD}v${MINOR_VER}${RESET}  ${DIM}(new features, backward-compatible)${RESET}"
echo -e "  ${DIM}3)${RESET} major  → ${BOLD}v${MAJOR_VER}${RESET}  ${DIM}(breaking changes)${RESET}"
echo -e "  ${DIM}4)${RESET} custom ${DIM}(enter version manually)${RESET}"
echo ""

BUMP_CHOICE="$(ask "Pick version bump" "$SUGGESTED")"

case "$BUMP_CHOICE" in
  1|patch)  BUMP_TYPE="patch"; NEW_VERSION="$PATCH_VER" ;;
  2|minor)  BUMP_TYPE="minor"; NEW_VERSION="$MINOR_VER" ;;
  3|major)  BUMP_TYPE="major"; NEW_VERSION="$MAJOR_VER" ;;
  4|custom)
    CUSTOM_VER="$(ask "Enter version (X.Y.Z)")"
    if [[ ! "$CUSTOM_VER" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
      fail "Invalid version format"; exit 1
    fi
    BUMP_TYPE="custom"; NEW_VERSION="$CUSTOM_VER"
    ;;
  *)
    # Maybe they typed a version directly
    if [[ "$BUMP_CHOICE" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
      BUMP_TYPE="custom"; NEW_VERSION="$BUMP_CHOICE"
    else
      fail "Unknown choice: $BUMP_CHOICE"; exit 1
    fi
    ;;
esac

"$REPO_ROOT/scripts/version-bump.sh" "$NEW_VERSION" >/dev/null
ok "Version bumped: ${BOLD}v${CURRENT_VERSION}${RESET} → ${BOLD}v${NEW_VERSION}${RESET}"

# ── Step 4: Generate changelog ───────────────────────────────────────────────

step 4 "Generate changelog"

if [ -n "$PREV_REF" ]; then
  "$REPO_ROOT/scripts/changelog-generate.sh" "$PREV_REF" HEAD >/dev/null 2>&1
else
  "$REPO_ROOT/scripts/changelog-generate.sh" >/dev/null 2>&1 || true
fi

if [ ! -f "$DRAFT_FILE" ]; then
  warn "No changelog draft generated (no user-facing changes found)"
  echo ""
  if confirm "Write changelog manually?"; then
    # Create a template
    if date '+%-d' &>/dev/null 2>&1; then
      RELEASE_DATE="$(date '+%B %-d, %Y')"
    else
      RELEASE_DATE="$(date '+%B %e, %Y' | sed 's/  / /')"
    fi
    cat > "$DRAFT_FILE" <<EOF
## v${NEW_VERSION} — ${RELEASE_DATE}

### New
-

### Fixed
-
EOF
  else
    warn "Skipping changelog"
  fi
fi

# ── Step 5: Edit changelog ──────────────────────────────────────────────────

step 5 "Review changelog"

if [ -f "$DRAFT_FILE" ]; then
  echo ""
  echo -e "  ${DIM}─── CHANGELOG-DRAFT.md ───${RESET}"
  while IFS= read -r line; do
    echo -e "  ${DIM}│${RESET} $line"
  done < "$DRAFT_FILE"
  echo -e "  ${DIM}──────────────────────────${RESET}"
  echo ""

  EDITOR_CMD="${VISUAL:-${EDITOR:-}}"

  if [ -n "$EDITOR_CMD" ] && confirm "Open in editor ($EDITOR_CMD)?"; then
    "$EDITOR_CMD" "$DRAFT_FILE"
    ok "Changelog edited"
  elif confirm "Edit changelog entries inline? (otherwise keeps as-is)"; then
    # Quick inline edit: let user retype the whole thing
    TEMP_DRAFT="$(mktemp)"
    echo -e "  ${DIM}Enter your changelog below. Press Ctrl-D when done.${RESET}"
    echo -e "  ${DIM}(The ## heading is already written for you)${RESET}"
    echo ""

    if date '+%-d' &>/dev/null 2>&1; then
      RELEASE_DATE="$(date '+%B %-d, %Y')"
    else
      RELEASE_DATE="$(date '+%B %e, %Y' | sed 's/  / /')"
    fi
    echo "## v${NEW_VERSION} — ${RELEASE_DATE}" > "$TEMP_DRAFT"
    echo "" >> "$TEMP_DRAFT"
    cat >> "$TEMP_DRAFT"
    mv "$TEMP_DRAFT" "$DRAFT_FILE"
    echo ""
    ok "Changelog updated"
  else
    ok "Keeping generated changelog as-is"
  fi

  # Finalize: merge into CHANGELOG.md + generate JSON
  "$REPO_ROOT/scripts/changelog-finalize.sh" >/dev/null 2>&1
  ok "Merged into CHANGELOG.md"
  ok "Generated changelogs.json for web"
else
  info "No changelog to review"
fi

# ── Step 6: Commit ──────────────────────────────────────────────────────────

step 6 "Commit release"

echo ""
echo -e "  ${DIM}Files to commit:${RESET}"
git status --short | while read -r line; do info "  $line"; done
echo ""

if confirm "Commit as ${BOLD}chore: release v${NEW_VERSION}${RESET}?"; then
  git add "$DESKTOP_PKG" "$CHANGELOG_FILE" 2>/dev/null || true
  # Also stage the web-side changelogs.json if it was generated (private repo only)
  if [ -f "$REPO_ROOT/apps/web/public/changelogs.json" ]; then
    git add "$REPO_ROOT/apps/web/public/changelogs.json" 2>/dev/null || true
  fi

  git commit -m "chore: release v${NEW_VERSION}" >/dev/null
  ok "Committed"

  # Tag it
  git tag "v${NEW_VERSION}"
  ok "Tagged v${NEW_VERSION}"
else
  warn "Skipped commit (you can commit manually later)"
fi

# ── Step 7: Build & publish ─────────────────────────────────────────────────

step 7 "Build & publish"

echo ""
if confirm "Build and publish to GitHub Releases?"; then
  echo ""
  "$REPO_ROOT/scripts/release.sh" "$NEW_VERSION"
else
  info "Skipped build. When you're ready, run:"
  info "  ${BOLD}pnpm release${RESET}"
fi

# ── Done ─────────────────────────────────────────────────────────────────────

echo ""
echo -e "${BOLD}  Done!${RESET} Vienna ${GREEN}v${NEW_VERSION}${RESET} is ready."
echo ""
echo -e "  ${DIM}Changelog:${RESET}  tryvienna.dev/changelogs"
echo -e "  ${DIM}Release:${RESET}    github.com/hellodrift/vienna-releases/releases/tag/v${NEW_VERSION}"
echo ""
