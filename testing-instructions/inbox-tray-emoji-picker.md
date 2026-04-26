# Inbox Tray Emoji Picker — Testing Instructions

## Overview
Adds a user-configurable emoji for the macOS native status bar (tray) icon, with a red dot notification indicator when there are unread inbox items. The emoji is selected via a picker in the inbox view header.

## Prerequisites
- Branch: `plugins-inbox-icon` (vienna repo)
- Delete `app.db` for your environment if you hit the "duplicate column name: updated_at" migration error
- Start the app normally on macOS

## Test 1: Default Emoji on Startup
1. Clear any previously stored tray emoji: open DevTools console, run `localStorage.removeItem('vienna:tray:emoji')`
2. Restart the app
3. **Expected**: The macOS menu bar shows `😊` as the tray icon

## Test 2: Emoji Picker — Quick Picks
1. Navigate to the Inbox view (click "Inbox" in the sidebar)
2. Click the emoji in the inbox header (should have a dashed border indicating it's interactive)
3. A popover opens with a grid of 24 emoji and a text input
4. Click any emoji in the grid (e.g. `🚀`)
5. **Expected**:
   - The popover closes
   - The inbox header emoji updates to `🚀`
   - The macOS menu bar tray icon updates to `🚀`
   - Refreshing the app preserves the selection

## Test 3: Emoji Picker — Custom Input
1. Open the emoji picker popover
2. Type or paste an emoji into the text field (e.g. `🦄`)
3. Press Enter (or click "Set")
4. **Expected**:
   - The popover closes
   - Both the inbox header and macOS tray update to `🦄`

## Test 4: Emoji Picker — Current Selection Highlight
1. Open the emoji picker popover
2. **Expected**: The currently selected emoji in the grid (if it's one of the 24 quick picks) has a highlighted ring/background

## Test 5: Red Dot Notification Indicator
1. Set an emoji via the picker
2. Push an inbox item via MCP `graphql_execute`:
   ```graphql
   mutation {
     pushInboxItem(input: { title: "Test notification", source: "test" }) {
       inboxItem { id }
     }
   }
   ```
3. **Expected**: The macOS menu bar shows `😊🔴` (emoji + red dot)
4. Mark the item as read or archive it so unread count drops to 0
5. **Expected**: The red dot disappears, showing just the emoji

## Test 6: Persistence Across Sessions
1. Choose a custom emoji
2. Quit and relaunch the app
3. **Expected**: The macOS tray shows the previously chosen emoji (not the default `😊`)

## Test 7: Emoji Picker Discoverability
1. Navigate to the Inbox view
2. **Expected**: The emoji in the header has a visible dashed border, indicating it's clickable — not just a static icon
