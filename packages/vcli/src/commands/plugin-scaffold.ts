import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { Command } from 'commander';
import type { TemplateContext, CanvasType } from '../types.ts';

const execFileAsync = promisify(execFile);
import { buildNamingContext, buildEntityNaming } from '../naming.ts';
import {
  validatePluginName,
  parseCanvases,
  parseAuth,
  parseEntities,
  expandCanvases,
} from '../validation.ts';
import { buildFileMap } from '../templates/index.ts';
import { writeFileMap } from '../writer.ts';

interface ScaffoldOptions {
  name: string;
  canvas: string;
  entity: string;
  auth: string;
  description: string;
  dryRun: boolean;
  output?: string;
  autoLoad: boolean;
}

/**
 * Detect the package manager to use for a given directory.
 * Prefers pnpm if a lockfile is present or a pnpm workspace owns the directory.
 */
function detectPackageManager(dir: string): 'pnpm' | 'yarn' | 'bun' | 'npm' {
  if (fs.existsSync(path.join(dir, 'pnpm-lock.yaml'))) return 'pnpm';
  if (fs.existsSync(path.join(dir, 'yarn.lock'))) return 'yarn';
  if (fs.existsSync(path.join(dir, 'bun.lockb')) || fs.existsSync(path.join(dir, 'bun.lock'))) return 'bun';
  let parent = path.dirname(dir);
  while (parent !== path.dirname(parent)) {
    if (fs.existsSync(path.join(parent, 'pnpm-workspace.yaml'))) return 'pnpm';
    if (fs.existsSync(path.join(parent, 'pnpm-lock.yaml'))) return 'pnpm';
    if (fs.existsSync(path.join(parent, 'yarn.lock'))) return 'yarn';
    if (fs.existsSync(path.join(parent, 'bun.lockb')) || fs.existsSync(path.join(parent, 'bun.lock'))) return 'bun';
    parent = path.dirname(parent);
  }
  return 'npm';
}

/**
 * Find the registry plugins/ directory by walking up from cwd looking for registry.json.
 * Falls back to cwd if not in a registry repo.
 */
function resolveOutputDir(pluginName: string, explicitOutput?: string): string {
  if (explicitOutput) {
    return path.resolve(explicitOutput, pluginName);
  }

  // Walk up to find registry.json
  let dir = process.cwd();
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, 'registry.json'))) {
      return path.join(dir, 'plugins', pluginName);
    }
    dir = path.dirname(dir);
  }

  // Fallback: create in cwd
  return path.resolve(process.cwd(), pluginName);
}

export function registerPluginScaffoldCommand(program: Command): void {
  program
    .command('scaffold')
    .description('Scaffold a new Vienna plugin')
    .requiredOption('--name <name>', 'Plugin name (kebab-case)')
    .option('--canvas <canvases>', 'Canvases to include (comma-separated: sidebar,drawer,menu-bar,feed)', 'sidebar,drawer')
    .option('--entity <entities>', 'Entity types to scaffold (comma-separated, kebab-case)', '')
    .option('--auth <type>', 'Authentication pattern (oauth, pat, api-key, none)', 'none')
    .option('--description <desc>', 'Plugin description', 'A Vienna plugin')
    .option('--dry-run', 'Preview files without writing', false)
    .option('--output <dir>', 'Output directory (default: auto-detect registry or cwd)')
    .option('--auto-load', 'Register plugin for automatic loading on next app start', false)
    .action(async (opts: ScaffoldOptions) => {
      // Validate
      const nameErr = validatePluginName(opts.name);
      if (nameErr) {
        console.error(`Error: ${nameErr}`);
        process.exit(1);
      }

      let canvases: CanvasType[];
      try {
        canvases = parseCanvases(opts.canvas);
      } catch (e) {
        console.error(`Error: ${(e as Error).message}`);
        process.exit(1);
      }

      let auth;
      try {
        auth = parseAuth(opts.auth);
      } catch (e) {
        console.error(`Error: ${(e as Error).message}`);
        process.exit(1);
      }

      let entityNames: string[];
      try {
        entityNames = parseEntities(opts.entity);
      } catch (e) {
        console.error(`Error: ${(e as Error).message}`);
        process.exit(1);
      }

      // Build context
      const ctx: TemplateContext = {
        naming: buildNamingContext(opts.name),
        entities: entityNames.map(buildEntityNaming),
        canvases: expandCanvases(canvases),
        auth,
        description: opts.description,
      };

      // Generate file map
      const files = buildFileMap(ctx);

      // Resolve output directory
      const outputDir = resolveOutputDir(opts.name, opts.output);

      if (!opts.dryRun && fs.existsSync(outputDir)) {
        console.error(`Error: Directory "${outputDir}" already exists.`);
        process.exit(1);
      }

      // Write
      writeFileMap(outputDir, files, { dryRun: opts.dryRun });

      if (!opts.dryRun) {
        console.log(`\nCreated plugin "${opts.name}" at ${outputDir}/\n`);
        console.log(`Generated ${files.size} files:\n`);
        for (const filePath of [...files.keys()].sort()) {
          console.log(`  ${filePath}`);
        }

        // Auto-install dependencies
        const pm = detectPackageManager(outputDir);
        process.stdout.write(`\nInstalling dependencies with ${pm}…`);
        let installOk = false;
        try {
          await execFileAsync(pm, ['install'], { cwd: outputDir, timeout: 120_000 });
          console.log(' done');
          installOk = true;
        } catch (err) {
          console.log('');
          const msg = err instanceof Error ? err.message : String(err);
          console.warn(`⚠ Could not install dependencies automatically: ${msg}`);
          console.warn(`  Run \`${pm} install\` in ${path.relative(process.cwd(), outputDir)} manually.`);
        }

        // Register for auto-load if requested (only when install succeeded)
        if (opts.autoLoad) {
          if (!installOk) {
            console.log('  ⚠ Skipping auto-load registration — install must succeed first\n');
          } else {
            const registered = registerForAutoLoad(ctx.naming.pluginId, outputDir);
            if (registered) {
              console.log('  ✓ Registered for auto-load — plugin will load on next Vienna start\n');
            } else {
              console.log('  ⚠ Could not register for auto-load — load the plugin manually in Vienna\n');
            }
          }
        }

        console.log('Next steps:');
        console.log(`  cd ${path.relative(process.cwd(), outputDir)}`);
        console.log('  # Start editing src/index.ts');
        console.log('');
      }
    });
}

/**
 * Find Vienna's data directory. Checks VIENNA_DATA_DIR env var first,
 * then falls back to the platform-specific default.
 */
function getViennaDataDir(): string {
  if (process.env.VIENNA_DATA_DIR) return process.env.VIENNA_DATA_DIR;

  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'Vienna');
  }
  if (process.platform === 'win32') {
    return path.join(process.env.APPDATA ?? path.join(os.homedir(), 'AppData', 'Roaming'), 'Vienna');
  }
  // Linux / other
  return path.join(process.env.XDG_CONFIG_HOME ?? path.join(os.homedir(), '.config'), 'Vienna');
}

/**
 * Register a plugin in Vienna's .local-plugins.json for auto-load on next startup.
 *
 * Uses the most recently modified profile directory as a heuristic for the active
 * profile. This works well for single-profile installs (the common case) but may
 * pick the wrong profile when multiple profiles exist. A future improvement could
 * accept an explicit profile ID or read from a "last-active" marker file.
 */
function registerForAutoLoad(pluginId: string, pluginDir: string): boolean {
  try {
    const dataDir = getViennaDataDir();
    const profilesDir = path.join(dataDir, 'profiles');

    if (!fs.existsSync(profilesDir)) return false;

    // Find the most recently modified profile (heuristic — see function doc)
    const profiles = fs.readdirSync(profilesDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => {
        const fullPath = path.join(profilesDir, d.name);
        return { name: d.name, path: fullPath, mtime: fs.statSync(fullPath).mtimeMs };
      })
      .sort((a, b) => b.mtime - a.mtime);

    if (profiles.length === 0) return false;

    const customizationsDir = path.join(profiles[0].path, 'customizations');
    const manifestPath = path.join(customizationsDir, '.local-plugins.json');

    // Read existing manifest
    let manifest: Record<string, string> = {};
    if (fs.existsSync(manifestPath)) {
      try {
        manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      } catch {
        // Corrupted file — start fresh
      }
    }

    // Merge and write
    manifest[pluginId] = path.resolve(pluginDir);
    fs.mkdirSync(customizationsDir, { recursive: true });
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf-8');
    return true;
  } catch {
    return false;
  }
}
