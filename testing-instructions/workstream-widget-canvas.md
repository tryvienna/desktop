# Workstream Widget Canvas

## What changed
New entity-level UI component `workstreamWidget` that renders at the top of a workstream when an entity implementing it is linked to that workstream. The Linear plugin implements this for `linear_issue` entities as a test case.

## Prerequisites
- Linear plugin installed and connected (OAuth)
- At least one Linear issue accessible

## Test cases

### 1. Widget appears when linking a Linear issue
1. Open or create a workstream
2. Open workstream settings (drawer)
3. Link a Linear issue to the workstream
4. **Expected**: A compact card appears pinned at the top of the workstream (between the title bar and chat), showing the issue identifier, title, status, priority, and assignee

### 2. Widget disappears when unlinking
1. From the same workstream, unlink the Linear issue
2. **Expected**: The widget area disappears (no empty space left behind)

### 3. Multiple widgets stack
1. Link two or more Linear issues to the same workstream
2. **Expected**: Each linked issue gets its own widget card, stacked vertically

### 4. Widget survives workstream switching
1. Link a Linear issue to Workstream A
2. Switch to Workstream B (no linked entities with widgets)
3. **Expected**: No widget area on Workstream B
4. Switch back to Workstream A
5. **Expected**: Widget reappears

### 5. Error isolation
1. If a widget component crashes, it should be caught by PluginErrorBoundary
2. **Expected**: The rest of the app continues working; other widgets still render

### 6. Plugin store shows widget capability
1. Open the plugin store
2. Check the Linear plugin card
3. **Expected**: "Widget" badge appears in the canvas filter/tags if the plugin has entities with workstreamWidget defined

### 7. Non-widget entities don't render
1. Link an entity type that does NOT define a `workstreamWidget` (e.g., a GitHub PR)
2. **Expected**: No widget renders for that entity; widget area only appears if at least one linked entity has a widget
