# 02: Add Build Tooling for npm Publication

## Priority: BLOCKING

## Summary

The package currently has `emitDeclarationOnly: true` in tsconfig and exports point to raw `.ts` source files. This works inside the monorepo (bundlers handle it) but is completely broken for npm consumers. We need proper build output: compiled ESM JavaScript + TypeScript declarations + source maps.

## Current State

**package.json exports (broken for npm):**
```json
{
  "exports": {
    ".": "./src/index.ts",
    "./react": "./src/react/index.ts",
    "./codegen": "./src/codegen.ts"
  }
}
```

**tsconfig.json:**
```json
{
  "compilerOptions": {
    "emitDeclarationOnly": true
  }
}
```

No compiled JavaScript is produced. npm consumers would get raw TypeScript files they can't use.

## What Needs to Change

### 1. Add tsup as build tool

Install `tsup` as a dev dependency. It's the standard choice for TypeScript library bundling — zero config, tree-shakeable ESM output, automatic `.d.ts` generation.

### 2. Create tsup.config.ts

```ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    react: 'src/react/index.ts',
    codegen: 'src/codegen.ts',
  },
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  external: [
    'react',
    'graphql',
    '@apollo/client',
    '@apollo/client/core',
    '@apollo/client/react/hooks',
    '@apollo/client/react/types/types',
    '@graphql-typed-document-node/core',
    'graphql-tag',
    'zod',
  ],
});
```

Key decisions:
- **ESM only** (not dual CJS/ESM) — the Vienna ecosystem is ESM-only, and modern tooling handles ESM fine
- **External all deps** — don't bundle dependencies, let consumers resolve them
- **Source maps** — for debugging
- **DTS** — TypeScript declarations for type checking

### 3. Update package.json exports

```json
{
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./react": {
      "import": "./dist/react.js",
      "types": "./dist/react.d.ts"
    },
    "./codegen": {
      "import": "./dist/codegen.js",
      "types": "./dist/codegen.d.ts"
    }
  },
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts"
}
```

### 4. Add files field

```json
{
  "files": ["dist", "LICENSE", "README.md"]
}
```

This ensures only the built output, license, and readme are published. No source files, tests, or config.

### 5. Update build script

```json
{
  "scripts": {
    "build": "tsup",
    "typecheck": "tsc --noEmit",
    "prepublishOnly": "pnpm build"
  }
}
```

### 6. Update tsconfig.json

Remove `emitDeclarationOnly` and `outDir` since tsup handles output. Keep the tsconfig for `tsc --noEmit` type checking only:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "types": ["node", "react"]
  },
  "include": ["src/**/*"],
  "exclude": ["src/**/*.test.ts"]
}
```

### 7. Add dist/ to .gitignore

Ensure `dist/` is in the package's `.gitignore` (or the monorepo root `.gitignore`).

### 8. Handle monorepo internal usage

The monorepo currently imports from raw `.ts` files via the old exports. After changing exports to point to `dist/`, internal monorepo usage must still work. Two approaches:

**Option A (recommended):** Use tsup's `--watch` in dev mode and have monorepo consumers import from dist. Add a `dev` script:
```json
{
  "scripts": {
    "dev": "tsup --watch"
  }
}
```

**Option B:** Use conditional exports with a `development` condition:
```json
{
  "exports": {
    ".": {
      "development": "./src/index.ts",
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  }
}
```

Check how other packages in the monorepo handle this pattern and follow the same approach.

## Verification

1. `pnpm build` in the SDK package — must produce `dist/index.js`, `dist/react.js`, `dist/codegen.js` + `.d.ts` files
2. `pnpm typecheck` — must still pass
3. `pnpm test` — all 210 tests must pass
4. `pnpm pack --dry-run` — verify only dist/, LICENSE, README.md are included
5. Check that monorepo dev workflow still works (`pnpm dev` from root)

## Dependencies

This item should be done AFTER item 01 (rename) since it modifies `package.json`.
