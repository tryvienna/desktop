# Inbox System — Testing Instructions

## Overview
Core inbox feature allowing plugins and Vienna to push notification/action items to a global inbox. Includes a full-page inbox view, unread badge in sidebar, and action handler registry.

## Prerequisites
- Branch: `plugins-inbox` (vienna repo)
- Run `pnpm install && pnpm --filter @vienna/app-db run build && pnpm --filter @vienna/graphql run codegen`
- Start the app normally

## Test 1: Database Migration
1. Start the app (the migration v27 runs automatically)
2. Use the MCP `graphql_execute` tool
3. Run: `query { inboxUnreadCount }`
4. **Expected**: Returns `{ "inboxUnreadCount": 0 }` (no errors)

## Test 2: Push an Inbox Item via GraphQL
1. Execute the following mutation:
   ```graphql
   mutation {
     pushInboxItem(input: {
       title: "Test notification"
       description: "This is a test inbox item"
       source: "core"
     }) {
       inboxItem { id title description read archived createdAt }
     }
   }
   ```
2. **Expected**: Returns the created inbox item with `read: false`, `archived: false`
3. Run `query { inboxUnreadCount }` — **Expected**: Returns `1`

## Test 3: Sidebar Inbox Button & Unread Badge
1. After pushing an item (Test 2), look at the navigation sidebar
2. **Expected**: "Inbox" button appears above "Home" with a badge showing "1"
3. Push more items — badge should update (polls every 30s, or refresh the app)

## Test 4: Inbox View
1. Click the "Inbox" button in the sidebar
2. **Expected**: Main content area switches to the Inbox view (replaces the chat/home view)
3. **Expected**: Shows the pushed items in reverse chronological order
4. **Expected**: Unread items have a blue dot indicator and slightly highlighted background
5. **Expected**: Each item shows title, description preview, source label, relative timestamp

## Test 5: Mark as Read
1. In the Inbox view, hover over an unread item
2. Click the checkmark button that appears on hover
3. **Expected**: Blue dot disappears, item no longer highlighted
4. **Expected**: Unread count in sidebar badge decreases

## Test 6: Mark All Read
1. Push several unread items
2. In the Inbox view header, click "Mark all read"
3. **Expected**: All items lose their unread indicator
4. **Expected**: Sidebar badge disappears (count goes to 0)

## Test 7: Archive
1. Hover over an inbox item
2. Click the archive button (box icon)
3. **Expected**: Item disappears from the list
4. **Expected**: Archived items don't appear by default

## Test 8: Entity Deep Linking
1. Push an item with an entityUri:
   ```graphql
   mutation {
     pushInboxItem(input: {
       title: "Check this PR"
       entityUri: "@vienna//gh_pr/owner/repo/123"
       source: "github_cli"
     }) {
       inboxItem { id }
     }
   }
   ```
2. Click the item in the Inbox view
3. **Expected**: Entity drawer opens for the referenced entity (or shows error if entity doesn't exist)
4. **Expected**: Item is marked as read on click

## Test 9: Action Execution
1. Push an item with an actionId:
   ```graphql
   mutation {
     pushInboxItem(input: {
       title: "Action item"
       actionId: "test.action"
       actionPayload: { "key": "value" }
     }) {
       inboxItem { id }
     }
   }
   ```
2. Click the item — **Expected**: Executes the `executeInboxAction` mutation
3. If no handler is registered for "test.action", **Expected**: Error (logged, not crash)

## Test 10: Navigation Between Views
1. Click "Inbox" in sidebar — inbox view shows
2. Click "Home" — home/chat empty state shows
3. Select a workstream — workstream chat shows
4. Click "Inbox" again — inbox view shows
5. **Expected**: All transitions work smoothly, no stale state

## Test 11: Empty State
1. Archive or delete all inbox items
2. **Expected**: Empty state with "No inbox items" message and description text

## Test 12: List Query with Filters
1. Push several items, mark some read, archive some
2. Query with filters:
   ```graphql
   query { inboxItems(includeRead: false) { id title read } }
   ```
   **Expected**: Only unread items returned
3. Query:
   ```graphql
   query { inboxItems(includeArchived: true) { id title archived } }
   ```
   **Expected**: Archived items included in results

## Edge Cases
- Push item with very long title (500 chars) — should truncate in UI
- Push item with no optional fields (just title) — should render cleanly
- Rapid push of many items — list should handle scrolling
- Switch projects — inbox is global, items persist across projects
