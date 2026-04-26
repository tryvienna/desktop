# Native Feed Widgets — Testing Instructions

Tests the new native feed widget system (`@vienna//widget/{id}` URIs), including the Workstreams widget and the Tasks widget.

## Prerequisites

- A project with at least a few workstreams in various statuses (processing, waiting_permission, idle, active)
- A project with at least a few tasks in various statuses (todo, in_progress, backlog) and priorities

## 1. Feed Parser — Widget URIs

**Verify that `@vienna//widget/...` URIs are parsed correctly in feed.md.**

1. Open the feed editor drawer (pencil icon on the feed section)
2. Add the line `@vienna//widget/workstreams?sections=needs_action,completed` to feed.md
3. Save (Cmd+S) — the Workstreams widget card should appear in the feed
4. Add `@vienna//widget/tasks?statuses=todo,in_progress` — the Tasks widget card should appear
5. Remove both lines, save — both widgets should disappear from the feed

## 2. Default-On Behavior

### New Users (no feed.md exists)

1. Delete or rename your existing feed.md files (profile-level `~/.vienna/profiles/default/feed.md`)
2. Reload the app
3. The feed should show both the Workstreams widget and Tasks widget by default
4. Open the feed editor — the default template should contain both `@vienna//widget/workstreams` and `@vienna//widget/tasks` lines

### Existing Users (feed.md already exists)

1. Ensure you have an existing feed.md without any `@vienna//widget/` lines
2. Delete the sentinel files: `~/.vienna/profiles/default/.feed-widget-workstreams-migrated` and `.feed-widget-tasks-migrated`
3. Restart the app
4. Open the feed editor — both widget lines should have been prepended to the existing feed.md content
5. The sentinel files should now exist (preventing re-migration)

## 3. Workstreams Widget

1. Ensure the workstreams widget is visible in the feed
2. **Needs Action section**: Workstreams with `waiting_permission`, `needs_review`, or `completed_unviewed` status should appear here
   - `waiting_permission` workstreams should show either "Has question" (blue, HelpCircle icon) or "Needs permission" (amber, ShieldAlert icon) depending on whether the pending tool is AskUserQuestion
3. **Recently Completed section**: Workstreams with `idle` status and recent activity (within 24h) should appear
4. **Click a workstream** — it should navigate to that workstream (set it as the active workstream), NOT open an entity drawer
5. Relative timestamps (e.g., "5m ago", "2h ago") should display correctly

## 4. Tasks Widget

### Display & Filtering

1. The Tasks widget should show a card with header "Tasks", sort dropdown, and filter bar
2. **Default filters**: Should show `todo` + `in_progress` tasks, sorted by priority
3. **Status filter** (multi-select): Toggle statuses on/off. At least one must remain selected
   - Status icons should display next to each option in the dropdown
4. **Priority filter**: Switch between All, Urgent, High, Medium, Low
   - Priority icons should display next to each option
5. **Assignee filter**: Switch between Anyone, Me, Workstream, Unassigned
6. **Due date filter**: Switch between Any date, Overdue, Today, This week, No date
7. **Sort**: Switch between Priority, Created, Updated, Due date
   - Due date sort should put tasks without dates last
8. All filter/sort settings should persist across page reloads (stored in localStorage)

### Task Rows

1. Each task row shows: checkbox, status icon, identifier (e.g., TASK-5), title, priority icon, labels (up to 2), due date
2. Due dates should be color-coded: red for overdue, amber for within 2 days, muted for future
3. Due date text: "2d overdue", "Today", "Tomorrow", "3d", etc.
4. Labels render as small colored badges

### Expand/Collapse

1. If more than 5 tasks match filters, a "View more (N)" button should appear
2. Clicking it expands to show all tasks
3. "Show less" collapses back to 5

### Click to Open

1. Click a task title — it should open the TaskDrawer (entity drawer) for that task
2. The task's full details should be visible in the drawer

### Launch Agents Flow

1. Select 1-3 tasks using checkboxes
2. A CTA bar should appear at the bottom with "Launch agents" button and count badge
3. Click "Launch agents":
   - Button should show "Launching agents..." with spinner
   - Then "Messaging agents..." with spinner
   - Then green "Launched" with check animation
   - After ~2.5s, CTA bar disappears
4. **Verify workstream creation**: Each selected task should now have a corresponding workstream
   - Workstream title: `{identifier} {title}` (e.g., "TASK-5 Fix login bug")
   - Workstream group: "Tasks"
   - Worktrees should be created
   - Branch name derived from identifier + title
5. **Verify task assignment**: Each launched task should now have:
   - `assigneeType` set to `workstream`
   - `assigneeWorkstreamId` pointing to the created workstream
   - If status was `todo` or `backlog`, it should be promoted to `in_progress`
6. **Verify entity linking**: The workstream should show the task as a linked entity

## 5. Feed Widgets Toggle Drawer

1. Open the feed editor drawer, click "Widgets" button (Blocks icon)
2. Two sections should appear: "Built-in" and "Plugins"
3. **Built-in section**: Should list "Workstreams" and "Tasks" with toggle switches
4. Toggle "Workstreams" OFF — the widget line should be removed from feed.md, widget disappears from feed
5. Toggle it back ON — the line is re-added with default params, widget reappears
6. Same for "Tasks"
7. **Plugins section**: Should list any installed plugin feed canvases (if any)

## 6. Edge Cases

1. **No project selected**: Tasks widget should not render (returns null)
2. **No tasks exist**: Tasks widget should show "No tasks found" message
3. **No workstreams need action**: Workstreams widget should show "Nothing needs your attention right now."
4. **Rapid filter changes**: Switching filters quickly should not cause stale data or crashes
5. **Launch with no project**: Should gracefully no-op
