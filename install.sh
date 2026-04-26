#!/bin/bash
# Vienna installer — https://tryvienna.dev
# Usage: curl -fsSL https://tryvienna.dev/install.sh | bash
set -euo pipefail

REPO="hellodrift/vienna-releases"
APP_NAME="Vienna"
INSTALL_DIR="/Applications"

# ── Helpers ──────────────────────────────────────────────────────────────────

info()  { printf '\033[1;34m%s\033[0m\n' "$*"; }
ok()    { printf '\033[1;32m%s\033[0m\n' "$*"; }
err()   { printf '\033[1;31mError: %s\033[0m\n' "$*" >&2; exit 1; }

cleanup() {
  if [ -n "${MOUNT_POINT:-}" ] && [ -d "$MOUNT_POINT" ]; then
    hdiutil detach "$MOUNT_POINT" -quiet 2>/dev/null || true
  fi
  if [ -n "${TMP_DIR:-}" ] && [ -d "$TMP_DIR" ]; then
    rm -rf "$TMP_DIR"
  fi
}
trap cleanup EXIT

# Parse a JSON string value for a given key (handles simple cases without jq)
json_val() {
  # Usage: json_val "key" <<< "$json"
  # Extracts the first occurrence of "key": "value"
  python3 -c "
import json, sys
data = json.load(sys.stdin)
print(data.get('$1', ''))" 2>/dev/null
}

# Extract asset info (url<TAB>size_bytes) from the JSON
json_assets() {
  python3 -c "
import json, sys
data = json.load(sys.stdin)
for asset in data.get('assets', []):
    url = asset.get('browser_download_url', '')
    size = asset.get('size', 0)
    if url:
        print(f'{url}\t{size}')" 2>/dev/null
}

fmt_size() {
  python3 -c "
b = int('${1:-0}')
if b >= 1073741824: print(f'{b/1073741824:.1f} GB')
elif b >= 1048576: print(f'{b/1048576:.0f} MB')
elif b >= 1024: print(f'{b/1024:.0f} KB')
else: print(f'{b} B')" 2>/dev/null
}

# ── Platform check ───────────────────────────────────────────────────────────

OS="$(uname -s)"
ARCH="$(uname -m)"

if [ "$OS" != "Darwin" ]; then
  err "This installer only supports macOS. You're running $OS."
fi

case "$ARCH" in
  arm64)  ARCH_LABEL="arm64" ;;
  x86_64) ARCH_LABEL="x64"   ;;
  *)      err "Unsupported architecture: $ARCH" ;;
esac

info "Detected macOS ($ARCH_LABEL)"

# ── Fetch latest release ────────────────────────────────────────────────────

info "Fetching latest release..."

RELEASE_JSON="$(curl -fsSL \
  -H "Accept: application/vnd.github+json" \
  -H "User-Agent: vienna-installer" \
  "https://api.github.com/repos/${REPO}/releases/latest")" \
  || err "Failed to fetch release info from GitHub."

VERSION="$(echo "$RELEASE_JSON" | json_val tag_name)"
[ -n "$VERSION" ] || err "Could not determine latest version."

info "Latest version: $VERSION"

# ── Find the right DMG ──────────────────────────────────────────────────────

ASSETS="$(echo "$RELEASE_JSON" | json_assets)"

if [ "$ARCH_LABEL" = "arm64" ]; then
  ASSET_LINE="$(echo "$ASSETS" | grep -i 'arm64\.dmg' | head -1)"
else
  ASSET_LINE="$(echo "$ASSETS" | grep -i '\.dmg' | grep -vi 'arm64' | head -1)"
fi

DMG_URL="$(echo "$ASSET_LINE" | cut -f1)"
DMG_SIZE="$(echo "$ASSET_LINE" | cut -f2)"

[ -n "$DMG_URL" ] || err "No DMG found for macOS $ARCH_LABEL in release $VERSION."

DMG_NAME="$(basename "$DMG_URL")"
DMG_SIZE_FMT="$(fmt_size "$DMG_SIZE")"
info "Downloading $DMG_NAME ($DMG_SIZE_FMT)..."

# ── Download ─────────────────────────────────────────────────────────────────

TMP_DIR="$(mktemp -d)"
DMG_PATH="$TMP_DIR/$DMG_NAME"

curl -fSL --progress-bar -o "$DMG_PATH" "$DMG_URL" \
  || err "Download failed."

# ── Install ──────────────────────────────────────────────────────────────────

info "Installing $APP_NAME to $INSTALL_DIR..."

MOUNT_OUTPUT="$(hdiutil attach "$DMG_PATH" -nobrowse 2>/dev/null)" \
  || err "Failed to mount DMG."
MOUNT_POINT="$(echo "$MOUNT_OUTPUT" | grep '/Volumes/' | sed 's|.*\(/Volumes/.*\)|\1|' | head -1)"
[ -n "$MOUNT_POINT" ] || err "Could not determine mount point."

# Find the .app inside the mounted volume
APP_PATH="$(find "$MOUNT_POINT" -maxdepth 1 -name '*.app' -print -quit)"
[ -n "$APP_PATH" ] || err "No .app found in DMG."

# Remove existing installation if present
if [ -d "$INSTALL_DIR/$APP_NAME.app" ]; then
  rm -rf "$INSTALL_DIR/$APP_NAME.app"
fi

cp -R "$APP_PATH" "$INSTALL_DIR/" \
  || err "Failed to copy to $INSTALL_DIR. You may need to run with sudo."

# ── Done ─────────────────────────────────────────────────────────────────────

ok ""
ok "  $APP_NAME $VERSION installed successfully!"
ok ""
ok "  Open it from Applications or run:"
ok "    open -a '$APP_NAME'"
ok ""
