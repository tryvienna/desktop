# Fix: Ignore control_response echoes in normalizer

PR: https://github.com/tryvienna/desktop/pull/465

## What changed
Claude Code CLI echoes `control_response` messages back on stdout. The normalizer now silently drops these instead of emitting `schema_validation_error` events.

## How to test

1. **Open a workstream** and send a message that triggers tool use (e.g. ask it to read a file)
2. **Approve a permission** when prompted (manually, not auto-approved)
3. **Check:** No red error banner should appear after approval
4. **Check logs** (`Vienna > profiles > <id> > logs > <session>/vienna.log`) — search for `schema_validation_error`. There should be **no** entries with `"type":"control_response"` in the error message
5. **AskUserQuestion tool:** Send a message that triggers the question tool (e.g. ask agent to make a design decision with options). Answer the questions. Verify no error appears.
6. **Auto-approved tools** (Read, Grep, Glob): These should also not produce control_response errors in logs

## What to look for
- Before this fix: every permission approval caused a `schema_validation_error` event, which triggered workstream status flicker (`processing` -> `completed_unviewed` via error trigger)
- After: permission approvals should be clean with no error events from echoed control responses
