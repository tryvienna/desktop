/**
 * PluginBundler — esbuild-based bundler for customized plugins.
 *
 * Produces CommonJS bundles from TypeScript plugin source that can be
 * evaluated at runtime in both the main process and renderer.
 *
 * Platform modules (react, sdk, zod, etc.) are externalized —
 * they're provided by the host at runtime via a custom require().
 */

// esbuild is imported dynamically in bundle() — NOT at module load time.
// esbuild caches process.cwd() when its module loads (defaultWD), then passes
// it as `cwd` to child_process.spawn(). In packaged Electron apps, cwd points
// inside the ASAR (a file, not a directory), causing spawn ENOTDIR. By deferring
// the import, we ensure process.chdir() in main.ts runs first.
import type { BuildOptions, BuildResult, Plugin as EsbuildPlugin } from 'esbuild';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { PluginLogger } from '@tryvienna/sdk';

import { PLATFORM_EXTERNAL_PATTERNS } from '../../lib/plugin-runtime/platform-externals';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type BundleTarget = 'main' | 'renderer';

export interface BundleResult {
  /** The bundled JavaScript source code. */
  code: string;
  /** esbuild warnings (non-fatal). */
  warnings: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Bundler
// ─────────────────────────────────────────────────────────────────────────────

export class PluginBundler {
  private readonly logger: PluginLogger;
  // Cache the esbuild dynamic import so concurrent bundle() calls don't each
  // trigger a separate module load and esbuild service initialization.
  private esbuildPromise: Promise<typeof import('esbuild')> | null = null;
  // Serialize bundle operations per plugin to prevent concurrent esbuild builds
  // for the same plugin (e.g. hot-reload + manual reload racing).
  private readonly bundleLocks = new Map<string, Promise<BundleResult>>();

  constructor(deps: { logger: PluginLogger }) {
    this.logger = deps.logger;
  }

  private getEsbuild(): Promise<typeof import('esbuild')> {
    if (!this.esbuildPromise) {
      this.esbuildPromise = import('esbuild');
    }
    return this.esbuildPromise;
  }

  /**
   * Bundle a customized plugin from its directory.
   *
   * @param pluginDir — Absolute path to the customization directory
   * @param target — 'main' for Node.js (integrations/entities) or 'renderer' for browser (React components)
   * @returns Bundled CJS source code
   */
  async bundle(pluginDir: string, target: BundleTarget, opts?: { extraNodePaths?: string[] }): Promise<BundleResult> {
    // Serialize builds per plugin+target to prevent concurrent esbuild operations
    // on the same source (e.g. hot-reload timer fires while a manual reload is in progress).
    const lockKey = `${pluginDir}:${target}`;
    const existing = this.bundleLocks.get(lockKey);
    if (existing) {
      this.logger.info('Bundle already in progress, waiting', { pluginDir, target });
      return existing;
    }

    const promise = this.bundleInternal(pluginDir, target, opts?.extraNodePaths);
    this.bundleLocks.set(lockKey, promise);
    try {
      return await promise;
    } finally {
      this.bundleLocks.delete(lockKey);
    }
  }

  private async bundleInternal(pluginDir: string, target: BundleTarget, extraNodePaths?: string[]): Promise<BundleResult> {
    const entryPoint = this.resolveEntryPoint(pluginDir, target);
    if (!entryPoint) {
      throw new Error(`No entry point found in ${pluginDir}. Expected src/index.ts or index.ts`);
    }

    this.logger.info('Bundling plugin', { pluginDir, target, entryPoint });

    const buildOptions: BuildOptions = {
      entryPoints: [entryPoint],
      bundle: true,
      write: false,
      platform: target === 'main' ? 'node' : 'browser',
      format: 'cjs',
      target: 'es2022',
      external: this.buildExternalsList(pluginDir, target),
      nodePaths: this.buildNodePaths(pluginDir, extraNodePaths),
      jsx: 'automatic',
      loader: {
        '.ts': 'ts',
        '.tsx': 'tsx',
        '.js': 'js',
        '.jsx': 'jsx',
      },
      plugins: [this.cssPlugin(target)],
      minify: false,
      sourcemap: false,
      logLevel: 'warning',
    };

    let result: BuildResult;
    try {
      const esbuild = await this.getEsbuild();
      result = await esbuild.build(buildOptions);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error('esbuild bundle failed', { pluginDir, target, error: message });
      // If the error is the version mismatch crash, add diagnostic context
      if (message.includes('The service was stopped') || message.includes('ENOTDIR')) {
        this.logger.error('This is likely an esbuild version mismatch or ASAR path issue', {
          ESBUILD_BINARY_PATH: process.env.ESBUILD_BINARY_PATH ?? '(not set)',
          cwd: process.cwd(),
        });
      }
      throw new Error(`Bundle failed for ${pluginDir}: ${message}`);
    }

    const code = result.outputFiles?.[0]?.text ?? '';
    if (!code) {
      throw new Error(`esbuild produced empty output for ${pluginDir}`);
    }

    const warnings = (result.warnings ?? []).map((w: { text: string }) => w.text);
    if (warnings.length > 0) {
      this.logger.warn('esbuild warnings', { pluginDir, target, warnings });
    }

    this.logger.info('Bundle complete', { pluginDir, target, size: code.length });
    return { code, warnings };
  }

  // ── Internal Helpers ────────────────────────────────────────────────────

  /**
   * Resolve the entry point for a plugin bundle.
   *
   * Convention: Plugins may provide a separate renderer entry point at
   * `src/renderer.ts` (or `.tsx`) containing only browser-safe code
   * (canvases, React components). When present, the renderer target uses
   * this file instead of `src/index.ts`.
   *
   * This follows Electron's pattern of explicit process separation —
   * plugins that import Node built-ins (node:fs, node:child_process) in
   * schema resolvers should provide a renderer entry to keep Node-only
   * code out of the browser bundle.
   *
   * If no renderer entry exists, falls back to the standard candidates
   * (backward compatible for plugins without Node-only code).
   */
  private resolveEntryPoint(pluginDir: string, target: BundleTarget): string | null {
    // For renderer target, prefer a dedicated renderer entry point
    if (target === 'renderer') {
      const rendererCandidates = [
        path.join(pluginDir, 'src', 'renderer.ts'),
        path.join(pluginDir, 'src', 'renderer.tsx'),
      ];
      const found = rendererCandidates.find((c) => existsSync(c));
      if (found) return found;
    }

    const candidates = [
      path.join(pluginDir, 'src', 'index.ts'),
      path.join(pluginDir, 'src', 'index.tsx'),
      path.join(pluginDir, 'index.ts'),
      path.join(pluginDir, 'index.tsx'),
    ];
    return candidates.find((c) => existsSync(c)) ?? null;
  }

  /**
   * Build the externals list: platform externals + workspace deps.
   *
   * Both targets externalize platform-provided modules (react, sdk, etc.).
   * Renderer additionally externalizes Node built-ins (node:*).
   * Main additionally externalizes workspace:* deps.
   *
   * Plugin-owned npm dependencies (e.g. @tiptap/react) are NOT externalized
   * — they get bundled into the plugin output via the plugin's node_modules
   * (added to nodePaths). Only platform modules and workspace deps are
   * provided by the host at runtime.
   */
  private buildExternalsList(pluginDir: string, target: BundleTarget): string[] {
    const externals = [...PLATFORM_EXTERNAL_PATTERNS];

    // Renderer bundles must externalize Node built-ins — plugins share a
    // single entry point for both targets, so main-only code (schema resolvers)
    // may import node:fs, node:path, etc. that are unreachable in the renderer.
    // We also externalize unprefixed bare specifiers (stream, http, etc.) since
    // some npm packages (e.g. @linear/sdk) import them without the node: prefix.
    if (target === 'renderer') {
      externals.push('node:*');
      externals.push(
        'assert', 'buffer', 'child_process', 'cluster', 'crypto', 'dgram',
        'dns', 'domain', 'events', 'fs', 'http', 'http2', 'https', 'net',
        'os', 'path', 'perf_hooks', 'punycode', 'querystring', 'readline',
        'stream', 'string_decoder', 'tls', 'tty', 'url', 'util', 'v8',
        'vm', 'worker_threads', 'zlib',
      );
    }

    // Externalize workspace:* deps (monorepo packages resolved by the host).
    // All other deps are bundled into the plugin — the host only provides
    // platform modules, not arbitrary npm packages.
    const pkgJsonPath = path.join(pluginDir, 'package.json');
    if (existsSync(pkgJsonPath)) {
      try {
        const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf-8')) as Record<string, unknown>;
        const deps = {
          ...(pkgJson['dependencies'] as Record<string, string> | undefined),
          ...(pkgJson['peerDependencies'] as Record<string, string> | undefined),
        };
        for (const [name, version] of Object.entries(deps)) {
          const isWorkspaceDep = typeof version === 'string' && version.startsWith('workspace:');
          if (isWorkspaceDep) {
            if (!externals.includes(name)) {
              externals.push(name);
              externals.push(name + '/*');
            }
          }
        }
      } catch {
        // Ignore parse errors — we'll still externalize the default list
      }
    }

    return externals;
  }

  /**
   * esbuild plugin that handles CSS imports in plugin code.
   *
   * Renderer: reads the CSS file and emits a JS module that injects a <style>
   * tag into the document head at runtime (idempotent — skips if already injected).
   *
   * Main: CSS is irrelevant in Node.js, so imports resolve to empty modules.
   */
  private cssPlugin(target: BundleTarget): EsbuildPlugin {
    return {
      name: 'vienna-plugin-css',
      setup(build) {
        build.onResolve({ filter: /\.css$/ }, (args) => ({
          path: path.resolve(args.resolveDir, args.path),
          namespace: 'vienna-css',
        }));

        build.onLoad({ filter: /.*/, namespace: 'vienna-css' }, (args) => {
          if (target === 'main') {
            // No-op for server-side bundles
            return { contents: '', loader: 'js' };
          }

          // Read CSS and emit a JS module that injects it at runtime
          const css = readFileSync(args.path, 'utf-8');
          const escapedCss = JSON.stringify(css);
          const styleId = JSON.stringify('vienna-css-' + path.basename(args.path, '.css'));

          const contents = `
            (function() {
              if (typeof document === 'undefined') return;
              if (document.getElementById(${styleId})) return;
              var style = document.createElement('style');
              style.id = ${styleId};
              style.textContent = ${escapedCss};
              document.head.appendChild(style);
            })();
          `;

          return { contents, loader: 'js' };
        });
      },
    };
  }

  private buildNodePaths(pluginDir: string, extraNodePaths?: string[]): string[] {
    const paths: string[] = [];
    const nodeModules = path.join(pluginDir, 'node_modules');
    if (existsSync(nodeModules)) paths.push(nodeModules);
    if (extraNodePaths) {
      for (const p of extraNodePaths) {
        if (existsSync(p) && !paths.includes(p)) paths.push(p);
      }
    }
    return paths;
  }
}
