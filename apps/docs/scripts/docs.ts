#!/usr/bin/env tsx
/**
 * docs.ts — Interactive CLI for the Vienna docs pipeline.
 *
 * Usage:
 *   pnpm --filter @vienna/docs docs          # interactive menu
 *   pnpm --filter @vienna/docs docs dev      # generate + storybook + dev server
 *   pnpm --filter @vienna/docs docs build    # full production build
 *   pnpm --filter @vienna/docs docs generate # regenerate all reference docs
 *   pnpm --filter @vienna/docs docs preview  # preview production build
 */

import { execSync, spawn, type ChildProcess } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { existsSync, mkdirSync, cpSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DOCS_ROOT = resolve(__dirname, '..');
const MONO_ROOT = resolve(DOCS_ROOT, '..', '..');
const UI_ROOT = resolve(MONO_ROOT, 'packages/ui');
const STORYBOOK_OUT = resolve(UI_ROOT, 'storybook-static');
const STORYBOOK_DEST = resolve(DOCS_ROOT, 'public/_storybook');

// ─── Helpers ────────────────────────────────────────────────────────────────

const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

function log(msg: string) {
  console.log(`${DIM}[docs]${RESET} ${msg}`);
}

function step(msg: string) {
  console.log(`\n${CYAN}▸${RESET} ${BOLD}${msg}${RESET}`);
}

function success(msg: string) {
  console.log(`${GREEN}✓${RESET} ${msg}`);
}

function warn(msg: string) {
  console.log(`${YELLOW}!${RESET} ${msg}`);
}

function fail(msg: string) {
  console.error(`${RED}✗${RESET} ${msg}`);
}

function run(cmd: string, opts?: { cwd?: string; silent?: boolean }) {
  const cwd = opts?.cwd ?? MONO_ROOT;
  if (!opts?.silent) log(`${DIM}$ ${cmd}${RESET}`);
  try {
    execSync(cmd, { cwd, stdio: opts?.silent ? 'pipe' : 'inherit' });
    return true;
  } catch {
    return false;
  }
}

function spawnAsync(cmd: string, args: string[], cwd: string): ChildProcess {
  return spawn(cmd, args, { cwd, stdio: 'inherit', shell: true });
}

// ─── Pipeline Steps ─────────────────────────────────────────────────────────

function generateSdkReference(): boolean {
  step('Generating SDK reference');
  return run('pnpm --filter @vienna/docs exec tsx scripts/generate-sdk-reference.ts');
}

function generateUiReference(): boolean {
  step('Generating UI component reference');
  return run('pnpm --filter @vienna/docs exec tsx scripts/generate-ui-reference.ts');
}

function generateAll(): boolean {
  const sdk = generateSdkReference();
  const ui = generateUiReference();
  if (sdk && ui) {
    success('All references generated');
    return true;
  }
  if (!sdk) fail('SDK reference generation failed');
  if (!ui) fail('UI reference generation failed');
  return false;
}

function buildStorybook(): boolean {
  step('Building Storybook');
  if (run('pnpm --filter @tryvienna/ui build-storybook')) {
    success('Storybook built');
    return true;
  }
  fail('Storybook build failed');
  return false;
}

function copyStorybook(): boolean {
  step('Copying Storybook to docs public');
  if (!existsSync(STORYBOOK_OUT)) {
    warn('storybook-static not found — run "Build Storybook" first');
    return false;
  }
  mkdirSync(resolve(DOCS_ROOT, 'public'), { recursive: true });
  if (existsSync(STORYBOOK_DEST)) {
    rmSync(STORYBOOK_DEST, { recursive: true });
  }
  cpSync(STORYBOOK_OUT, STORYBOOK_DEST, { recursive: true });
  success(`Copied to ${STORYBOOK_DEST.replace(MONO_ROOT + '/', '')}`);
  return true;
}

function buildDocs(): boolean {
  step('Building VitePress');
  if (run('pnpm --filter @vienna/docs build')) {
    success('VitePress build complete');
    return true;
  }
  fail('VitePress build failed');
  return false;
}

function devServer(): void {
  step('Starting VitePress dev server');
  log('Press Ctrl+C to stop\n');
  const child = spawnAsync(
    'pnpm', ['--filter', '@vienna/docs', 'dev'],
    MONO_ROOT,
  );
  child.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      fail(`Dev server exited with code ${code}`);
    }
  });
}

function previewServer(): void {
  step('Starting VitePress preview server');
  log('Press Ctrl+C to stop\n');
  const child = spawnAsync(
    'pnpm', ['--filter', '@vienna/docs', 'preview'],
    MONO_ROOT,
  );
  child.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      fail(`Preview server exited with code ${code}`);
    }
  });
}

// ─── Compound Commands ──────────────────────────────────────────────────────

function fullBuild(): boolean {
  const sb = buildStorybook();
  if (!sb) return false;
  if (!copyStorybook()) return false;
  if (!generateAll()) return false;
  if (!buildDocs()) return false;
  console.log(`\n${GREEN}${BOLD}Build complete!${RESET}`);
  console.log(`${DIM}Run \`pnpm --filter @vienna/docs docs preview\` to preview.${RESET}\n`);
  return true;
}

function devMode(): void {
  // Generate references first (fast), then start dev server
  // Skip storybook build for speed — use existing storybook-static if available
  generateAll();
  if (existsSync(STORYBOOK_OUT)) {
    copyStorybook();
  } else {
    warn('No storybook-static found. Component previews will not load.');
    warn('Run `pnpm --filter @vienna/docs docs storybook` to build it.\n');
  }
  devServer();
}

// ─── Interactive Menu ───────────────────────────────────────────────────────

const COMMANDS: Record<string, { label: string; description: string; action: () => void }> = {
  dev: {
    label: 'Dev',
    description: 'Generate references + start dev server',
    action: devMode,
  },
  build: {
    label: 'Build',
    description: 'Full production build (storybook + generate + vitepress)',
    action: () => { fullBuild(); },
  },
  generate: {
    label: 'Generate',
    description: 'Regenerate all reference docs (SDK + UI components)',
    action: () => { generateAll(); },
  },
  'generate:sdk': {
    label: 'Generate SDK',
    description: 'Regenerate SDK reference only',
    action: () => { generateSdkReference(); },
  },
  'generate:ui': {
    label: 'Generate UI',
    description: 'Regenerate UI component reference only',
    action: () => { generateUiReference(); },
  },
  storybook: {
    label: 'Storybook',
    description: 'Build Storybook + copy to docs public',
    action: () => { buildStorybook() && copyStorybook(); },
  },
  preview: {
    label: 'Preview',
    description: 'Preview the production build locally',
    action: previewServer,
  },
};

function showMenu() {
  console.log(`\n${BOLD}Vienna Docs${RESET} ${DIM}— interactive pipeline${RESET}\n`);
  const entries = Object.entries(COMMANDS);
  for (let i = 0; i < entries.length; i++) {
    const [key, cmd] = entries[i]!;
    console.log(`  ${BOLD}${i + 1}${RESET}  ${cmd.label.padEnd(16)} ${DIM}${cmd.description}${RESET}`);
  }
  console.log(`\n  ${BOLD}q${RESET}  Quit\n`);
}

async function interactive() {
  showMenu();

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const prompt = () => new Promise<string>((resolve) => {
    rl.question(`${CYAN}>${RESET} `, (answer) => resolve(answer.trim()));
  });

  const entries = Object.entries(COMMANDS);

  while (true) {
    const input = await prompt();

    if (input === 'q' || input === 'quit' || input === 'exit') {
      rl.close();
      break;
    }

    // Match by number
    const num = parseInt(input, 10);
    if (num >= 1 && num <= entries.length) {
      const [, cmd] = entries[num - 1]!;
      rl.close();
      cmd.action();
      return;
    }

    // Match by name
    const cmd = COMMANDS[input];
    if (cmd) {
      rl.close();
      cmd.action();
      return;
    }

    warn(`Unknown command: "${input}". Enter a number (1-${entries.length}) or command name.`);
  }
}

// ─── CLI Entry ──────────────────────────────────────────────────────────────

const arg = process.argv[2];

if (arg && COMMANDS[arg]) {
  COMMANDS[arg]!.action();
} else if (arg === 'help' || arg === '--help' || arg === '-h') {
  console.log(`\n${BOLD}Usage:${RESET} pnpm --filter @vienna/docs docs [command]\n`);
  console.log('Commands:');
  for (const [key, cmd] of Object.entries(COMMANDS)) {
    console.log(`  ${key.padEnd(18)} ${cmd.description}`);
  }
  console.log('\nIf no command is given, an interactive menu is shown.\n');
} else if (arg) {
  fail(`Unknown command: "${arg}"`);
  console.log(`Run with --help to see available commands.`);
  process.exit(1);
} else {
  interactive();
}
