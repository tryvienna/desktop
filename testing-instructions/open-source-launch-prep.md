# Open-Source Launch Prep

## What changed

Six phased commits on `plugins-open-source` that prepare Vienna for public open-sourcing under Apache 2.0. Deleted `apps/web`, added OSS hygiene files, fixed 4 P0 bugs + 1 maxBuffer bug uncovered while adding tests, built plugin boilerplate infrastructure, expanded docs, and produced launch-prep checklists.

Only a subset of changes produces observable behavior — the rest are docs, metadata, or tests. These instructions cover the testable behaviors.

## Pre-test setup

```bash
cd /Users/will/Documents/dev/vienna/.worktrees/plugins-open-source
pnpm install
```

## Test cases

### 1. Desktop still builds and runs without `apps/web`

- Run `pnpm build` — should succeed across all workspaces
- Run `pnpm dev` — Electron app should launch normally
- Confirm login / feedback features degrade gracefully when `VIENNA_WEB_URL` is unset or unreachable (no crash, just unavailable)
- Confirm setting `VIENNA_WEB_URL=https://some.other.url` is respected: check the value shown in in-app devtools or logs

### 2. `apps/web` is fully excised

- `grep -r "orb.local\|willbrazil\.usa\|@vienna/web" --exclude-dir=node_modules --exclude-dir=.git .` → no hits
- `apps/web/` directory does not exist
- `docker-compose.yml` and `scripts/docker-entrypoint.sh` do not exist

### 3. Shell handler maxBuffer fix (Phase 2 bug)

Previously, output larger than 512KB from `shell.execute` was silently reported as a normal non-zero exit. Now it surfaces as a kill with a descriptive stderr.

Programmatic test:

```bash
pnpm --filter @vienna/desktop exec vitest run src/ipc/shell/handlers.unit.test.ts
# Expected: 24 passed
```

Key case to watch: "truncates output exceeding maxBuffer and reports it" — should report `exitCode: null` and `stderr` containing "Output exceeded 512KB limit".

### 4. Shell `openExternal` URL allow-list

```bash
pnpm --filter @vienna/desktop exec vitest run src/ipc/shell/handlers.unit.test.ts -t "openExternal"
```

- `http://` and `https://` URLs → should call `shell.openExternal`
- `file://`, `javascript:`, `data:`, `vscode:`, `ftp:`, `chrome:`, `about:`, `mailto:`, `tel:` → should throw "Disallowed URL scheme" and NOT call `shell.openExternal`
- Malformed URL (e.g. `"not a url"`) → should throw

### 5. git-utils branch-name validation (argv injection guard)

```bash
cd packages/git-utils && npx vitest run src/branch-validation.test.ts
# Expected: 46 passed
```

Spot-check cases:

- Accepts: `main`, `feat/new-thing`, `fix/issue-123`, `release/v1.2.3`, `user/alice/feature`, `_underscore`, `2026.04.24`
- Rejects (argv smuggling): `--config`, `--upload-pack=evil`, `-C`, `-o`, `--exec`, `--help`
- Rejects (git ref violations): `foo..bar`, `foo/`, `foo.`, `foo.lock`, empty
- Rejects (forbidden chars): spaces, tabs, newlines, `~`, `^`, `:`, `?`, `*`, `[`, `\`, quotes, `$`, `` ` ``, `|`, `;`, `&`, `%`
- Rejects non-ASCII: `café`, emoji, Cyrillic
- Rejects non-strings: `undefined`, `null`, numbers, objects

Live check inside the app: create a workstream with a branch name like `--config` — should fail fast with a clear error before spawning `git worktree add`.

### 6. SessionManager permission-response ordering (Phase 2 P0.1)

This is a behavior fix with no direct UI observable. Sanity check:

- Start an agent that triggers a permission request
- Approve the permission
- Verify the agent proceeds and the tool runs
- No regression in the persistent/session/once scope behavior

No unit test was added for this path (covered by existing integration tests). If any session-level flakiness appears around rapid permission approvals, it's this path.

### 7. WorkstreamManager resume retry (Phase 2 P0.2)

Observable path:

- Kill the Claude CLI (or whichever provider) process mid-session so the next message triggers a "No conversation found with session ID" error
- Vienna should retry without resume (fresh session, context lost, but app doesn't crash)
- Only one retry fires per workstream; subsequent error events while the retry is in flight are silently dropped until it completes

### 8. LspServerInstance orphan cleanup (Phase 2 P0.3)

Harder to reproduce deliberately — requires an LSP server that spawns but fails during the `initialize` handshake.

Code-level check: in `apps/desktop/src/main/lsp/LspServerInstance.ts` `start()`, the catch block now calls `this.process.kill('SIGTERM')` with a 2s SIGKILL fallback before rethrowing.

Manual check:

- Install a language extension that has a broken `initialize` implementation (or temporarily hack one)
- Open a file of that language
- Confirm the LSP fails loudly
- `ps aux | grep <lsp-server-name>` → no orphaned process should linger

### 9. vcli plugin scaffold emits OSS boilerplate

```bash
cd /tmp && mkdir vcli-scaffold-test && cd vcli-scaffold-test
# From the vienna repo root:
cd /Users/will/Documents/dev/vienna/.worktrees/plugins-open-source
pnpm --filter @vienna/vcli build
node packages/vcli/bin/vcli.mjs plugin scaffold \
  --name=testplugin \
  --canvas=drawer \
  --description="test" \
  --output /tmp/vcli-scaffold-test
```

Expected in `/tmp/vcli-scaffold-test/testplugin/`:

- `LICENSE` present with Apache 2.0 text
- `README.md` with placeholder sections
- `CONTRIBUTING.md` pointing at main Vienna repo
- `package.json` contains `"license": "Apache-2.0"`, `"author": "Vienna contributors"`, `"homepage": "https://tryvienna.dev/docs"`

Also run `pnpm --filter @vienna/vcli test` — expected 105/105 passing.

### 10. apply-plugin-boilerplate.sh — idempotent and non-destructive

Create a scratch dir and run twice:

```bash
mkdir -p /tmp/boilerplate-test
echo '{ "name": "myplugin", "version": "0.0.1" }' > /tmp/boilerplate-test/package.json
./scripts/apply-plugin-boilerplate.sh /tmp/boilerplate-test
# Expected: wrote LICENSE, CONTRIBUTING.md, .github/*, README.md, package.json metadata

./scripts/apply-plugin-boilerplate.sh /tmp/boilerplate-test
# Expected second run: [=] exists: LICENSE (etc.) — does not overwrite
```

Verify:

- `/tmp/boilerplate-test/LICENSE` is Apache 2.0 verbatim
- `/tmp/boilerplate-test/README.md` has `{{PLUGIN_NAME}}` replaced with `boilerplate-test`
- `/tmp/boilerplate-test/package.json` now has `license`, `author`, `homepage`, `repository`, `bugs`
- Existing files are NOT overwritten on re-run

Force mode:

```bash
./scripts/apply-plugin-boilerplate.sh /tmp/boilerplate-test --force
# Expected: [+] wrote: (overwrites everything)
```

### 11. Docs site builds and has new pages

```bash
pnpm --filter docs build 2>&1 | tail -20
```

Expected: successful build with no dead links.

Verify in the built output or local dev server (`pnpm --filter docs dev`):

- Nav has: Getting started, Concepts, Features, Plugin Development, Reference, FAQ
- `/getting-started` page loads — 10-min install → first agent tutorial
- `/concepts` page loads — projects, workstreams, scopes, agents, etc.
- `/faq` page loads — permissions, plugins, performance, data/storage, contributing
- Footer shows "Released under the Apache 2.0 License" and "Vienna Contributors" (no "Schrute Labs")
- Home hero reads "Documentation" (not "Plugin Development") with three CTAs: Get started, Build a plugin, GitHub

### 12. All new unit tests pass

```bash
pnpm --filter @vienna/git-utils test -- branch-validation     # 46 passed
pnpm --filter @vienna/agent-permissions test                  # 37+ passed (includes rules.unit.test.ts)
pnpm --filter @vienna/desktop exec vitest run src/ipc/shell/handlers.unit.test.ts  # 24 passed
pnpm --filter @vienna/vcli test                               # 105 passed
```

### 13. package.json metadata sweep

```bash
node -e '
const fs = require("fs");
const { execSync } = require("child_process");
const files = execSync(\'find . -name "package.json" -not -path "./node_modules/*" -not -path "*/node_modules/*"\', { encoding: "utf8" }).trim().split("\n");
for (const f of files) {
  const p = JSON.parse(fs.readFileSync(f, "utf8"));
  const missing = ["license","author","homepage","repository","bugs"].filter(k => !p[k]);
  console.log(`${missing.length ? "✗" : "✓"} ${f}${missing.length ? " — missing: " + missing.join(",") : ""}`);
}
'
```

Expected: all 28 package.json files pass. License on every one should be `"Apache-2.0"`.

### 14. Plugin repos have boilerplate

```bash
for d in \
  /Users/will/Documents/dev/plugins/github-cli/.worktrees/plugins-open-source \
  /Users/will/Documents/dev/vienna-onboarding-plugin/.worktrees/plugins-open-source \
  /Users/will/Documents/dev/watchme-demo/.worktrees/plugins-open-source \
  /Users/will/Documents/dev/plugins/tasks \
  /Users/will/Documents/dev/registry ; do
  echo "=== $d ==="
  ls "$d" | grep -E "LICENSE|CONTRIBUTING|README"
  ls "$d/.github" 2>/dev/null
done
```

Each should list LICENSE + CONTRIBUTING + (`.github/` dir with ISSUE_TEMPLATE + PULL_REQUEST_TEMPLATE, except the registry repo which uses its own simpler setup).

### 15. THIRD_PARTY_NOTICES.md is current

- `cat THIRD_PARTY_NOTICES.md | head -40` — verify the license summary table matches `pnpm licenses list --prod --json | jq 'to_entries[] | [.key, (.value|length)]'`
- Confirm three flagged items are still flagged and present in the list:
  1. `@img/sharp-libvips-darwin-arm64` (LGPL-3.0-or-later)
  2. `@loomhq/electron-click-through-workaround` (UNLICENSED)
  3. `khroma@2.1.0` (Unknown, actually MIT)

## Not tested here

- `apps/web` removal did not break hosted-backend features — those live in a separate private repo; this worktree can't test them
- CI workflows — intentionally deferred; `.github/workflows/ci.yml` does not exist
- Release pipeline signing / notarization — requires Apple certs not present in CI
- Plugin registry schema validation — no validate workflow yet
- Full `gitleaks`/`trufflehog` history scan — working-tree pattern scan was clean; full-history scan is a launch-day gate

## Related commits

- `3dfb69ef` Phase 0 — foundations
- `685dba3b` Phase 1 — metadata + roadmap
- `46c5c195` Phase 2 — P0 bugs + security tests
- `bce5dc4a` Phase 3 — plugin ecosystem boilerplate
- `0572bc70` Phase 4 — architecture, privacy, docs-site expansion
- `ab3ebdbb` Phase 5 — third-party notices + a11y + launch checklist
