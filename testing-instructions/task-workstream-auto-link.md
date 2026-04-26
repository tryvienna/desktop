# Task-Workstream Auto-Link & Assignee UX

## Changes
1. Tasks auto-link to workstreams when assigned (create/update)
2. Task drawer assignee UX: searchable Combobox with "Create new workstream" option
3. Fix: entity chip click no longer fails when URI has query params

## Test: Auto-link on task creation

1. Create a new task via the action form
2. Set assignee to "Workstream" and pick an existing workstream
3. Open that workstream's linked entities (settings or sidebar)
4. **Verify** the task appears as a linked entity

## Test: Auto-link on reassignment

1. Open the task drawer for a task already assigned to a workstream
2. Change the workstream to a different one
3. **Verify** the task is unlinked from the old workstream and linked to the new one

## Test: Auto-unlink on unassignment

1. Open a task assigned to a workstream
2. Change assignee type back to "Self" or "Unassigned"
3. **Verify** the task is no longer a linked entity on the old workstream

## Test: Task drawer assignee Combobox

1. Open a task drawer for a task with no workstream assigned
2. Change assignee type to "Workstream"
3. **Verify** a searchable Combobox auto-opens (not a plain dropdown)
4. Type to filter workstreams
5. Select a workstream
6. **Verify** the task is assigned in a single step (no intermediate error)

## Test: Create new workstream from task drawer

1. Open a task drawer, change assignee to "Workstream"
2. In the Combobox, click "Create new workstream..."
3. **Verify** the workstream creation form opens with the task pre-linked as an entity
4. Complete the form and create the workstream
5. **Verify** the task is now assigned to the newly created workstream

## Test: Dismiss Combobox without selecting

1. Open a task drawer, change assignee to "Workstream"
2. When the Combobox opens, press Escape or click outside
3. **Verify** the picker closes cleanly without errors and assignee reverts

## Test: Entity chip click with label

1. Have a workstream agent mention a task in chat (entity chip with label)
2. Click the task entity chip
3. **Verify** the task drawer opens and shows the task details (not "Task not found")
