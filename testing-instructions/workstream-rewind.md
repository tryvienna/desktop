# Workstream Conversation Rewind

**Branch:** `linear-tasks-rewind`

## What changed

Added the ability to rewind a workstream conversation to any previous user or assistant message. This restores files on disk to their state at that checkpoint (via Claude CLI's `--rewind-files`) and truncates the conversation so Claude forgets everything after the rewind point. A rewind context summary is injected into the next session so Claude retains awareness of what happened before.

Key changes:
- Checkpoint events captured from CLI's echoed user messages (UUID + session ID)
- File rewind via one-shot `claude --print --resume <sid> --rewind-files <uuid>`
- DB event deletion after the rewind point
- Rewind context persisted as a DB event, consumed on next agent start
- "Rewind to here" button on user and assistant messages (hover to reveal)
- Smooth fade-out animation instead of full conversation reload

## How to test

### Basic rewind (user message)

1. Open the desktop app and start a workstream
2. Send 3-4 messages, including at least one that causes file edits (e.g., "create a file called test.txt with hello world")
3. Hover over the 2nd user message — a "Rewind to here" button (↺ icon) should appear
4. Click it — a confirmation prompt ("Rewind to here?") should appear with Confirm/Cancel
5. Click Confirm — a "Rewinding..." spinner should show
6. Messages after the 2nd message should **fade out smoothly** (not flash/flicker)
7. After fade completes, only messages up to and including the 2nd message remain
8. Verify the file edit was reverted on disk (e.g., test.txt should no longer exist if it was created after the rewind point)
9. Send a new message — Claude should not know about anything that happened after the rewind point, but should have context of what happened before

### Rewind to assistant message

1. In a workstream with several exchanges, hover over a **completed assistant message**
2. The rewind button should appear (it should NOT appear on streaming/in-progress messages)
3. Click rewind and confirm
4. The conversation should rewind to include that assistant response, removing everything after it

### Edge cases

1. **Rewind while agent is busy**: Start a long task, then try to rewind — the mutation should reject with an error (agent must be idle)
2. **Multiple rewinds**: Rewind once, send a new message, then rewind again to an earlier point — should work correctly each time
3. **No checkpoint available**: For messages sent before this feature was deployed, rewinding should still truncate the conversation (but files won't be reverted since no checkpoint exists). A warning is logged.
4. **App restart after rewind**: Rewind, then quit and reopen the app. The next message should still have rewind context injected (it's persisted in the DB, not in-memory).

### What to watch for

- No flicker or flash-to-empty when rewind completes
- The fade-out animation should be smooth (~500ms)
- The rewind button should only appear on hover, not permanently visible
- After rewind, the "Rewinding..." state on the button should reset if you scroll back to it
- File changes should be actually reverted on disk, not just removed from the UI
