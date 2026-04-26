#!/usr/bin/env node

// Use Node's built-in TypeScript support
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const entry = path.join(__dirname, '..', 'src', 'index.ts');

try {
  execFileSync(process.execPath, [
    '--experimental-strip-types',
    '--experimental-transform-types',
    '--no-warnings',
    entry,
    ...process.argv.slice(2),
  ], { stdio: 'inherit' });
} catch (e) {
  if (e.status != null) {
    // execFileSync throws on non-zero exit — exit code already propagated via stdio
    process.exit(e.status);
  }
  // Unexpected error (e.g. Node version doesn't support --experimental-strip-types)
  console.error(e.message || e);
  process.exit(1);
}
