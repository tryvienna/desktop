# Fork Workstream at Any Message

## What changed
Users can fork a workstream at any message point, creating a new independent workstream with conversation context up to that message. Also supports programmatic forking via GraphQL (MCP-discoverable).

## Prerequisites
- Running Vienna desktop app (dev build)
- At least one workstream with a multi-turn conversation (2+ user messages and assistant responses)

## Test 1: Fork via UI (fork at specific message)

1. Open a workstream with an existing conversation (at least 3-4 message exchanges)
2. Hover over an assistant message in the middle of the conversation
3. Verify a fork icon (git branch) appears below the message
4. Click the fork icon
5. Verify an ActionFormBar appears with:
   - Title field pre-filled with "Fork of {original title}"
   - Worktree mode selector (share existing / create new)
6. Submit the form
7. Verify:
   - A new workstream is created in the same group
   - You are navigated to the new workstream
   - The new workstream shows messages only up to and including the forked message (nothing after)
   - The original workstream is unaffected (still has all messages)

## Test 2: Fork at a user message

1. Repeat Test 1 but click the fork icon on a **user** message instead of an assistant message
2. Verify the fork includes messages up to and including that user message

## Test 3: Fork preserves Claude Code session context

1. Fork a workstream at some message
2. In the new forked workstream, send a follow-up message that references earlier conversation context
3. Verify Claude Code responds with awareness of the conversation history (it should know what was discussed before the fork point)

## Test 4: Fork with new worktrees

1. Fork a workstream that has branch selections / worktrees
2. In the ActionFormBar, select "Create new worktrees"
3. Verify new worktrees are created with a `fork-{id}` branch name
4. Verify the forked workstream uses the new worktrees

## Test 5: Fork with shared worktrees

1. Fork a workstream that has branch selections / worktrees
2. In the ActionFormBar, select "Share existing worktrees"
3. Verify the forked workstream shares the same branch selections as the source

## Test 6: Programmatic fork via MCP (full conversation)

1. In a workstream with MCP entity tools, run:
   ```
   graphql_operations query="fork workstream"
   ```
2. Verify `forkWorkstream` mutation appears with optional `messageId` and `providerUuid`
3. Execute a fork without `messageId` or `providerUuid` (only `sourceWorkstreamId`):
   ```graphql
   mutation {
     forkWorkstream(input: {
       sourceWorkstreamId: "<some-workstream-id>"
       title: "Programmatic Fork"
     }) {
       workstream { id title }
     }
   }
   ```
4. Verify a new workstream is created with the **entire** conversation copied

## Test 7: Fork button not shown during streaming

1. Send a message to a workstream
2. While the assistant is streaming a response, verify the fork icon does NOT appear on the streaming message
3. After streaming completes, verify the fork icon appears

## Edge cases to verify

- **Workstream with no session**: Forking should still create the workstream (just without provider history)
- **Multiple forks from same source**: Each fork should be independent with unique session IDs
- **Fork of a fork**: Should work normally, forking the forked conversation
