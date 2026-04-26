# Directory Add/Remove No Longer Resets Workstreams

## What changed
Removing or adding a project directory no longer restarts all workstream agents. Previously, any directory change would kill and restart every active agent in the project, causing conversations to lose context and workstream statuses to churn.

## Setup
1. Have a project with multiple workstreams, at least 3-4 with active conversations (various statuses: `active`, `completed_unviewed`, `needs_review`, `processing`)
2. Note the current status of each workstream and that conversations have history

## Test: Adding a directory does not reset workstreams
1. In the nav sidebar, add a new directory to the project (e.g., any folder on disk)
2. Verify:
   - No workstream agents restart (no spinner/processing flash across workstreams)
   - All workstream statuses remain unchanged
   - All conversation histories remain intact
   - Any actively processing workstream continues working uninterrupted

## Test: Removing a directory does not reset workstreams
1. In the nav sidebar, remove a directory from the project
2. Verify the same as above: no restarts, no status changes, no conversation loss

## Test: Directory changes still cascade to workstreams
1. Add a directory at the project level
2. Open a workstream's settings/directory list
3. Verify the new directory appears as an inherited directory in workstreams
4. Remove the directory at the project level
5. Verify it is removed from workstream directory lists

## Test: New sessions pick up directory changes
1. Add a new directory to the project
2. Clear conversation on one workstream (or create a new workstream)
3. Verify the new agent session includes the newly added directory in its working directories
