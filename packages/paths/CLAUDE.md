# @vienna/paths

Centralized directory path definitions for the Vienna desktop app. All filesystem paths used by Vienna are defined here — one place to see the entire directory structure.

## Usage

### Main process

```typescript
import { createPaths } from '@vienna/paths/main';
import { mainEnv } from '@vienna/env/main';
import { app } from 'electron';

const paths = createPaths({
  baseDir: mainEnv.VIENNA_DATA_DIR ?? app.getPath('userData'),
});

paths.baseDir; // the root data directory
paths.logs.dir; // <baseDir>/logs
paths.logs.session('abc'); // <baseDir>/logs/abc
paths.logs.sessionLog('abc'); // <baseDir>/logs/abc/vienna.log
paths.logs.currentSession; // <baseDir>/logs/current-session
```

### Types only (safe for any process)

```typescript
import type { ViennaPaths, LogPaths } from '@vienna/paths';
```

## Directory Structure on Disk

```
<baseDir>/                          (app.getPath('userData') or VIENNA_DATA_DIR)
└── logs/
    ├── current-session             (text file: active session ID)
    └── <session-id>/
        └── vienna.log              (NDJSON log file)
```

## Environment Variable Override

Set `VIENNA_DATA_DIR` to redirect all Vienna data to a custom directory. Useful for development, CI, or running multiple instances.

The env var is defined in `@vienna/env` (see `packages/env/CLAUDE.md`). In the desktop app: `mainEnv.VIENNA_DATA_DIR ?? app.getPath('userData')`.

## How to Add a New Path Category

When you need a new category (e.g., `cache`, `config`, `data`):

1. **Define the interface** in `src/index.ts`:

   ```typescript
   export interface CachePaths {
     /** Root cache directory: <baseDir>/cache */
     readonly dir: string;
     // add more accessors as needed
   }
   ```

2. **Add to ViennaPaths** in `src/index.ts`:

   ```typescript
   export interface ViennaPaths {
     readonly baseDir: string;
     readonly logs: LogPaths;
     readonly cache: CachePaths; // ← add here
   }
   ```

3. **Add the builder** in `src/main.ts`:

   ```typescript
   function createCachePaths(baseDir: string): CachePaths {
     return {
       dir: path.join(baseDir, 'cache'),
     };
   }
   ```

4. **Wire into createPaths** in `src/main.ts`:

   ```typescript
   export function createPaths(options: CreatePathsOptions): ViennaPaths {
     const { baseDir } = options;
     return {
       baseDir,
       logs: createLogPaths(baseDir),
       cache: createCachePaths(baseDir), // ← add here
     };
   }
   ```

5. **Add tests** in `src/__tests__/main.unit.test.ts`.

6. **Update this file** — add the new directories to the "Directory Structure on Disk" section above.

## Design Constraints

- **No I/O.** `createPaths()` only computes strings via `path.join`. It never creates directories, checks existence, or writes files. Directory creation is the caller's responsibility.
- **No env vars.** This package does not read `process.env`. The `VIENNA_DATA_DIR` override is handled by `@vienna/env` and passed as `baseDir` by the consuming app.
- **No Electron dependency.** `app.getPath()` is called by the desktop app and passed in as `baseDir`. The paths package is pure Node.js.
