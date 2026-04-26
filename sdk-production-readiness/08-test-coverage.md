# 08: Improve Test Coverage

## Priority: MEDIUM

## Summary

While the package has solid test coverage (92% statements, 210 tests), there are notable gaps in the React hooks, codegen module, and some testing utilities. For a public SDK, these gaps should be filled.

## Coverage Gaps

### 1. React Hooks — ZERO tests

None of the React hooks have tests:
- `useEntity` — untested
- `useEntities` — untested
- `usePluginQuery` — untested
- `usePluginMutation` — untested
- `PluginDataProvider` — untested
- `usePluginClient` / `useHostApi` — untested

**What to test:**

For each hook:
- Returns loading state initially
- Returns data after query resolves
- Returns error on failure
- Respects `skip` option
- Respects `fetchPolicy` option
- Respects `pollInterval` option (if applicable)

For the provider:
- Throws when hooks are used outside the provider
- Passes client correctly to hooks
- Passes hostApi correctly to useHostApi

**Test setup:**
- Use `@testing-library/react` with `renderHook`
- Use `MockedProvider` from `@apollo/client/testing` for GraphQL mocking
- Create a helper that wraps hooks in `PluginDataProvider` + `MockedProvider`

**Files to create:**
- `src/__tests__/react-hooks.unit.test.ts` (or split into multiple files)

**Required dev dependencies:**
- `@testing-library/react` (for renderHook)
- `@testing-library/react-hooks` (if needed for older patterns)
- Add `jsdom` or `happy-dom` vitest environment for React tests

Update `vitest.config.ts` to handle React tests — may need a separate config or workspace config for react tests with a DOM environment.

### 2. codegen.ts — ZERO tests

`createPluginCodegenConfig()` has no tests.

**What to test:**
- Default config has correct schema path, documents glob, output dir
- Custom options override defaults
- Config shape matches @graphql-codegen expectations
- `useTypeImports: true` is set
- `enumsAsTypes: true` is set
- Scalar mappings are correct

**File to create:**
- `src/__tests__/codegen.unit.test.ts`

### 3. testing.ts — 63.6% coverage

Missing coverage for:
- `MockOAuthAccessor` — `getAccessToken`, `getTokenData`, `isAuthenticated`, `setToken`, `removeToken`, `clear` (lines 101-140)
- `MockPluginLogger.child()` — the shared entries behavior (lines 85-88)

**What to test:**

MockOAuthAccessor:
- `getAccessToken` returns null when no token set
- `getAccessToken` returns token after `setToken`
- `getTokenData` returns full token data
- `isAuthenticated` returns false/true correctly
- `removeToken` removes the token
- `clear` removes all tokens

MockPluginLogger.child():
- Child logger shares parent's entries array
- Child logger merges bindings
- Entries from child appear in parent's entries

**File:** Update existing `src/__tests__/testing.unit.test.ts`

### 4. PluginDataContext — error messages

Test that `usePluginClient()` and `useHostApi()` throw descriptive errors when used outside the provider. These are user-facing error messages that should be verified.

### 5. Edge cases in existing modules

Some uncovered lines suggest missing edge case tests:

**plugin-system.ts (69.81% branch coverage):**
- Search when all handlers reject (all Promise.allSettled results are 'rejected')
- resolveEntity when URI type doesn't match any entity
- resolveEntityContext when entity doesn't resolve

**registry.ts (81.48% branch coverage):**
- getByURI error path (line 123-124)
- resolveContext error path (line 169-170)

**uri.ts (94.44% branch):**
- getEntityTypeFromURI with empty type
- extractLabel with invalid base64

## Vitest Configuration for React Tests

The current vitest.config.ts uses `environment: 'node'`. React hooks need a DOM environment. Options:

**Option A:** Use `// @vitest-environment jsdom` directive in React test files
**Option B:** Create a separate vitest workspace config

Option A is simpler and doesn't require restructuring.

```ts
// At the top of react test files:
// @vitest-environment jsdom
```

Add `jsdom` (or `happy-dom`) as a dev dependency:
```bash
pnpm add -D jsdom @testing-library/react
```

## Verification

1. `pnpm test:coverage` — statement coverage should be ≥95%
2. All new tests pass
3. React hook tests run in DOM environment successfully
4. No flaky tests (polling/timing tests should use fake timers)
