# Tasks Core Entity Migration

## Overview
Tasks have been migrated from a plugin to a first-class core entity with SQLite storage, full GraphQL CRUD, sidebar navigation, entity drawer, and MCP support.

## Prerequisites
- Fresh database (or one that will auto-migrate to version 24)
- At least one project created

## 1. Task Creation (Action Form)

1. Click the **+** button on the Tasks section in the sidebar (or use the new task action)
2. Walk through the form steps:
   - **Title**: Type a task title, press Enter
   - **Status**: Select a status (backlog/todo/in_progress/done/canceled), press Enter
   - **Priority**: Select priority, press Enter
   - **Labels**: Multi-select step — use **Space** to toggle labels, **Enter** to continue
   - **Assignee**: Select "Self", "Workstream", or skip
   - **Workstream** (conditional): Only appears when "Workstream" is selected as assignee. Pick an existing workstream or select "Create new workstream..." to chain into workstream creation
   - **Review**: Confirm and submit
3. Verify the task appears in the sidebar nav section

### Workstream Chaining
1. Create a task, select "Workstream" as assignee
2. Select "Create new workstream..."
3. Verify the workstream creation form appears with a recap of the task
4. Complete workstream creation
5. Verify the task is now assigned to the new workstream

## 2. Task Drawer

1. Click a task in the sidebar to open the entity drawer
2. Verify all fields are editable:
   - **Title**: Click to edit inline
   - **Status**: Dropdown selector
   - **Priority**: Dropdown selector
   - **Assignee**: Dropdown (None/Self/Workstream). When "Workstream" is selected, a second dropdown appears below to pick which workstream
   - **Due date**: Date input
   - **Labels**: Click labels to toggle, shows available labels from project
   - **Description**: Markdown textarea
3. Verify changes persist (close and reopen the drawer)

### Workstream Header Action
1. Open a task drawer
2. Look for the workstream link icon in the header area
3. Verify you can link the task to a workstream's context from the header

### Related Entities
1. In the task drawer, find the "Related Entities" section
2. Click the **+** button to open the entity search dialog
3. Search for and select an entity to link
4. Verify the linked entity appears in the list
5. Verify you can remove linked entities

## 3. Sidebar Nav Section

### Display Settings
1. Click the **gear icon** on the Tasks section header to open Task Settings
2. **Status filter**: Toggle which statuses appear (at least one must remain)
3. **Group by**: Try None, Status, Priority, Label, Assignee — verify grouping changes in sidebar
4. **Sort by**: Try Date created, Last updated, Priority, Due date
5. **Task limit**: Change the limit (10/20/50/100)
6. **Reset to defaults**: Verify it resets all settings
7. Close and reopen — verify settings persist

### Label Management (in Settings)
1. In Task Settings, scroll to Labels section
2. Click **+** to create a new label with name and color
3. Verify the label appears in the list
4. Hover a label and click the trash icon to delete
5. Verify deleted labels are removed from tasks that had them

## 4. MCP / GraphQL Operations

Test via a workstream agent or direct GraphQL:

### Create a label, then a task with that label
```graphql
mutation { createTaskLabel(projectId: "<projectId>", name: "bug", color: "#EF4444") { label { id name color } } }
```
```graphql
mutation { createTask(input: { projectId: "<projectId>", title: "Fix crash", labelIds: ["<labelId>"] }) { task { id identifier title labels { name } } } }
```
Verify the task has the label assigned.

### Update task labels
```graphql
mutation { updateTask(id: "<taskId>", input: { labelIds: ["<label1>", "<label2>"] }) { task { id labels { id name } } } }
```
Verify labels are replaced (not appended).

### Clear all labels from a task
```graphql
mutation { updateTask(id: "<taskId>", input: { labelIds: [] }) { task { id labels { id } } } }
```
Verify labels array is empty.

### Filter tasks by label
```graphql
query { tasks(projectId: "<projectId>", labelId: "<labelId>") { id title labels { name } } }
```

### Filter for top-level tasks only
```graphql
query { tasks(projectId: "<projectId>", parentId: null) { id title parentId } }
```
Verify only tasks without a parent are returned.

### Delete a task
```graphql
mutation { deleteTask(id: "<taskId>") { success } }
```

## 5. Edge Cases

- Create a task with all fields populated, then clear nullable fields (description, dueDate, assignee) — verify they actually clear
- Create subtasks (set parentId) and verify they appear under the parent's subtasks field
- Delete a parent task — verify subtasks are cascade-deleted
- Try the multi-select label step with no labels created yet — should show empty and allow skipping
