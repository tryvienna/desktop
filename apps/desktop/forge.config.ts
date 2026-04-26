import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerDMG } from '@electron-forge/maker-dmg';
import { MakerZIP } from '@electron-forge/maker-zip';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';
import path from 'node:path';
import fs from 'node:fs';
import { execSync, execFileSync } from 'node:child_process';
import { getBranchName, getWorktreePorts, patchElectronAppName, generateDevIcon, generateStagingIcon } from './worktree';

const branch = getBranchName();
const ports = getWorktreePorts(branch);
const channel = process.env.VIENNA_CHANNEL ?? 'production';
const isStaging = channel !== 'production';

// Generate staging icon early so packagerConfig can reference it
const stagingIconPath = isStaging ? generateStagingIcon(channel) : undefined;

/**
 * Resolve a module's directory from the pnpm store. Tries require.resolve first,
 * then falls back to scanning node_modules/.pnpm.
 */
function resolveModuleDir(mod: string): string {
  try {
    return path.dirname(require.resolve(`${mod}/package.json`));
  } catch {
    const pnpmDir = path.resolve(__dirname, '../../node_modules/.pnpm');
    const entries = fs.readdirSync(pnpmDir);
    const pnpmKey = mod.replace(/\//g, '+');
    const match = entries.find((e) => e.startsWith(`${pnpmKey}@`));
    if (!match) throw new Error(`${mod} not found in .pnpm store`);
    return path.join(pnpmDir, match, 'node_modules', mod);
  }
}

/**
 * Recursively collect a module and all its production dependencies.
 * Returns a Set of module names that need to be copied.
 */
function collectDepsRecursive(roots: string[]): Set<string> {
  const collected = new Set<string>();
  const queue = [...roots];
  while (queue.length > 0) {
    const mod = queue.shift()!;
    if (collected.has(mod)) continue;
    collected.add(mod);
    try {
      const modDir = resolveModuleDir(mod);
      const pkgPath = path.join(modDir, 'package.json');
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        for (const dep of Object.keys(pkg.dependencies ?? {})) {
          if (!collected.has(dep)) queue.push(dep);
        }
      }
    } catch {
      // Module not found — will be warned about during copy
    }
  }
  return collected;
}

const config: ForgeConfig = {
  hooks: {
    generateAssets: async () => {
      // Kill any stale dev server still holding our ports (e.g. after Cmd+C)
      let killedAny = false;
      for (const port of [ports.vite]) {
        try {
          const pids = execFileSync('lsof', ['-ti', `:${port}`], {
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe'],
          }).trim();
          if (pids) {
            for (const pid of pids.split('\n')) {
              try { process.kill(Number(pid), 'SIGKILL'); } catch {}
            }
            killedAny = true;
            console.log(`  Killed stale process(es) on port ${port}`);
          }
        } catch {
          // No process on the port — nothing to do
        }
      }
      // Give the OS a moment to release the ports
      if (killedAny) await new Promise((r) => setTimeout(r, 500));

      console.log(`⎡ Worktree: ${branch}`);
      console.log(`⎢ Vite: ${ports.vite}`);
      if (process.platform === 'darwin') {
        patchElectronAppName(branch);
      }
      if (!isStaging) {
        generateDevIcon(branch);
      }
      console.log(`⎣ Data: Vienna (${branch})/ in app userData`);

      // Bundle MCP entities server for inclusion in packaged app Resources.
      // The bundled output lands in packages/mcp-entities/dist/mcp-entities/index.js
      // and is copied into the packaged app via extraResource in packagerConfig.
      const monorepoRoot = path.resolve(__dirname, '../..');
      const mcpEntitiesDir = path.join(monorepoRoot, 'packages', 'mcp-entities');

      // Verify node_modules exist — a missing install is the most common failure cause
      const mcpNodeModules = path.join(mcpEntitiesDir, 'node_modules');
      if (!fs.existsSync(mcpNodeModules)) {
        throw new Error(
          `node_modules missing in ${mcpEntitiesDir}. Run "pnpm install" from the monorepo root first.`
        );
      }

      // Sanity-check that the esbuild binary is a real native executable.
      // pnpm store corruption can replace it with a tiny JS wrapper that loops.
      try {
        const esbuildVersion = execSync('pnpm exec esbuild --version', {
          cwd: mcpEntitiesDir, encoding: 'utf-8', timeout: 5000,
        }).trim();
        console.log(`  esbuild ${esbuildVersion}`);
      } catch {
        throw new Error(
          `esbuild binary is broken or missing. This often indicates a corrupted pnpm store. ` +
          `Fix with: pnpm store prune && pnpm install --force`
        );
      }

      console.log('  Bundling MCP entities server...');
      try {
        execSync('pnpm bundle', { cwd: mcpEntitiesDir, stdio: 'inherit' });
      } catch (err) {
        throw new Error(
          `Failed to bundle MCP entities server. Ensure esbuild is installed ` +
          `and packages/mcp-entities builds cleanly:\n  ${err instanceof Error ? err.message : String(err)}`
        );
      }

      // Verify the bundle output exists — extraResource will silently skip missing dirs
      const bundleOutput = path.join(mcpEntitiesDir, 'dist', 'mcp-entities', 'index.js');
      if (!fs.existsSync(bundleOutput)) {
        throw new Error(
          `MCP entities bundle output not found at ${bundleOutput}. ` +
          `The packaged app will not be able to load entity operations.`
        );
      }
      console.log('  ✓ MCP entities server bundled');

      // Bundle vcli for inclusion in packaged app Resources.
      // The bundled output lands in packages/vcli/dist/vcli/index.cjs
      // and is copied into the packaged app via extraResource in packagerConfig.
      const vcliDir = path.join(monorepoRoot, 'packages', 'vcli');

      console.log('  Bundling vcli...');
      try {
        execSync('pnpm bundle', { cwd: vcliDir, stdio: 'inherit' });
      } catch (err) {
        throw new Error(
          `Failed to bundle vcli. Ensure esbuild is installed ` +
          `and packages/vcli builds cleanly:\n  ${err instanceof Error ? err.message : String(err)}`
        );
      }

      const vcliBundleOutput = path.join(vcliDir, 'dist', 'vcli', 'index.cjs');
      if (!fs.existsSync(vcliBundleOutput)) {
        throw new Error(
          `vcli bundle output not found at ${vcliBundleOutput}. ` +
          `The packaged app will not be able to scaffold plugins.`
        );
      }

      // Copy the shell wrapper into the bundle output directory so it's included
      // in the extraResource alongside index.cjs
      const wrapperSrc = path.join(vcliDir, 'bin', 'vcli-wrapper.sh');
      const wrapperDest = path.join(vcliDir, 'dist', 'vcli', 'vcli');
      if (!fs.existsSync(wrapperSrc)) {
        throw new Error(
          `vcli shell wrapper not found at ${wrapperSrc}. ` +
          `The packaged app will not be able to install the vcli shell command.`
        );
      }
      fs.copyFileSync(wrapperSrc, wrapperDest);
      fs.chmodSync(wrapperDest, 0o755);

      console.log('  ✓ vcli bundled');
    },
    // Copy native Node modules into the packaged app directory before ASAR creation.
    // better-sqlite3 is marked external in vite.main.config.ts so Vite emits
    // require('better-sqlite3') at runtime. We place the native module inside the
    // app source so it gets packed into the ASAR (with .node files auto-unpacked).
    packageAfterCopy: async (_config, buildPath) => {
      // Native modules and their helpers (no transitive dep resolution needed)
      const nativeModules = ['better-sqlite3', 'bindings', 'file-uri-to-path', '@vscode/ripgrep', 'onnxruntime-node', 'onnxruntime-common', '@parcel/watcher', '@loomhq/electron-click-through-workaround'];

      // Plugin runtime: these are external in vite.main.config.ts so plugins can
      // require() them at runtime. Recursively resolve all their dependencies
      // so transitive deps (tslib, etc.) are included too.
      const pluginRuntimeRoots = [
        'esbuild',
        'graphql',
        'graphql-tag',
        '@apollo/client',
        'react',
        'react-dom',
        'lucide-react',
      ];
      const pluginDeps = collectDepsRecursive(pluginRuntimeRoots);

      const allModules = [...new Set([...nativeModules, ...pluginDeps])];

      for (const mod of allModules) {
        try {
          const srcDir = resolveModuleDir(mod);
          const destDir = path.join(buildPath, 'node_modules', mod);
          fs.cpSync(srcDir, destDir, { recursive: true, dereference: true });
          console.log(`  ✓ Copied module: ${mod}`);
        } catch (err) {
          console.warn(`  ✗ Failed to copy module ${mod}:`, err);
        }
      }

      // Copy the esbuild platform binary from the same esbuild package's node_modules
      // to guarantee version alignment. collectDepsRecursive only walks `dependencies`,
      // not `optionalDependencies` — and esbuild declares its platform binaries as
      // optionalDependencies — so the binary is not picked up automatically.
      // We resolve it from esbuild's own sibling in the pnpm virtual store rather than
      // via require.resolve() from the workspace root, which may hoist a different version
      // (e.g. Vite's esbuild) and cause a JS/binary version mismatch at runtime.
      const platformBinaryName = `@esbuild/${process.platform}-${process.arch}`;
      const esbuildDir = resolveModuleDir('esbuild');
      const platformBinarySrc = path.join(esbuildDir, '..', platformBinaryName);
      if (!fs.existsSync(platformBinarySrc)) {
        throw new Error(
          `esbuild platform binary not found at ${platformBinarySrc}. ` +
          `The packaged app will fail to bundle plugins at runtime.`
        );
      }
      // Validate the platform binary is a real native executable, not a JS wrapper stub.
      // pnpm store corruption can replace the ~10MB Mach-O binary with a 222-byte JS shim
      // that recursively calls itself, causing EAGAIN spawn loops. Detect this early.
      const binaryStat = fs.statSync(path.join(platformBinarySrc, 'bin', 'esbuild'));
      if (binaryStat.size < 1024) {
        throw new Error(
          `esbuild platform binary at ${platformBinarySrc}/bin/esbuild is only ${binaryStat.size} bytes — ` +
          `expected a native executable (~10MB). This indicates a corrupted pnpm store. ` +
          `Fix with: pnpm store prune && pnpm install --force`
        );
      }

      const platformBinaryDest = path.join(buildPath, 'node_modules', platformBinaryName);
      fs.cpSync(platformBinarySrc, platformBinaryDest, { recursive: true, dereference: true });
      console.log(`  ✓ Copied module: ${platformBinaryName} (version-matched from esbuild sibling)`);

    },
  },
  packagerConfig: {
    ...(isStaging ? { name: `Vienna (${channel})` } : {}),
    extendInfo: {
      NSMicrophoneUsageDescription: 'Vienna uses your microphone for voice-to-text transcription.',
    },
    extraResource: [
      path.resolve(__dirname, '../../packages/mcp-entities/dist/mcp-entities'),
      path.resolve(__dirname, '../../packages/vcli/dist/vcli'),
    ],
    asar: {
      unpack: '{**/*.node,**/*.dylib,**/node_modules/@vscode/ripgrep/bin/*,**/node_modules/@esbuild/*/bin/*,**/node_modules/esbuild/bin/*}',
    },
    icon: stagingIconPath ? stagingIconPath.replace(/\.icns$/, '') : path.resolve(__dirname, 'resources', 'icon'),
    appBundleId: isStaging ? `com.vienna.desktop.${channel}` : 'com.vienna.desktop',
    osxSign: {
      ...(process.env.CODESIGN_IDENTITY ? { identity: process.env.CODESIGN_IDENTITY } : {}),
      optionsForFile: () => ({
        entitlements: path.resolve(__dirname, 'entitlements.plist'),
        hardenedRuntime: true,
      }),
    },
    ...(process.env.APPLE_ID
      ? {
          osxNotarize: {
            appleId: process.env.APPLE_ID,
            appleIdPassword: process.env.APPLE_ID_PASSWORD!,
            teamId: process.env.APPLE_TEAM_ID!,
          },
        }
      : {}),
  },
  makers: [new MakerDMG({ format: 'ULFO' }), new MakerZIP({}, ['darwin'])],
  plugins: [
    new VitePlugin({
      build: [
        {
          entry: 'src/main.ts',
          config: 'vite.main.config.ts',
          target: 'main',
        },
        {
          entry: 'src/preload.ts',
          config: 'vite.preload.config.ts',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.ts',
        },
      ],
    }),
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;
