# Testing: Workstream Drawer — Open Action & Message Preview

## Prerequisites

- Run the desktop app in dev mode (`pnpm dev`)
- Have at least 2 workstreams with some previously sent messages

## Test Cases

### 1. Workstream entity resolves correctly in drawer

1. In any workstream chat, type a message that references another workstream entity (e.g., via `@` entity palette, select a workstream)
2. Click on the workstream entity chip in the chat

**Expected:**
- The sidebar drawer opens showing the workstream's title, metadata (Created/Updated timestamps)
- The drawer does NOT show "Workstream not found"

### 2. Workstreams appear in entity palette

1. Open the entity palette (type `@` in the chat input, or use Cmd+P)
2. Switch to the "Workstream" tab

**Expected:**
- All workstreams in the current project are listed
- Searching by name filters correctly

### 3. "Open Workstream" button navigates correctly

1. Click on a workstream entity chip to open its drawer
2. Click the "Open Workstream" button

**Expected:**
- The app navigates to that workstream (chat switches)
- The drawer closes automatically

### 4. Recent messages preview is displayed

1. Open a workstream entity drawer for a workstream that has at least 1 user-sent message

**Expected:**
- A "Recent Messages" section appears below the metadata
- Up to 5 recent messages are shown in chronological order (oldest at top)
- Each message shows: a user icon, the message text (truncated to 2 lines), and a relative timestamp
- An arrow icon appears on hover for each message

### 5. Empty state — no messages

1. Create a new workstream with no messages
2. Open its entity drawer from another workstream's chat

**Expected:**
- The "Recent Messages" section is NOT shown (no empty state clutter)

### 6. Click on a message scrolls to it

1. Open a workstream that has many messages (enough to scroll)
2. From a different workstream, open the first workstream's entity drawer
3. Click on one of the recent messages in the preview

**Expected:**
- The app navigates to that workstream
- The chat automatically scrolls to the clicked message
- The message briefly highlights with a ring effect (fades after ~2 seconds)
- The drawer closes

### 7. Click on message without messageId falls back gracefully

1. If a workstream has older messages that may not have a `messageId` in the event payload, click on one of those messages in the preview

**Expected:**
- The app navigates to the workstream (opens it normally)
- No scroll occurs (since there's no message to target)
- No errors or crashes

### 8. Footer actions still work

1. Open a workstream entity drawer
2. Test Pin, Unpin, Archive (with confirmation dialog), and Unarchive buttons

**Expected:**
- Pin/Unpin toggles the workstream's pinned state
- Archive shows a confirmation dialog; confirming archives the workstream
- Unarchive restores an archived workstream
