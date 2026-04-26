# Testing: GitHub CLI Plugin Rebuild + Inbox Actions

## Prerequisites
- Vienna desktop app running from `plugins-notification-system` branch
- `gh` CLI installed and authenticated (`gh auth status`)
- GitHub CLI plugin loaded in Vienna (check Settings > Plugins)
- A git repo with a GitHub remote (for testing commit/PR detection)

## 1. Commit Detection + Inbox Notification

1. Open a Claude Code CLI session in a GitHub-connected repo
2. Ask Claude to make a small change and commit it (e.g., "add a comment to README and commit")
3. **Expected**: An inbox notification appears: "Commit abc1234 on owner/repo" with the commit message
4. **If the branch has no PR**: The notification should have a "Create PR" button
5. **If the branch already has a PR**: The notification should have an "Update PR" button

## 2. Create PR Action

1. From step 1, click "Create PR" on a commit notification (branch must not already have a PR)
2. **Expected**: Action form appears with:
   - Title field (pre-filled with commit message or humanized branch name)
   - Description field (optional)
   - Header shows "owner/repo -- branch -> main"
3. Fill in title and click Submit
4. **Expected**: Submit button shows a loading spinner while the branch is pushed and PR is created
5. **Expected**: Success result screen appears with animated green checkmark, "PR #N created", and "Open PR" / "Dismiss" buttons
6. Click "Open PR"
7. **Expected**: PR opens in default browser

## 3. PR Created Detection + Inbox Notification

1. Have Claude create a PR (e.g., "create a PR for this branch")
2. **Expected**: Inbox notification: "PR #N created on owner/repo" with branch info
3. **Expected**: Two action buttons: "Open PR" and "Review with Agent"

## 4. Open PR Action

1. Click "Open PR" on a PR notification
2. **Expected**: PR opens in default browser
3. **Expected**: Brief success result screen: "PR #N opened"

## 5. Review with Agent Action

1. Click "Review with Agent" on a PR notification
2. **Expected**: Action form appears with:
   - Project selector (if multiple projects)
   - Model selector (Opus/Sonnet/Haiku, default Sonnet)
3. Select a model and submit
4. **Expected**: Loading spinner while workstream is created
5. **Expected**: Success result: "Review started" with "Open Workstream" / "Dismiss"
6. **Verify**: A new workstream was created with title "Review: PR #N (owner/repo)"
7. **Verify**: The workstream received a review prompt message

## 6. Update PR Action

1. Create a PR first, then have Claude make another commit on the same branch
2. **Expected**: Commit notification appears with "Update PR" button (not "Create PR")
3. Click "Update PR"
4. **Expected**: Opens the existing PR in the browser
5. **Expected**: Success result: "PR #N updated" with commit hash info

## 7. PR Merged Detection

1. Merge a PR via Claude (e.g., "merge PR #N")
2. **Expected**: Inbox notification: "PR #N merged (squash/merge/rebase)" with celebration icon

## 8. Action Form Loading State

1. Trigger any action that involves async work (Create PR is best)
2. **Expected**: After clicking Submit, the button shows a loading spinner
3. **Expected**: The spinner persists until the success/error result screen appears
4. **Expected**: No brief flash of idle state between submit and result

## 9. Plugin Main/Renderer Split

1. Load the app normally
2. **Expected**: No "node:util is not available in the renderer" error
3. **Expected**: Plugin loads successfully in both main and renderer processes
4. Check Event Monitor (Settings > Event Monitor) -- github_cli events should appear in the Registry tab

## 10. Error Handling

1. Try "Create PR" on a branch with no commits ahead of main
2. **Expected**: Error result screen with animated red X and descriptive error message
3. Try "Create PR" when `gh` CLI is not authenticated
4. **Expected**: Error result screen with auth-related error message

## Edge Cases
- Multiple rapid commits should each produce their own inbox notification
- Dismissing a form mid-flow should cancel the action session cleanly
- If the main window is hidden, forms should appear in the floating overlay window
