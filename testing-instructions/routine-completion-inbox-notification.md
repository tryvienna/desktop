# Routine Completion Inbox Notification — Testing Instructions

## Overview
When a routine completes (success or failure), an inbox notification is pushed with the routine name, a truncated description, and an "Open" CTA button that navigates directly to the routine's workstream.

## Prerequisites
- Branch: `plugins-routine-notif` (vienna repo)
- Run `pnpm install && pnpm --filter @vienna/app-db run build && pnpm --filter @vienna/graphql run codegen`
- Start the app normally
- Have at least one routine created (or create one for testing)

## Test 1: Migration v29 — cta_label column
1. Start the app (migrations run automatically on startup)
2. Execute via GraphQL:
   ```graphql
   query { inboxUnreadCount }
   ```
3. **Expected**: Returns successfully with no migration errors in the console

## Test 2: Successful routine pushes inbox notification
1. Create a routine with a simple prompt (e.g., "Say hello") on a short interval or use `runRoutineNow`
2. Wait for the routine to complete (watch for `turn_end` in logs)
3. Check the inbox (click "Inbox" in sidebar)
4. **Expected**: A new inbox item appears with:
   - Title: `Routine "<name>" completed`
   - Description: First ~120 chars of the routine prompt, truncated with ellipsis if longer
   - Icon: checkmark emoji
   - Source: `core`
   - An "Open" button visible on the right side of the row

## Test 3: Failed routine pushes inbox notification
1. Create a routine that will fail (e.g., a prompt that triggers an error, or stop the agent mid-run)
2. Wait for the failure event
3. Check the inbox
4. **Expected**: A new inbox item appears with:
   - Title: `Routine "<name>" failed`
   - Description: Truncated error message (or fallback text)
   - Icon: red X emoji
   - "Open" button present

## Test 4: CTA "Open" button navigates to workstream
1. From Test 2 or 3, find the routine completion notification in the inbox
2. Click the "Open" button (not the row itself)
3. **Expected**: The app navigates to the routine's dedicated workstream, showing the conversation/output from the run. The inbox view is replaced by the workstream chat view.

## Test 5: Row click only marks as read (does not navigate)
1. Find an unread routine notification (blue dot visible)
2. Click the notification row body (not the "Open" button)
3. **Expected**: The item is marked as read (blue dot disappears), but the view does NOT navigate away from the inbox

## Test 6: CTA button also marks as read
1. Find an unread routine notification
2. Click the "Open" CTA button
3. Navigate back to inbox
4. **Expected**: The item is now marked as read

## Test 7: CTA field in GraphQL pushInboxItem mutation
1. Push an inbox item with a custom CTA label:
   ```graphql
   mutation {
     pushInboxItem(input: {
       title: "Custom CTA test"
       description: "Testing custom CTA label"
       source: "core"
       ctaLabel: "View Details"
       entityUri: "@vienna//workstream/<some-workstream-id>"
     }) {
       inboxItem { id title ctaLabel }
     }
   }
   ```
2. **Expected**: The item appears in the inbox with a "View Details" button instead of the default actions

## Test 8: Inbox items without CTA retain original behavior
1. Push an inbox item without a `ctaLabel`:
   ```graphql
   mutation {
     pushInboxItem(input: {
       title: "No CTA test"
       source: "core"
       entityUri: "@vienna//workstream/<some-workstream-id>"
     }) {
       inboxItem { id title }
     }
   }
   ```
2. Click the row
3. **Expected**: Clicking the row itself opens the entity drawer (original behavior preserved)

## Test 9: Archive and mark-read buttons still work
1. Hover over a routine completion notification
2. Verify the archive (box icon) and mark-as-read (checkmark) buttons appear alongside the "Open" CTA
3. Click archive
4. **Expected**: Item disappears from the inbox list
