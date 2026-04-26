# Testing: Plugin Deep Link Install

PR: https://github.com/tryvienna/desktop/pull/451

## Prerequisites

- Run the desktop app in dev mode (`pnpm dev`)
- Have the website running or use the dev callback server URLs directly

## Test Cases

### 1. Install a plugin via deep link (happy path)

1. Open the Explore Plugins drawer in the app
2. Click on any plugin with a GitHub repo (e.g., Vienna Onboarding)
3. Go to the **Overview** tab
4. Copy the **Dev Install Link** shown at the bottom
5. Paste the URL into a browser

**Expected:**
- An AlertDialog appears in the app: "Install [plugin name]?" with the source repo
- Click **Install** — the dialog shows a loading spinner
- After install completes, the dialog closes
- The plugin appears in the Explore Plugins list as "Installed"

### 2. Install an already-installed plugin (override flow)

1. Use the same URL from test 1 (plugin is now installed)
2. Paste it into a browser again

**Expected:**
- The AlertDialog shows: "[plugin name] is already installed. Would you like to reinstall it?"
- The action button says **Override** (not "Install")
- Click **Override** — plugin is reinstalled from scratch
- Click **Cancel** — nothing happens, existing install is untouched

### 3. Cancel an install

1. Trigger a deep link install for any plugin
2. Click **Cancel** in the confirmation dialog

**Expected:**
- Dialog closes, nothing is installed
- No error messages in the app or logs

### 4. Plugin ID mismatch (slug vs canonical ID)

This tests the case where the website slug uses hyphens but the plugin's `definePlugin({ id })` uses underscores.

1. Install a plugin whose slug differs from its canonical ID (e.g., `vienna-onboarding-plugin` slug vs `vienna_onboarding_plugin` definition ID)
2. After install, check the Explore Plugins list

**Expected:**
- Plugin appears once (not duplicated)
- Uninstall works correctly from the store UI

### 5. Dev install link visibility

1. Open Explore Plugins, click on a plugin, go to **Overview** tab
2. Verify the **Dev Install Link** section appears at the bottom (only in dev mode)
3. Click the copy button next to the URL

**Expected:**
- URL is copied to clipboard
- Copy icon briefly changes to a green checkmark
- URL format: `http://localhost:{port}/plugin/install?repo=...&name=...&slug=...`

### 6. Dev install link not shown in production

1. Disable developer mode in Settings > Advanced > Developer Mode
2. Open a plugin's Overview tab

**Expected:**
- No "Dev Install Link" section visible

### 7. Uninstall a deep-link-installed plugin

1. Install a plugin via deep link (test 1)
2. Open the plugin in Explore Plugins
3. Click **Uninstall**

**Expected:**
- Plugin is removed from the list
- No errors in logs
- Plugin can be reinstalled via deep link again

### 8. Store UI reactivity

1. Have the Explore Plugins drawer open
2. In another browser tab, trigger a deep link install

**Expected:**
- The plugin's status in the store list updates to "Installed" without needing to close/reopen the drawer

## Edge Cases

- **Invalid repo URL**: Deep link with a non-existent GitHub repo should show an error in the confirmation dialog after clicking Install
- **Plugin system not ready**: If the deep link fires before plugins are initialized, it should be silently ignored (check logs)
- **No windows open**: If all windows are closed when the deep link fires, the dialog should still appear (uses `dialog.showMessageBox` fallback)
