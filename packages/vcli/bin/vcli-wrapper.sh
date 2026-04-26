#!/bin/bash
# Vienna CLI wrapper — resolves the bundled vcli and runs it with the system Node.js.
# This script is symlinked into /usr/local/bin/vcli by "Install vcli command" in Vienna.

set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
VCLI_INDEX="$DIR/index.cjs"

if [ ! -f "$VCLI_INDEX" ]; then
  echo "Error: vcli bundle not found at $VCLI_INDEX" >&2
  echo "Try reinstalling Vienna or running 'Install vcli command' from the app." >&2
  exit 1
fi

# Find node binary — check PATH first, then common install locations
find_node() {
  if command -v node >/dev/null 2>&1; then
    command -v node
    return
  fi

  for candidate in \
    /usr/local/bin/node \
    /opt/homebrew/bin/node \
    "$HOME/.volta/bin/node" \
    "$HOME/.local/share/fnm/aliases/default/bin/node"; do
    if [ -x "$candidate" ]; then
      echo "$candidate"
      return
    fi
  done

  # Try NVM default — only if the alias is a bare semver (e.g. "22.21.1").
  # Indirect aliases like "lts/*" or "lts/iron" require NVM's init script
  # which won't be sourced here; those are handled by `command -v node` above.
  NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  if [ -f "$NVM_DIR/alias/default" ]; then
    version=$(cat "$NVM_DIR/alias/default")
    if echo "$version" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+$'; then
      nvm_node="$NVM_DIR/versions/node/v$version/bin/node"
      if [ -x "$nvm_node" ]; then
        echo "$nvm_node"
        return
      fi
    fi
  fi

  echo ""
}

NODE_BIN=$(find_node)

if [ -z "$NODE_BIN" ]; then
  echo "Error: Node.js not found. vcli requires Node.js >= 22." >&2
  echo "Install Node.js from https://nodejs.org or via a version manager (nvm, fnm, volta)." >&2
  exit 1
fi

exec "$NODE_BIN" "$VCLI_INDEX" "$@"
