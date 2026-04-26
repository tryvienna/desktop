# Focus Monitor System

## Overview
A pluggable focus detection system that polls macOS for the frontmost application and deeply inspects windows/tabs/sessions for iTerm2, Terminal.app, and VS Code.

## Prerequisites
- macOS (AppleScript/JXA required)
- Have at least iTerm2 or Terminal.app open with multiple windows and tabs
- iTerm2 shell integration installed (for CWD/running command detection)

## Test Cases

### 1. Enable/Disable Focus Monitor
1. Open Settings > Advanced
2. Find the "Focus Monitor" section
3. Toggle the switch ON
4. Verify a live preview panel appears showing the currently focused app
5. Toggle the switch OFF
6. Verify the live preview disappears

### 2. Polling Interval
1. Enable the focus monitor
2. Adjust the "Polling Interval" slider
3. Verify the displayed interval value updates (e.g., "2s", "5s")
4. Switch between apps and observe that updates arrive at roughly the configured interval

### 3. iTerm2 Detection
1. Open iTerm2 with multiple windows, each with multiple tabs
2. In different tabs, run different commands (e.g., `sleep 999`, `htop`, leave one idle)
3. Focus iTerm2 and switch to Vienna to view the focus monitor
4. Verify:
   - App name shows "iTerm2"
   - Detector badge shows "iterm2"
   - The "Active" section shows the correct tab title, CWD, and running command
   - The "All Windows & Tabs" tree shows ALL windows and tabs (not just the active one)
   - Only the selected tab in the frontmost window is marked with an "active" badge
   - Tabs in background windows are NOT marked as active
   - Each session shows CWD and running command (requires shell integration)

### 4. Terminal.app Detection
1. Open Terminal.app with multiple windows and/or tabs
2. Focus Terminal.app, then switch to Vienna
3. Verify:
   - App name shows "Terminal"
   - Only the selected tab in the frontmost Terminal window shows as "active"
   - Tabs in other Terminal windows are NOT marked as active
   - Running command (last process) is shown for each tab

### 5. VS Code Detection
1. Open VS Code with a project that has git initialized
2. Open a file, then switch to Vienna
3. Verify:
   - App name shows "Code" (or "Cursor" if using Cursor)
   - File path is extracted from the window title
   - Git branch is shown (if present in the window title)

**Known limitations:** VS Code detection parses the window title string since VS Code has no AppleScript dictionary. This means:
- Custom `window.title` settings in VS Code may break parsing
- Git branch is only detected if VS Code includes `[Git: branch]` in the title
- Workspace name extraction assumes the standard `file - workspace - Visual Studio Code` format

### 6. "Open" Button - Window Activation
1. Have iTerm2 or Terminal.app open with multiple windows
2. Focus a different app, then switch to Vienna
3. In the focus monitor tree, click "Open" on a background window
4. Verify that window comes to the front

### 7. "Open" Button - Tab Activation
1. Have iTerm2 or Terminal.app open with multiple tabs in one window
2. Select a tab that is NOT the active one in the focus monitor tree
3. Click "Open" on that tab
4. Verify the app activates and switches to that specific tab

### 8. Self-Focus Filtering
1. Enable the focus monitor
2. Focus an external app (e.g., iTerm2) - verify it shows in the preview
3. Switch to the Vienna window
4. Verify the preview still shows the PREVIOUS app (iTerm2), NOT Vienna/Electron
5. This is critical for the "Open" buttons to work - the snapshot must persist so you can click "Open"

### 9. Tray Icon
1. Verify the macOS tray/menu bar shows only an emoji icon, NOT the "V" PNG icon
2. If there are unread inbox items, verify the notification dot appears correctly
