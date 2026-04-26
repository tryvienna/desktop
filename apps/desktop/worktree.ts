/**
 * Worktree-aware dev isolation utility.
 *
 * Imported by Vite configs, Playwright config, and E2E globalSetup at
 * config time (Node.js). NOT bundled into the Electron app — the values
 * are injected as build-time constants via Vite `define`.
 */

import { execFileSync, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

let _cachedBranch: string | undefined;

/**
 * Returns the current git branch name, or 'default' if detection fails.
 * Result is memoized since the branch won't change within a single process.
 */
export function getBranchName(): string {
  if (_cachedBranch !== undefined) return _cachedBranch;
  try {
    _cachedBranch = execSync('git rev-parse --abbrev-ref HEAD', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch {
    _cachedBranch = 'default';
  }
  return _cachedBranch;
}

/**
 * Deterministic hash of a string → port in [basePort, basePort + 99].
 */
export function derivePort(seed: string, basePort: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  return basePort + (Math.abs(hash) % 100);
}

/**
 * Derive deterministic dev-server ports for a given branch.
 *
 * Ranges chosen to avoid the previous defaults (5173, 3100):
 *   - vite:     5200 – 5299
 *   - profiler: 3200 – 3299
 */
export function getWorktreePorts(branch: string) {
  return {
    vite: derivePort(branch, 5200),
    profiler: derivePort(branch, 3200),
  };
}

/**
 * Patch the local Electron.app so the macOS Dock shows the branch name
 * instead of "Electron".
 *
 * Renames the .app bundle (e.g. Electron.app → Vienna (branch).app),
 * updates path.txt so `require('electron')` still resolves, patches
 * Info.plist CFBundleName + CFBundleIdentifier, and invalidates the
 * LaunchServices cache for the bundle.
 *
 * Breaks pnpm hardlinks first (cp + mv) so the global store is untouched.
 */
export function patchElectronAppName(branch: string): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const electronBin = require('electron') as unknown as string;
    const contentsDir = path.resolve(electronBin, '..', '..');
    const originalAppDir = path.resolve(contentsDir, '..');
    const distDir = path.dirname(originalAppDir);
    const electronPkgDir = path.resolve(distDir, '..');
    const pathTxtFile = path.join(electronPkgDir, 'path.txt');

    const appName = `Vienna (${branch})`;
    const newAppDir = path.join(distDir, `${appName}.app`);

    // Already renamed from a previous run — ensure plist is current and
    // path.txt is correct. pnpm install can reset path.txt to 'Electron.app'
    // via content-addressable hardlinks even though the renamed .app still
    // exists. If path.txt is stale, fix it and bust the require() cache so
    // forge's locateElectronExecutable reads the updated value at spawn time.
    if (fs.existsSync(newAppDir)) {
      const expectedRelPath = `${appName}.app/Contents/MacOS/Electron`;
      const currentRelPath = fs.readFileSync(pathTxtFile, 'utf-8').trim();
      if (currentRelPath !== expectedRelPath) {
        breakHardlink(pathTxtFile);
        fs.writeFileSync(pathTxtFile, expectedRelPath, 'utf8');
        // Bust the require cache so forge re-evaluates the electron module
        // and picks up the corrected path at spawn time.
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete require.cache[require.resolve('electron')];
      }
      patchPlist(path.join(newAppDir, 'Contents', 'Info.plist'), appName, branch);
      console.log(`  Dock name → "${appName}"`);
      return;
    }

    if (!fs.existsSync(originalAppDir)) {
      // Binary not downloaded yet (new worktree, pnpm skipped postinstall).
      // Run electron's install.js to fetch it, then retry.
      try {
        const installScript = path.join(electronPkgDir, 'install.js');
        if (fs.existsSync(installScript)) {
          console.log(`  Downloading Electron binary…`);
          execFileSync(process.execPath, [installScript], { stdio: 'inherit' });
        }
      } catch {
        // Non-fatal — forge will report ENOENT on spawn
      }
      if (!fs.existsSync(originalAppDir)) return;
    }

    // Rename the .app bundle
    fs.renameSync(originalAppDir, newAppDir);

    // Update path.txt so require('electron') returns the new path
    const newRelPath = `${appName}.app/Contents/MacOS/Electron`;
    breakHardlink(pathTxtFile);
    fs.writeFileSync(pathTxtFile, newRelPath, 'utf8');
    // Bust the require cache so forge re-evaluates the electron module
    // and picks up the corrected path at spawn time.
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete require.cache[require.resolve('electron')];

    // Patch Info.plist
    const plistPath = path.join(newAppDir, 'Contents', 'Info.plist');
    breakHardlink(plistPath);
    patchPlist(plistPath, appName, branch);

    console.log(`  Dock name → "${appName}"`);
  } catch {
    // Non-fatal — Dock will just show "Electron"
  }
}

/**
 * Generate a dev icon with the branch name on the orange bar.
 * Returns the path to the generated PNG, or the static icon-dev.png on failure.
 */
export function generateDevIcon(branch: string): string {
  return generateLabeledIcon(branch, 'dev-icon.png');
}

/**
 * Generate a staging icon with the channel name on a yellow bar.
 * Returns the path to the generated .icns (macOS) or .png, or the base icon on failure.
 */
export function generateStagingIcon(channel: string): string {
  const png = generateLabeledIcon(channel, 'staging-icon.png', '#D4A017');
  // For packaged builds, convert PNG → .icns so Forge can embed it
  const icns = png.replace(/\.png$/, '.icns');
  try {
    pngToIcns(png, icns);
    return icns;
  } catch {
    return png;
  }
}

/**
 * Generate an icon with a colored label bar.
 * Returns the path to the generated PNG, or a fallback on failure.
 */
function generateLabeledIcon(label: string, filename: string, barColor?: string): string {
  const desktopRoot = path.resolve(__dirname);
  const baseIcon = path.join(desktopRoot, 'resources', 'icon.png');
  const script = path.join(desktopRoot, 'scripts', 'generate-dev-icon.py');
  // Write outside .vite/ — Forge's Vite plugin cleans that directory after generateAssets.
  const outDir = path.join(desktopRoot, '.generated');
  const outIcon = path.join(outDir, filename);
  const fallback = path.join(desktopRoot, 'resources', 'icon-dev.png');

  try {
    fs.mkdirSync(outDir, { recursive: true });
    const args = [script, label, baseIcon, outIcon];
    if (barColor) args.push(barColor);
    execFileSync('python3', args, {
      stdio: 'pipe',
      timeout: 5000,
    });
    return outIcon;
  } catch {
    return fallback;
  }
}

function breakHardlink(filePath: string): void {
  if (!fs.existsSync(filePath)) return;
  const tmp = `${filePath}.tmp`;
  fs.copyFileSync(filePath, tmp);
  fs.renameSync(tmp, filePath);
}

function plistBuddy(plistPath: string, command: string): void {
  execFileSync('/usr/libexec/PlistBuddy', ['-c', command, plistPath], {
    stdio: 'pipe',
  });
}

/**
 * Convert a 1024x1024 PNG to a macOS .icns file using sips + iconutil.
 */
function pngToIcns(pngPath: string, icnsPath: string): void {
  const iconsetDir = `${icnsPath}.iconset`;
  fs.mkdirSync(iconsetDir, { recursive: true });

  const sizes = [16, 32, 64, 128, 256, 512];
  for (const s of sizes) {
    execFileSync('sips', ['-z', `${s}`, `${s}`, pngPath, '--out', path.join(iconsetDir, `icon_${s}x${s}.png`)], { stdio: 'pipe' });
    execFileSync('sips', ['-z', `${s * 2}`, `${s * 2}`, pngPath, '--out', path.join(iconsetDir, `icon_${s}x${s}@2x.png`)], { stdio: 'pipe' });
  }

  execFileSync('iconutil', ['-c', 'icns', iconsetDir, '-o', icnsPath], { stdio: 'pipe' });
  fs.rmSync(iconsetDir, { recursive: true, force: true });
}

function patchPlist(plistPath: string, appName: string, branch: string): void {
  if (!fs.existsSync(plistPath)) return;

  const bundleId = `com.vienna.dev.${branch.replace(/[^a-zA-Z0-9.-]/g, '-')}`;

  // execFileSync passes arguments as an array — no shell interpolation,
  // so branch names with special characters can't cause injection.
  plistBuddy(plistPath, `Set :CFBundleName ${appName}`);
  plistBuddy(plistPath, `Set :CFBundleIdentifier ${bundleId}`);

  // CFBundleDisplayName may not exist yet
  try {
    plistBuddy(plistPath, `Set :CFBundleDisplayName ${appName}`);
  } catch {
    plistBuddy(plistPath, `Add :CFBundleDisplayName string ${appName}`);
  }
}
