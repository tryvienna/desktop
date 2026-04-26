# Vienna Codebase Assessment

**Date:** 2026-03-10
**Scope:** Full monorepo — apps/, packages/, tests, configuration
**Goal:** Identify all issues blocking production-readiness, organized as parallelizable work items.

---

## How to Use This Document

Each item is a self-contained task that can be assigned to an independent agent. Items are grouped by category and prioritized within each group. Dependencies between items are noted explicitly.

**Priority Legend:**
- 🔴 **P0 — Critical:** Bugs, security issues, data loss risks
- 🟠 **P1 — High:** Missing error handling, resource leaks, significant gaps
- 🟡 **P2 — Medium:** Inconsistencies, code quality, robustness improvements
- 🔵 **P3 — Low:** Polish, conventions, minor improvements

---

## 1. Bugs & Race Conditions

### 1.1 🔴 SessionManager: Race condition in permission response
- **File:** `apps/desktop/src/main/agent/SessionManager.ts` ~lines 355-423
- **Issue:** `pendingPermissions.delete(requestId)` (line ~414) runs before `provider.respondPermission(requestId, response)` (line ~423). If the provider emits another event before the response completes, the map state becomes inconsistent.
- **Fix:** Delete from map after provider processes the response, or use an in-flight flag.

### 1.2 🔴 WorkstreamManager: Race condition in resume retry
- **File:** `apps/desktop/src/main/workstream/WorkstreamManager.ts` ~lines 715-729
- **Issue:** `resumeRetryInProgress` Set check-then-add is not atomic. Two concurrent error events can both pass `.has()` before either `.add()`, causing duplicate retry attempts.
- **Fix:** Use a synchronous guard (set before async work) or deduplicate with a single queued retry.

### 1.3 🔴 LspServerInstance: Orphaned child process on init failure
- **File:** `apps/desktop/src/main/lsp/LspServerInstance.ts` ~lines 252-260
- **Issue:** If `this.initialize()` throws after `spawn()`, the child process is never killed.
- **Fix:** Call `this.cleanup()` in the catch block.

### 1.4 🟠 FileIndexService: Git check-ignore can hang forever
- **File:** `apps/desktop/src/main/file-index/FileIndexService.ts` ~lines 112-126
- **Issue:** Spawned `git check-ignore --stdin` has no timeout. If the process hangs, the promise never resolves, leaving the directory stuck in `indexingSet` indefinitely.
- **Fix:** Add a timeout (e.g., 10s) that kills the process and resolves with an empty set.

### 1.5 🟠 useWorkstreamChat: Replay version race on rapid workstream switching
- **File:** `apps/desktop/src/renderer/hooks/useWorkstreamChat.ts` ~lines 207-255
- **Issue:** Manual replay version tracking has a race window. Rapid workstream switches can queue multiple replays; the version check prevents crashes but creates silent failures.
- **Fix:** Cancel in-flight replay mutations on workstream change using AbortController.

### 1.6 🟡 AuthManager: Periodic validation interval double-start
- **File:** `apps/desktop/src/main/auth/AuthManager.ts` ~lines 159-172
- **Issue:** If `startPeriodicValidation` is called twice in quick succession, the first interval ref may become stale before `stopPeriodicValidation` clears it.
- **Fix:** Guard with a boolean flag or use a single-assignment pattern.

### 1.7 🟡 RoutineScheduler: In-flight execution not stopped on `stop()`
- **File:** `apps/desktop/src/main/routines/RoutineScheduler.ts` ~lines 57-63, 100-125
- **Issue:** `stop()` clears timers but doesn't prevent an already-executing `onTimerFire` from rescheduling. The `this.running` check happens after executor completes.
- **Fix:** Check `this.running` before calling `this.scheduleRoutine()` (already present at line ~122, verify it's correct).

### 1.8 🟡 ActiveChatStoreContext: Unnecessary re-renders from callbacks
- **File:** `apps/desktop/src/providers/ActiveChatStoreContext.tsx` ~lines 41-46
- **Issue:** `setCallbacks(cb)` always updates state even when callbacks are structurally identical, triggering re-renders for all `useActiveChatCallbacks()` consumers.
- **Fix:** Compare callbacks before setting, or memoize the callbacks object.

---

## 2. Security

### 2.1 🔴 git-utils: Insufficient branch name validation
- **File:** `packages/git-utils/src/operations.ts` ~lines 162-164
- **Issue:** Branch name validation only checks for leading `-` and `..`. Arguments like `--config` could be interpreted as git flags when passed as branch names.
- **Fix:** Use a character whitelist: `[a-zA-Z0-9_/.-]` only. Reject any name starting with `-`.

### 2.2 🟠 Shell IPC handlers: Untested command execution
- **File:** `apps/desktop/src/ipc/shell/handlers.ts`
- **Issue:** Shell command execution handlers have zero test coverage. This is a security-critical surface.
- **Fix:** Write comprehensive tests covering input sanitization, escaping, and error handling.

### 2.3 🟡 agent-providers: stdin write without error handling
- **File:** `packages/agent-providers/src/claude-code/provider.ts` ~lines 388-391
- **Issue:** `writeToStdin` doesn't check if stdin is writable before writing. Could fail silently.
- **Fix:** Add try-catch with error event emission.

### 2.4 🟡 secure-storage: Silent plaintext fallback
- **File:** `packages/secure-storage/src/main.ts` ~line 185
- **Issue:** Falls back to plaintext storage when encryption is unavailable without logging a warning.
- **Fix:** Log a warning when encryption is unavailable so it's visible in diagnostics.

---

## 3. Resource Leaks & Cleanup

### 3.1 🟠 ContentArea.tsx: setTimeout without cleanup
- **File:** `apps/desktop/src/components/ContentArea.tsx` ~line 23
- **Issue:** `setTimeout(() => setCopied(false), 2000)` is never cleaned up on unmount. Every copy action creates an orphaned timer that can call setState on unmounted component.
- **Fix:** Store timeout ID in a ref, clear on unmount.

### 3.2 🟠 MCP Socket Server: Client connections not closed on fatal handler errors
- **File:** `apps/desktop/src/main/mcp/socket-server.ts` ~lines 136-186
- **Issue:** If a handler throws an unhandled error, the socket stays open indefinitely.
- **Fix:** Add timeout per request and close socket on unrecoverable errors.

### 3.3 🟠 main.ts: Database connections not closed if IPC registration fails
- **File:** `apps/desktop/src/main.ts` ~lines 495-516
- **Issue:** If `registerIpc` throws, databases are open but `cleanupIpc` remains a no-op. On quit, cleanup may be incomplete.
- **Fix:** Wrap in try-catch and close databases on registration failure.

### 3.4 🟡 useWorkstreamChat: Module-level caches never purged
- **File:** `apps/desktop/src/renderer/hooks/useWorkstreamChat.ts` ~lines 51-53
- **Issue:** `storeCache` and `connectionCache` are module-level Maps with LRU eviction but no max-age. Long sessions with many workstream switches could accumulate stale state.
- **Fix:** Add max-age eviction or cleanup hook.

### 3.5 🟡 LspManager: No depth limit on project root detection
- **File:** `apps/desktop/src/main/lsp/LspManager.ts` ~lines 425-443
- **Issue:** `detectProjectRoot` traverses up the entire filesystem without a depth limit, potentially blocking the event loop with many fs.access calls.
- **Fix:** Add a max traversal depth (e.g., 20 levels).

### 3.6 🟡 FileService: No cooldown on repeated watch failures
- **File:** `apps/desktop/src/main/file/FileService.ts` ~lines 57-81
- **Issue:** If `fs.watch` errors immediately, the watcher is removed but nothing prevents immediate retry. Could cause hot loops if the path is permanently unwatchable.
- **Fix:** Add a cooldown/backoff for failed watch paths.

---

## 4. Error Handling Gaps

### 4.1 🟠 WorkstreamContext: No onError for createProjectMut
- **File:** `apps/desktop/src/renderer/contexts/WorkstreamContext.tsx` ~lines 193-199
- **Issue:** `createProjectMut` in useEffect has `onCompleted` but no `onError`. Silent failure to create default project leaves app in bad state.
- **Fix:** Add `onError` handler that shows a toast and logs the error.

### 4.2 🟠 AuthProvider: Swallows init errors silently
- **File:** `apps/desktop/src/providers/AuthProvider.tsx` ~lines 37-45
- **Issue:** Auth state load `.catch()` sets `isLoading: false` but never surfaces the error. App appears loaded but auth state is unknown.
- **Fix:** Add an error state to the context and display error UI.

### 4.3 🟠 EntityProvider: GraphQL errors crash entity palette
- **File:** `apps/desktop/src/providers/EntityProvider.tsx` ~lines 217-234
- **Issue:** `searchEntities` calls `client.query` without try-catch. GraphQL errors propagate unhandled and crash the entity palette.
- **Fix:** Wrap in try-catch, return empty results, and log error.

### 4.4 🟠 main.ts: Error object passed to logger without stringifying
- **File:** `apps/desktop/src/main.ts` ~lines 441-460
- **Issue:** `logger.error('Auth code exchange failed', { error: err })` passes raw Error object. Pino may not serialize it properly.
- **Fix:** Use `error: err instanceof Error ? err.message : String(err)` and include `stack`.

### 4.5 🟡 SessionManager: Paste markup silently loses content
- **File:** `apps/desktop/src/main/agent/SessionManager.ts` ~lines 34-47
- **Issue:** Base64 decode failure in `decodePasteMarkup` returns empty string, silently losing pasted content.
- **Fix:** Log the error and return the original match text as fallback.

### 4.6 🟡 EntityProvider: graphqlToEntity silently drops partial entities
- **File:** `apps/desktop/src/providers/EntityProvider.tsx` ~lines 96-112
- **Issue:** `graphqlToEntity` returns null for incomplete entities with no logging. Partial entity failures are invisible.
- **Fix:** Add debug-level logging for dropped entities.

### 4.7 🟡 GraphQL handlers: JSON serialization can throw on circular refs
- **File:** `apps/desktop/src/ipc/graphql/handlers.ts` ~lines 45-79
- **Issue:** `JSON.parse(JSON.stringify(...))` can throw on circular references in GraphQL results.
- **Fix:** Wrap in try-catch with a fallback error response.

---

## 5. Missing Error Boundaries (React)

### 5.1 🟠 App.tsx: No error boundary around provider tree
- **File:** `apps/desktop/src/App.tsx` ~lines 244-303
- **Issue:** 11+ nested providers with no error boundary. A single provider crash tears down the entire app with no recovery.
- **Fix:** Add `<ErrorBoundary>` around MainContent that shows a fallback UI and offers restart.

### 5.2 🟡 EntityProvider: No error boundary for entity palette
- **File:** `apps/desktop/src/providers/EntityProvider.tsx`
- **Issue:** Entity search failures crash the palette with no fallback.
- **Fix:** Wrap entity palette in its own error boundary.

---

## 6. Inconsistent Patterns

### 6.1 🟡 Async style: Mixed `.then()` and async/await
- **Scope:** Across entire codebase
- **Issue:** Some files use `.then().catch()`, others use `async/await` with try-catch. No consistent convention.
- **Fix:** Standardize on `async/await` for all new code. Refactor `.then()` chains in main process code.

### 6.2 🟡 Error logging format inconsistency
- **Scope:** Multiple files across renderer hooks and main services
- **Issue:** Some errors logged as `{ error: err }`, others as `{ error: err.message }`, others as `{ error: String(err) }`.
- **Fix:** Standardize: `{ error: err instanceof Error ? err.message : String(err), ...(err instanceof Error && { stack: err.stack }) }`.

### 6.3 🟡 Null vs exception for "not found" scenarios
- **Scope:** Repository layer vs IPC handlers
- **Issue:** Repositories return `null` for not-found. Some IPC handlers throw, some return null. No documented convention.
- **Fix:** Document convention: repositories return `null`, IPC handlers return `createNotFoundError()`.

### 6.4 🟡 Console.log violations in production paths
- **Files:**
  - `packages/ipc/src/main.ts` — `console.log()` for IPC handler registration (verbose mode)
  - `packages/ipc/src/main.ts` — `console.error()` for validation failures (~line 172-175)
  - `packages/editor/src/hooks/useLspProviders.ts` — Multiple `console.warn()` and `console.info()`
  - `packages/graphql/src/schema/print.ts` — Console output for schema printing
- **Fix:** Replace all with `@vienna/logger` calls per project convention.

### 6.5 ✅ MCP env var naming: MCP_SOCKET_PATH
- **File:** `apps/desktop/src/main/mcp/index.ts` ~line 292
- **Status:** Resolved. Env var renamed from `DRIFT_SOCKET_PATH` to `MCP_SOCKET_PATH`.

### 6.6 🟡 WorkstreamContext: Stale closure with eslint-disable
- **File:** `apps/desktop/src/renderer/contexts/WorkstreamContext.tsx` ~lines 201-204
- **Issue:** Intentionally incomplete useEffect dependencies with ESLint disable comment. If `persistedProjectId` changes externally, the effect won't re-run.
- **Fix:** Use a ref for `persistedProjectId` to avoid infinite loop while staying reactive, or restructure the bootstrap logic.

---

## 7. Test Coverage — Critical Gaps

### 7.1 🔴 Security-critical code with ZERO tests

| File | Risk | What to Test |
|------|------|-------------|
| `packages/agent-permissions/src/rules.ts` | Permission bypass | Rule matching, scope evaluation, glob patterns, edge cases |
| `packages/git-utils/src/exec.ts` | Command injection | Argument escaping, error handling, timeout behavior |
| `apps/desktop/src/ipc/shell/handlers.ts` | Shell injection | Input sanitization, escaping, command allowlisting |
| `packages/app-db/src/permission-resolver.ts` | Permission escalation | Scope cascade (project→group→workstream), override logic |
| `packages/app-db/src/permission-policies.ts` | Policy bypass | Policy evaluation, default deny behavior |

### 7.2 🟠 Core business logic with ZERO tests

| File | What to Test |
|------|-------------|
| `packages/app-db/src/routines.ts` | CRUD operations, scheduling, deactivation |
| `apps/desktop/src/main/file/FileService.ts` | File watch, unwatch, error recovery |
| `apps/desktop/src/main/lsp/LspManager.ts` | Server lifecycle, project root detection, multi-language support |
| `apps/desktop/src/ipc/workstream/handlers.ts` | Workstream CRUD, agent lifecycle |
| `apps/desktop/src/ipc/lsp/handlers.ts` | LSP request forwarding, error handling |
| `apps/desktop/src/ipc/file/handlers.ts` | File read/write, path validation |
| `apps/desktop/src/ipc/keybindings/handlers.ts` | Keybinding registration, conflict detection |

### 7.3 🟠 GraphQL resolvers — near-zero coverage
- **Scope:** `packages/graphql/src/domains/*` (49 source files, 1 test file)
- **Issue:** All resolver mutations and queries for workstreams, entities, projects, permissions, routines are untested.
- **Fix:** Add unit tests for each domain's queries and mutations. At minimum test input validation, error paths, and expected return shapes.

### 7.4 🟠 Agent provider implementations
- **Files:**
  - `packages/agent-providers/src/claude-code/provider.ts` — Process lifecycle untested
  - `packages/agent-providers/src/claude-code/path-resolver.ts` — Path resolution untested
  - `packages/agent-providers/src/codex-cli/provider.ts` — Entirely untested
  - `packages/agent-providers/src/gemini-cli/provider.ts` — Entirely untested
- **Fix:** Test provider initialization, event streaming, error handling, graceful shutdown.

### 7.5 🟡 UI component library — 3% coverage
- **Scope:** `packages/ui/` (147 source files, 4 test files)
- **Priority items:** Form components (button, input, select, checkbox), layout components (sidebar, drawer), interactive components (confirm-dialog, inline-edit, file-tree).
- **Fix:** Add rendering + interaction tests for top 20 most-used components.

### 7.6 🟡 Chat UI — 3% coverage
- **Scope:** `packages/chat-ui/` (232 source files, 7 test files)
- **Priority items:** Tool renderers, message components, command palette, permission action bars.
- **Fix:** Add rendering tests for tool renderers and interaction tests for action bars.

---

## 8. Test Quality Issues

### 8.1 🟡 Missing edge case tests across all packages
- **Issue:** Existing tests primarily cover happy paths. Missing:
  - Empty inputs, null, undefined
  - Boundary values (max int, empty string, very long string)
  - Concurrent operations
  - Transaction rollback scenarios
  - Error path recovery
- **Fix:** Audit each existing test file and add edge case coverage.

### 8.2 🟡 No contract tests between packages
- **Issue:** Package boundaries are validated by TypeScript types but not by runtime contract tests. Schema changes could break consumers.
- **Fix:** Add contract tests for key package interfaces (IPC contracts, GraphQL schema, sdk API).

### 8.3 🟡 E2E coverage: Only 4 tests for ~5% of user flows
- **Missing critical flows:**
  - Project/workstream creation and management
  - Agent session lifecycle (start, interact, stop)
  - Tool execution (files, bash, grep, glob)
  - Entity browsing and linking
  - Settings management
  - Error recovery (offline, timeout, auth expiry)
  - Permission request/response flow
  - Multiple concurrent agents
- **Fix:** Add E2E tests for the top 10 user flows.

### 8.4 🔵 Test pyramid misalignment
- **Current:** ~90% unit (mostly schema tests), ~8% integration, ~2% E2E
- **Issue:** Too many simple schema validation tests, not enough behavior tests. No performance or security-specific tests.
- **Fix:** Shift focus to integration tests for package interactions and E2E tests for critical flows.

---

## 9. Documentation & Configuration

### 9.1 🟡 No documented error handling strategy
- **Issue:** Implicit conventions for null-vs-exception, retry-vs-fail, log-vs-throw are inconsistent.
- **Fix:** Document error handling guidelines in CLAUDE.md or a dedicated doc.

### 9.2 🔵 agent-permissions: Base64 regex validation too permissive
- **File:** `packages/agent-permissions/src/rules.ts` ~lines 198-210
- **Issue:** Base64 regex `/^[A-Za-z0-9+/]*={0,2}$/` allows invalid padding positions.
- **Fix:** Use `Buffer.from(val, 'base64').toString('base64') === val` for round-trip validation.

### 9.3 🔵 agent-permissions: No Windows path separator normalization
- **File:** `packages/agent-permissions/src/rules.ts` ~lines 59-70
- **Issue:** `matchesDirectory` always uses `/` for path comparisons. On Windows, paths may use `\`.
- **Fix:** Normalize with `path.normalize()` before matching (low priority — Electron app is macOS-focused).

---

## 10. Summary Statistics

| Category | P0 | P1 | P2 | P3 | Total |
|----------|----|----|----|----|-------|
| Bugs & Race Conditions | 3 | 2 | 3 | 0 | 8 |
| Security | 1 | 1 | 2 | 0 | 4 |
| Resource Leaks | 0 | 3 | 3 | 0 | 6 |
| Error Handling | 0 | 4 | 3 | 0 | 7 |
| Error Boundaries | 0 | 1 | 1 | 0 | 2 |
| Inconsistent Patterns | 0 | 0 | 5 | 1 | 6 |
| Test Coverage | 1 | 4 | 2 | 0 | 7 |
| Test Quality | 0 | 0 | 3 | 1 | 4 |
| Docs & Config | 0 | 0 | 1 | 2 | 3 |
| **Total** | **5** | **15** | **23** | **4** | **47** |

---

## 11. Recommended Execution Order

**Phase 1 — Critical Fixes (P0):**
1. Items 1.1, 1.2, 1.3 (race conditions & process leak)
2. Item 2.1 (git-utils branch validation)
3. Item 7.1 (security-critical test coverage)

**Phase 2 — High Priority (P1):**
4. Items 1.4, 1.5 (remaining bugs)
5. Items 3.1, 3.2, 3.3 (resource leaks)
6. Items 4.1, 4.2, 4.3, 4.4 (error handling)
7. Item 5.1 (app error boundary)
8. Items 7.2, 7.3, 7.4 (core test coverage)

**Phase 3 — Medium Priority (P2):**
9. Remaining items from each category
10. Items 7.5, 7.6 (UI test coverage)

**Phase 4 — Polish (P3):**
11. Remaining low-priority items
