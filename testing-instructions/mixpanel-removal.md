# Mixpanel Telemetry Removal

## Overview
Completely strips Mixpanel analytics from the desktop app ahead of open-sourcing. Also removes the now-useless `telemetryEnabled` user setting that was the UI toggle for this telemetry, updates the privacy policy, and cleans up ancillary Mixpanel references in docs/changelogs/demo data. The GTM marketing-site analytics and the separate user-installable `plugins/mixpanel` integration (which talks to Mixpanel's public API) are intentionally not touched.

## Prerequisites
- Checked out on branch `plugins-mixpanel` (PR #500)
- `pnpm install` has been run at the repo root
- A dev build of the desktop app can be launched (`pnpm --filter @vienna/desktop dev` or equivalent)
- `rg` / `grep` available on the command line
- A fresh userData directory is not required; the removed setting is harmless if present in existing `settings.json`

## Test Cases

### 1. No Mixpanel code remains in the repository
1. From the repo root, run:
   ```
   rg -i 'mixpanel|MIXPANEL_TOKEN|__MIXPANEL_TOKEN__|trackPromptSent|createAnalyticsService|AnalyticsService'
   ```
2. Verify zero matches. (The separate `plugins/mixpanel` repo is outside this worktree and is expected to still exist on disk but is not part of this codebase.)

### 2. Dependency and lockfile are clean
1. Run `rg '"mixpanel"' apps/desktop/package.json` → expect zero matches.
2. Run `rg 'mixpanel' pnpm-lock.yaml` → expect zero matches.
3. Run `pnpm install` at the repo root and verify it completes without adding `mixpanel` back.

### 3. Build-time token injection is gone
1. Open `apps/desktop/vite.main.config.ts` and confirm:
   - No `__MIXPANEL_TOKEN__` define entry
   - No hardcoded dev/prod tokens
   - No `isDev`/`isStaging` branching for token selection
2. Build the desktop app (`pnpm --filter @vienna/desktop build`) and then:
   ```
   rg -i 'mixpanel|321450cf6242189bb3c4b66befc2a692|339981ab12a41fa38230901064a105ad' apps/desktop/.vite/
   ```
   Expect zero matches in the built bundle.

### 4. Desktop app boots clean with no analytics init
1. Launch the desktop app in dev (`pnpm --filter @vienna/desktop dev`).
2. Watch the main-process console / logs on startup.
3. Verify there are NO log lines containing any of:
   - `"Mixpanel analytics initialized"`
   - `"Failed to initialize Mixpanel"`
   - `"User identified"` (from the removed analytics wrapper)
   - `"Tracked Prompt Sent"`
   - Any reference to service `"analytics"`
4. Open the app normally and send a prompt in any workstream. Confirm no `trackPromptSent`-style log appears on `user_message`.

### 5. Advanced Settings UI no longer shows "Telemetry"
1. With the app running, open Settings → Advanced.
2. Verify the section shows ONLY these rows (in order):
   - Developer Mode
   - Profiler
   - Focus Monitor (separator above it)
   - Event Registry (separator above it)
   - JSON editor (at the bottom)
3. Confirm the "Telemetry" row with its "Send anonymous usage data…" description is GONE.
4. Toggle "Developer Mode" and "Profiler" to confirm the remaining rows still work end-to-end (optimistic UI update + persisted after reload).

### 6. GraphQL schema no longer exposes `telemetryEnabled`
1. From the repo root, run:
   ```
   rg 'telemetryEnabled' packages/
   ```
2. Verify zero matches.
3. Run `pnpm --filter @vienna/graphql build` → expect clean completion.
4. Start the app in dev mode, open the devtools for the renderer, run a `GetSettings` query in the Apollo tab (or via any screen that issues it), and confirm:
   - The `advanced` object returned does NOT include a `telemetryEnabled` field.
   - No GraphQL validation error is produced.

### 7. Existing settings files don't break the app
1. Before launching, hand-edit your userData `settings.json` so the `advanced` block contains a stale `telemetryEnabled` key:
   ```json
   "advanced": { "developerMode": false, "telemetryEnabled": true, "profilerEnabled": false }
   ```
2. Launch the app.
3. Verify no validation crash and that Settings → Advanced still renders normally. The unknown key should be silently stripped on the next settings write (Zod's default behavior for extra fields).

### 8. Tests pass for changed packages
Run these from the repo root:
```
pnpm --filter @vienna/app-db test
pnpm --filter @vienna/graphql test
```
Both should pass. The updated assertions should no longer reference `telemetryEnabled` and instead use `profilerEnabled` as the representative advanced-setting default.

### 9. Typecheck regression check
1. Build workspace deps: `pnpm -r --parallel build` (or enough of them to satisfy cross-package types).
2. Run `pnpm --filter @vienna/app-db typecheck`, `pnpm --filter @vienna/env typecheck`, and `pnpm --filter @vienna/graphql typecheck` — all three should be clean.
3. Run `pnpm --filter @vienna/desktop typecheck` and compare against the base branch: expect NO new errors. The pre-existing `TS2339: Property 'MIXPANEL_TOKEN' does not exist` in `main.ts` should now be GONE.

### 10. Privacy policy, changelog, and docs are clean
1. Visit `/privacy` on the web app (`pnpm --filter @vienna/web dev`) and verify:
   - The old "Usage data. We may collect anonymous, aggregated usage statistics…" paragraph is gone.
   - A new "No telemetry." paragraph explicitly states the desktop app does not collect usage analytics.
   - The "How We Use Your Information" list no longer mentions "aggregated, anonymized analytics".
2. Run `rg -i 'mixpanel' CHANGELOG.md apps/web/public/changelogs.json` → expect zero matches.
3. Run `rg -i 'mixpanel' skills/plugin-dev/SKILL.md apps/docs/ apps/desktop/src/components/inbox-stories-data.ts` → expect zero matches. Examples should now reference "github" instead.

### 11. Storybook inbox stories still render
1. Start storybook (`pnpm --filter @vienna/desktop storybook`).
2. Navigate to the Inbox stories.
3. Verify story id `'7'` now shows "Plugin \"github\" updated to v2.1.0" (not mixpanel) and renders without errors.

## Expected Behavior Summary
- No network traffic goes to `api.mixpanel.com` at any time, including app boot, login, logout, and sending prompts. Verify with a network monitor (Little Snitch / Charles Proxy) if available.
- The app works identically to the previous build from the user's perspective, minus the "Telemetry" toggle and minus any Mixpanel init logs.
- No schema/zod parse errors on startup, even with stale `telemetryEnabled` in `settings.json`.

## Regression Watchlist
- Authentication flows (login/logout) — the removed block was listening on `authManager.onAuthStateChanged`; make sure login/logout still work end-to-end (no unrelated breakage from removing that listener).
- First-boot deviceId generation — previously stored under `bootSecureStorage.get('analytics', 'deviceId')`. That key is no longer written, but any stale value from a prior install is harmless and ignored.
- GraphQL client regeneration — confirm `pnpm --filter @vienna/graphql codegen` is idempotent: running it twice should produce no diff.
