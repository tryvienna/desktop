# 04: Fix Lint Errors and Deprecated APIs

## Priority: BLOCKING (lint errors prevent CI)

## Summary

Fix all 3 lint errors and 7 warnings, plus replace a deprecated browser API in the URI module.

## Lint Errors (3)

### Error 1: `react/cache.ts:25` — `@typescript-eslint/no-explicit-any`
```ts
export function invalidateEntity(
  client: ApolloClient<any>,  // line 25
```

**Fix:** The `ApolloClient<any>` is necessary here because we don't know the cache shape. Add an eslint-disable comment with explanation, OR use `ApolloClient<unknown>` if it's compatible (test this — Apollo's types may require `any` for the cache type parameter).

### Error 2: `react/cache.ts:50` — `@typescript-eslint/no-explicit-any`
```ts
export function updateCachedEntity(
  client: ApolloClient<any>,  // line 50
```

**Fix:** Same as above.

### Error 3: `__tests__/react-cache.unit.test.ts:86` — `@typescript-eslint/no-unused-vars`
```ts
const fieldModifiers = {};  // assigned but never used
```

**Fix:** Either use the variable in the test assertion or prefix it with `_`.

## Lint Warnings (7)

### Warnings 1-2: `define-plugin.ts:35,60` — Unused eslint-disable directives
The `@typescript-eslint/no-explicit-any` disable comments are stale because the underlying code no longer triggers the rule.

**Fix:** Remove the two `// eslint-disable-next-line @typescript-eslint/no-explicit-any` comments on lines 35 and 60.

### Warning 3: `react/cache.ts:15` — Unused eslint-disable directive
**Fix:** Remove the stale `// eslint-disable-next-line @typescript-eslint/no-explicit-any` comment.

### Warnings 4-6: `schema-builder.ts:53,59,65` — Unused eslint-disable directives
The `@typescript-eslint/no-empty-object-type` disable comments for `ObjectRef`, `InputRef`, and `EnumRef` interfaces are stale.

**Fix:** Remove the three stale disable comments. Check if the interfaces need the disables — they have phantom brand fields with `unique symbol`, which may or may not trigger the rule depending on the eslint version.

### Warning 7: `types.ts:166` — Unused eslint-disable directive
The `@typescript-eslint/no-empty-object-type` disable for `IntegrationDefinition` interface is stale.

**Fix:** Remove the stale disable comment.

## Deprecated API: `unescape()` in uri.ts

### Location: `uri.ts:66`
```ts
const encoded = btoa(unescape(encodeURIComponent(label)));
```

### And: `uri.ts:207`
```ts
return decodeURIComponent(escape(atob(encoded)));
```

The `unescape()` and `escape()` functions are deprecated in modern JavaScript. They work but:
- They're flagged by many linters
- They may be removed in future engine versions
- They signal low code quality to external consumers

### Fix

Replace with modern `TextEncoder`/`TextDecoder` approach:

**Encoding (line 66):**
```ts
// Convert UTF-8 string to base64
const bytes = new TextEncoder().encode(label);
const encoded = btoa(String.fromCharCode(...bytes));
```

**Decoding (line 207):**
```ts
// Convert base64 back to UTF-8 string
const bytes = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
return new TextDecoder().decode(bytes);
```

**Important:** After making these changes, run the URI tests (`src/__tests__/uri.unit.test.ts`) to verify the label encoding/decoding behavior is preserved, especially for non-ASCII characters.

## Verification

1. `pnpm lint` — must pass with zero errors and zero warnings
2. `pnpm test` — all 210 tests must pass (especially URI tests)
3. `pnpm typecheck` — must pass
