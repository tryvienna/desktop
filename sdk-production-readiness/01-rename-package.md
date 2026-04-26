# 01: Rename Package from @vienna/entity-sdk to @tryvienna/sdk

## Priority: BLOCKING

## Summary

Rename the package from `@vienna/entity-sdk` to `@tryvienna/sdk` across the entire monorepo. This is the new public-facing name for npm publication.

## What Needs to Change

### 1. Package directory
- Rename `packages/entity-sdk/` to `packages/sdk/`

### 2. package.json (in the SDK package)
- Change `"name"` from `"@vienna/entity-sdk"` to `"@tryvienna/sdk"`

### 3. All import sites across the monorepo (85+ files)
Replace all occurrences of:
- `'@vienna/entity-sdk'` → `'@tryvienna/sdk'`
- `'@vienna/entity-sdk/react'` → `'@tryvienna/sdk/react'`
- `'@vienna/entity-sdk/codegen'` → `'@tryvienna/sdk/codegen'`
- `"@vienna/entity-sdk"` → `"@tryvienna/sdk"` (in package.json dependency lists)

Key locations to check:
- `apps/desktop/` — main process, renderer, IPC handlers
- `packages/graphql/` — schema builder, entity domain
- `packages/plugin-github/` — reference plugin
- `packages/plugin-weather/` — reference plugin
- `packages/plugin-quick-actions/` — reference plugin
- `packages/mcp-entities/` — MCP bridge
- `apps/docs/` — documentation generator
- Any `package.json` files that list `@vienna/entity-sdk` as a dependency

### 4. Internal references
- Update any `CLAUDE.md` files that reference the old name
- Update the SDK's own README.md header
- Update JSDoc/comments inside the SDK that reference the old name
- Update the module docstring in `src/index.ts`

### 5. TypeScript project references
- Check `tsconfig.json` files for path references to the old directory name
- Check `turbo.json` if it has any package-specific configuration

### 6. pnpm workspace
- Check `pnpm-workspace.yaml` — it likely uses a glob (`packages/*`) so no change needed, but verify

## Verification

After all changes:
1. `pnpm install` (to update the lockfile)
2. `pnpm typecheck` from monorepo root — must pass
3. `pnpm lint` from the SDK package — must pass
4. `pnpm test` from the SDK package — all 210 tests must pass
5. `grep -r "entity-sdk" packages/ apps/` — must return zero results (except maybe git history)

## Risks

- This is the most cross-cutting change. If any import is missed, TypeScript will catch it.
- The `pnpm-lock.yaml` will need regenerating.
- Other developers' branches may conflict — this is acceptable.

## Approach

1. Rename the directory first
2. Update the SDK's own package.json
3. Use a monorepo-wide find-and-replace for imports
4. Update all dependent package.json files
5. Run `pnpm install` to regenerate the lockfile
6. Run `pnpm typecheck` to verify
