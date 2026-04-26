# Testing: New Folder / New File Auto-Focus Rename

PR: https://github.com/tryvienna/desktop/pull/452

## Prerequisites

- Run the desktop app in dev mode (`pnpm dev`)
- Have at least one directory added to the project in the sidebar

## Test Cases

### 1. New Folder auto-opens rename dialog

1. Right-click a directory in the sidebar
2. Click **New Folder**

**Expected:**
- A folder named "New Folder" is created
- The rename dialog opens immediately with the name "New Folder" fully selected
- You can type a new name and press Enter to rename it

### 2. New File auto-opens rename dialog

1. Right-click a directory in the sidebar
2. Click **New File**

**Expected:**
- A file named "Untitled" is created
- The rename dialog opens immediately with the name "Untitled" fully selected
- You can type a new name and press Enter to rename it

### 3. Cancel rename keeps default name

1. Right-click a directory → **New Folder** (or **New File**)
2. When the rename dialog appears, press Escape or click Cancel

**Expected:**
- The item keeps its default name ("New Folder" or "Untitled")
- No error occurs

### 4. Name deduplication still works

1. Right-click a directory → **New Folder** twice (cancel or confirm the first rename)
2. Right-click again → **New Folder**

**Expected:**
- Second folder is created as "New Folder 2"
- Rename dialog opens with "New Folder 2" selected

### 5. Root directory context menu

1. Right-click a **root** project directory (top-level) in the sidebar
2. Click **New Folder** or **New File**

**Expected:**
- Same behavior — item is created and rename dialog opens automatically
