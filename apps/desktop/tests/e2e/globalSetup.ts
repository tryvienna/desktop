import fs from 'fs';
import path from 'path';
import { build } from 'vite';
import { getBranchName } from '../../worktree';

const desktopRoot = path.resolve(__dirname, '../..');
const outDir = path.join(desktopRoot, '.vite/build');
const mainJsPath = path.join(outDir, 'main.js');
const branchMarkerPath = path.join(outDir, '.worktree-branch');

// Inject the same worktree constants that vite.main.config.ts provides during `forge start`.
const branch = getBranchName();
const worktreeDefine = {
  __VIENNA_BRANCH__: JSON.stringify(branch),
};

function isBuildCurrent(): boolean {
  if (!fs.existsSync(mainJsPath)) return false;
  try {
    return fs.readFileSync(branchMarkerPath, 'utf8').trim() === branch;
  } catch {
    return false;
  }
}

export default async function globalSetup() {
  if (isBuildCurrent()) {
    // eslint-disable-next-line no-console
    console.log(`.vite/build/main.js found for branch "${branch}" — skipping build.`);
    return;
  }

  // eslint-disable-next-line no-console
  console.log(`Building main process and preload for e2e tests (branch: ${branch})...`);
  fs.mkdirSync(outDir, { recursive: true });

  // Build main process
  await build({
    configFile: false,
    logLevel: 'warn',
    define: worktreeDefine,
    build: {
      outDir,
      emptyOutDir: false,
      minify: false,
      lib: {
        entry: path.join(desktopRoot, 'src/main.ts'),
        formats: ['cjs'],
        fileName: () => 'main.js',
      },
      rollupOptions: {
        external: [/^electron/, /^node:/, 'path', 'fs', 'os', 'url', 'http', 'better-sqlite3'],
      },
    },
  });

  // Build preload
  await build({
    configFile: false,
    logLevel: 'warn',
    build: {
      outDir,
      emptyOutDir: false,
      minify: false,
      lib: {
        entry: path.join(desktopRoot, 'src/preload.ts'),
        formats: ['cjs'],
        fileName: () => 'preload.js',
      },
      rollupOptions: {
        external: [/^electron/, /^node:/, 'path', 'fs', 'os', 'url', 'http', 'better-sqlite3'],
      },
    },
  });

  fs.writeFileSync(branchMarkerPath, branch, 'utf8');
  // eslint-disable-next-line no-console
  console.log('Build complete.');
}
