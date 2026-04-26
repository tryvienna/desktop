# Testing: In-App Update Checker & Release Notes Drawer

## Prerequisites

- Run the desktop app in dev mode with the version override:
  ```
  VIENNA_DEV_VERSION=0.0.1 pnpm dev
  ```
  This makes the app think it's on v0.0.1, so any release appears as an update.

## Test Cases

### 1. Check for Updates button (Settings > About)

1. Open the app with `VIENNA_DEV_VERSION=0.0.1 pnpm dev`
2. Go to **Settings > About**
3. Click **Check for Updates**

**Expected:**
- Button shows "Checking..." while the request is in progress
- Button transforms into **"New Version Available (v99.0.0)"** with brand-colored styling and an arrow icon
- Clicking the button again opens the Release Notes drawer

### 2. Check for Updates when already on latest

1. Open the app normally with `pnpm dev` (no env override)
2. Go to **Settings > About**
3. Click **Check for Updates**

**Expected:**
- Button shows "Checking..." briefly
- Text appears next to button: "You're on the latest version."

### 3. Release Notes drawer content

1. Open the app with `VIENNA_DEV_VERSION=0.0.1 pnpm dev`
2. Trigger the drawer via Settings > About > Check for Updates > click "New Version Available"

**Expected:**
- Drawer opens with title "What's New in v99.0.0"
- Published date is shown below the title
- Markdown release notes render with sections: New, Improved, Fixed
- An image is visible (Unsplash photo)
- A video element is present (may or may not play depending on network — uses tryvienna.dev hosted video)
- Footer has "Not Now" and "Update" buttons

### 4. Release Notes drawer — "Not Now" button

1. Open the Release Notes drawer (see test 3)
2. Click **Not Now**

**Expected:**
- Drawer closes

### 5. Release Notes drawer — "Update" button

1. Open the Release Notes drawer (see test 3)
2. Click **Update**

**Expected:**
- Button text changes to "Downloading..."
- After download completes, footer shows "Opening installer..."
- macOS opens/mounts the downloaded DMG file
- (Note: in dev mode with mock data, this downloads the real v0.0.16 DMG from GitHub Releases)

### 6. Update Available button in sidebar footer

1. Open the app with `VIENNA_DEV_VERSION=0.0.1 pnpm dev`
2. Wait ~30 seconds for the background update check to complete

**Expected:**
- An **"Update Available"** button appears in the sidebar footer (between Feedback and Settings)
- Button has an ArrowUpCircle icon with a pulsing dot indicator
- Button text is brand-colored
- Clicking it opens the Release Notes drawer

### 7. No update button in sidebar when on latest

1. Open the app normally with `pnpm dev` (no env override)
2. Wait 30+ seconds

**Expected:**
- No "Update Available" button appears in the sidebar footer
- Footer shows only: Explore Plugins, Feedback, Settings (unchanged)

### 8. Network failure handling

1. Disconnect from the internet
2. Open the app with `pnpm dev`
3. Go to Settings > About and click **Check for Updates**

**Expected:**
- Button shows "Checking..." briefly
- Text appears: "Failed to check for updates."
- No crash or unhandled error
- Sidebar footer does not show an Update button
