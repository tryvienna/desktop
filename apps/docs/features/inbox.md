---
command-palette-label: Inbox
command-palette-description: Global notification inbox for plugins and Vienna
---

# Inbox

The **inbox** is a global notification center where plugins and core Vienna push actionable items — PR reviews to check, build failures to investigate, entity changes to review, and more. Items support deep linking to entities, multiple action buttons with registered handlers, and rich metadata including icons and descriptions.

## Overview

1. **Items are pushed** — Plugins or Vienna push inbox items via the `pushInboxItem` GraphQL mutation.
2. **Badge appears** — The sidebar shows an "Inbox" button above "Home" with an unread count badge.
3. **Click to view** — Click "Inbox" to open the full-page inbox view, replacing the main content area.
4. **Act on items** — Click action buttons to execute registered handlers, or click entity-linked items to open the entity drawer. Mark items as read or archive them when done.

## Menu bar icon

The inbox header displays an emoji that doubles as the **macOS native status bar (tray) icon**. Click the emoji to open a picker and choose a different one — the selected emoji is persisted across sessions and immediately reflected in the macOS menu bar.

- **Default** — `😊`
- **Quick picks** — A grid of 24 common emoji to choose from
- **Custom input** — Type or paste any emoji into the text field and press Enter or click "Set"
- **Notification indicator** — When there are unread inbox items, a red dot (`🔴`) appears next to the emoji in the macOS menu bar

The preference is stored in `localStorage` via the `trayEmoji` storage registry key and synced to the native tray on app startup via the `system.setTrayLabel` IPC method.

## Pushing inbox items

Push items using the `pushInboxItem` GraphQL mutation. This works from plugins (via `usePluginMutation`) or MCP tools (via `graphql_execute`).

### Minimal example

```graphql
mutation {
  pushInboxItem(input: {
    title: "Build completed successfully"
    description: "main branch — 3m 42s"
  }) {
    inboxItem { id title source createdAt }
  }
}
```

### Full example with all fields

```graphql
mutation {
  pushInboxItem(input: {
    title: "CI build failed on plugins-inbox"
    description: "TypeScript error in mutations.ts — Property does not exist"
    icon: "🔴"
    actions: [
      { id: "view-ci-logs", label: "View CI Logs", payload: { runId: "12345", repo: "vienna" } }
      { id: "retry-build", label: "Retry Build", payload: { runId: "12345" } }
    ]
    entityUri: "@vienna//gh_workflow_run/tryvienna/desktop/12345"
  }) {
    inboxItem {
      id
      title
      description
      icon
      source
      actions { id label payload }
      entityUri
      read
      archived
      createdAt
      updatedAt
    }
  }
}
```

## Input reference — `PushInboxItemInput`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | `String!` | **Yes** | Display title. Max 500 characters. |
| `description` | `String` | No | Longer text shown below the title. Max 5000 characters. |
| `icon` | `String` | No | Emoji character (e.g. `"🔴"`) or raw SVG string. Falls back to a default inbox icon. |
| `actions` | `[InboxActionInput!]` | No | Array of action buttons. See below. |
| `entityUri` | `String` | No | Vienna entity URI for deep linking (e.g. `@vienna//gh_pr/owner/repo/123`). Clicking the item opens the entity drawer. |

> **`source` is automatic.** The `source` field on inbox items is set automatically from the caller identity. Plugins get their plugin ID (e.g. `"github-cli"`), core Vienna gets `"Vienna"`. This cannot be overridden or spoofed — it is not an input field.

### `InboxActionInput`

Each action in the `actions` array defines a button shown on the inbox item.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `String!` | **Yes** | The registered action handler ID. Must match a handler registered via `InboxActionRegistry`. |
| `label` | `String!` | **Yes** | Button label displayed to the user (e.g. `"Approve"`, `"View Logs"`, `"Retry"`). Keep short. |
| `payload` | `JSON` | No | Arbitrary JSON payload passed to the action handler when the button is clicked. |

### Action button display rules

- **0 actions** — No buttons shown. Item may still be clickable via `entityUri`.
- **1 action** — Single primary-colored button.
- **2 actions** — First button is primary-colored, second is secondary/outline style.
- **3+ actions** — First button is primary-colored, remaining actions in an overflow menu (`+N` button).

### Common patterns

**Notification only (no actions):**
```graphql
pushInboxItem(input: {
  title: "Deployment to production succeeded"
  description: "vienna-web v3.14.2 — all health checks passing"
  icon: "🚀"
})
```

**Entity link (click to open in drawer):**
```graphql
pushInboxItem(input: {
  title: "New PR ready for review"
  description: "#142 — Add inbox notification system"
  entityUri: "@vienna//gh_pr/tryvienna/desktop/142"
})
```

**Single action:**
```graphql
pushInboxItem(input: {
  title: "Standup reminder"
  description: "Daily standup starts in 15 minutes"
  icon: "📅"
  actions: [
    { id: "open-standup", label: "Join Standup", payload: { channel: "engineering" } }
  ]
})
```

**Multiple actions:**
```graphql
pushInboxItem(input: {
  title: "Plugin update available: github v2.1.0"
  description: "New entity handlers and bug fixes"
  actions: [
    { id: "upgrade-plugin", label: "Upgrade Now", payload: { pluginId: "github", version: "2.1.0" } }
    { id: "view-changelog", label: "View Changelog" }
    { id: "dismiss-update", label: "Dismiss" }
  ]
})
```

**Entity link + actions (both):**
```graphql
pushInboxItem(input: {
  title: "PR #483 needs your review"
  description: "feat: Inbox system — 12 files changed"
  entityUri: "@vienna//gh_pr/tryvienna/desktop/483"
  actions: [
    { id: "approve-pr", label: "Approve", payload: { prNumber: 483 } }
    { id: "request-changes", label: "Request Changes", payload: { prNumber: 483 } }
  ]
})
```

## Querying the inbox

### List items

```graphql
query {
  inboxItems(includeRead: true, includeArchived: false, limit: 50) {
    id
    title
    description
    icon
    source
    actions { id label payload }
    entityUri
    read
    archived
    createdAt
    updatedAt
  }
}
```

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `includeRead` | `Boolean` | `true` | Include read items in results |
| `includeArchived` | `Boolean` | `false` | Include archived items in results |
| `limit` | `Int` | `100` | Maximum items to return |
| `offset` | `Int` | `0` | Pagination offset |

### Unread count

```graphql
query {
  inboxUnreadCount
}
```

Returns the number of unread, non-archived items. Used by the sidebar badge.

## Managing items

### Mark as read

```graphql
mutation {
  markInboxItemRead(id: "item-id") {
    inboxItem { id read }
  }
}
```

### Mark all read

```graphql
mutation {
  markAllInboxItemsRead {
    count
  }
}
```

### Archive (soft-delete)

```graphql
mutation {
  archiveInboxItem(id: "item-id") {
    inboxItem { id archived }
  }
}
```

### Delete (permanent)

```graphql
mutation {
  deleteInboxItem(id: "item-id") {
    success
  }
}
```

## Action handlers

Plugins and core Vienna register action handlers that execute when a user clicks an action button. Handlers are Zod-schematized async callbacks registered at load time via `InboxActionRegistry`.

### Registering a handler

```typescript
import { z } from 'zod';

inboxActionRegistry.register({
  id: 'deploy.approve',
  schema: z.object({
    env: z.string(),
    version: z.string(),
  }),
  handler: async (payload, ctx) => {
    // payload is validated against the schema before reaching here
    ctx.log.info(`Approving deployment of ${payload.version} to ${payload.env}`);
    // ... perform the action
  },
});
```

### Execution flow

1. A plugin pushes an item with `actions: [{ id: "deploy.approve", label: "Approve", payload: { env: "production", version: "2.1.0" } }]`
2. The user clicks the "Approve" button on the inbox item
3. Vienna calls `executeInboxAction` which:
   - Looks up the handler by `id`
   - Validates the `payload` against the handler's Zod schema
   - Executes the handler with the validated payload and a context object
4. If the action fails, the user sees an error toast

### Executing actions via GraphQL

Actions can also be triggered programmatically:

```graphql
mutation {
  executeInboxAction(actionId: "deploy.approve", payload: { env: "production", version: "2.1.0" }) {
    success
  }
}
```

## Using from MCP

Inbox operations are standard GraphQL mutations, automatically available through the `graphql_execute` MCP tool.

### Discovery

Use `graphql_operations` to find inbox operations:

```
graphql_operations({ query: "pushInboxItem" })
```

This returns the full operation spec including all input fields, nested types, and an example query with variables.

### Pushing a notification

```
graphql_execute({
  query: "mutation($input: PushInboxItemInput!) { pushInboxItem(input: $input) { inboxItem { id title } } }",
  variables: {
    input: {
      title: "Reminder: review auth PR",
      description: "PR #142 has been open for 3 days",
      actions: [
        { id: "open-pr", label: "Open PR", payload: { prNumber: 142 } }
      ]
    }
  }
})
```

### Important notes for MCP agents

- **`actions` is an array of objects.** Each object MUST have `id` (String!) and `label` (String!). `payload` is optional.
- **`source` is NOT an input field.** It is set automatically. Do not include it in the input.
- **`id` on each action must match a registered handler** — if no handler is registered, the button will appear but clicking it will show an error.
- **Keep labels short** — they render as buttons; long labels get truncated.

## Architecture

The inbox is a core Vienna feature (not a plugin) built across several layers:

- **Database** (`packages/app-db`) — `inbox_items` SQLite table with `actions` stored as a JSON array. Prepared-statement repository in `inbox-items.ts`.
- **GraphQL** (`packages/graphql`) — Pothos types, queries, and mutations in `domains/inbox/`. Types: `InboxItem`, `InboxAction`. Input types: `PushInboxItemInput`, `InboxActionInput`.
- **UI** (`apps/desktop`) — Three views: `InboxView` (full-page), `InboxPanelView` (detached sidebar), `TrayInboxView` (tray popover). Sidebar badge via `inboxUnreadCount` query.
- **Tray** (`apps/desktop/src/main/tray.ts`) — Native macOS status bar icon with user-chosen emoji and red dot notification indicator, synced via `system.setTrayLabel` IPC

Items are global (not scoped to a workstream or project) and persist across sessions. The UI polls every 30 seconds for updates.

### Data flow

```
Plugin/MCP → pushInboxItem mutation → GraphQL resolver (auto-sets source) → InboxItemRepository.create() → SQLite
                                                                                                              ↓
UI ← Apollo query (polling) ← GraphQL query resolver ← InboxItemRepository.list() ← ─────────────────────────┘
```
