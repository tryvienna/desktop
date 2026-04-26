# Testing: Up Arrow Message History Across Workstreams

## Prerequisites

- Run the desktop app in dev mode (`pnpm dev`)
- Have at least 2 workstreams with some previously sent messages in each

## Test Cases

### 1. Up-arrow shows previous messages after workstream switch

1. Open **Workstream A** and send a few messages (e.g., "hello from A", "another from A")
2. Switch to **Workstream B** and send a few messages (e.g., "hello from B")
3. Switch back to **Workstream A**
4. Press the **Up Arrow** key in the chat input

**Expected:**
- The input populates with "another from A" (most recent message from Workstream A)
- Pressing Up again shows "hello from A"
- Messages from Workstream B do not appear

### 2. Up-arrow shows previous messages for Workstream B

1. From the state after Test 1, switch to **Workstream B**
2. Press **Up Arrow** in the chat input

**Expected:**
- The input populates with "hello from B"
- Messages from Workstream A do not appear

### 3. Newly sent messages appear in history immediately

1. Open any workstream
2. Send a message: "test message"
3. Press **Up Arrow**

**Expected:**
- The input shows "test message"
- Pressing Up again shows the previous message from the database

### 4. Preemptive loading of older messages

1. Open a workstream that has more than 10 previously sent user messages
2. Press **Up Arrow** repeatedly to navigate through history

**Expected:**
- The first 10 messages load immediately
- As you approach the 7th-8th message (near the end of the initial batch), more messages seamlessly load
- Navigation continues without any pause or stutter
- You can navigate all the way back through the full history

### 5. Draft preservation during history navigation

1. Start typing a message in the input (e.g., "my draft text") but do NOT submit it
2. Press **Up Arrow** to enter history mode
3. Press **Down Arrow** until you return past the newest message

**Expected:**
- "my draft text" is restored in the input exactly as you left it

### 6. Empty workstream has no history

1. Create a new workstream (no messages sent yet)
2. Press **Up Arrow** in the chat input

**Expected:**
- Nothing happens (no error, input stays empty)

### 7. History persists across app restarts

1. Open a workstream and note the most recent message you sent
2. Quit and restart the app
3. Open the same workstream and press **Up Arrow**

**Expected:**
- The history loads from the database and shows your previous messages

## Unit Tests

Run the automated test suites to verify the implementation:

```bash
# EventRepository tests (12 tests)
pnpm --filter @vienna/agent-db exec vitest run src/__tests__/user-message-history.unit.test.ts

# useMessageHistory hook tests (22 tests)
pnpm --filter @vienna/chat-ui exec vitest run src/hooks/__tests__/use-message-history.unit.test.ts
```

Both suites should pass with all tests green.
