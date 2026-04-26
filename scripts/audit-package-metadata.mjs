#!/usr/bin/env node
/**
 * audit-package-metadata.mjs
 *
 * Verifies every workspace package.json declares the OSS metadata we
 * expect for the open-source repo. Runs in under a second and is safe
 * to call from CI or a pre-push hook.
 *
 * Exits 0 if every package.json passes, 1 with a summary otherwise.
 *
 * Usage:
 *   node scripts/audit-package-metadata.mjs
 *   pnpm audit:metadata   (if wired into package.json)
 */

import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { relative } from 'node:path';

const EXPECTED_LICENSE = 'Apache-2.0';
// Legitimate repo-URL fragments. The main monorepo lives at tryvienna/desktop;
// the npm-published packages (@tryvienna/sdk, @tryvienna/ui) are allowed to
// point at their own tryvienna/* repos for npm discoverability.
const ALLOWED_REPO_URL_PARTS = ['github.com/tryvienna/'];
const REQUIRED_FIELDS = ['license', 'author', 'homepage', 'repository', 'bugs'];

function urlAllowed(url) {
  return ALLOWED_REPO_URL_PARTS.some((p) => url.includes(p));
}

const files = execSync(
  `find . -name package.json -not -path './node_modules/*' -not -path '*/node_modules/*' -not -path './scripts/plugin-boilerplate/*'`,
  { encoding: 'utf8' },
)
  .trim()
  .split('\n')
  .filter(Boolean)
  .sort();

let problems = 0;

for (const file of files) {
  const pkg = JSON.parse(readFileSync(file, 'utf8'));
  const issues = [];

  for (const key of REQUIRED_FIELDS) {
    if (!pkg[key]) issues.push(`missing ${key}`);
  }

  if (pkg.license && pkg.license !== EXPECTED_LICENSE) {
    issues.push(`license is ${pkg.license}, expected ${EXPECTED_LICENSE}`);
  }

  const repoUrl =
    typeof pkg.repository === 'string' ? pkg.repository : pkg.repository?.url;
  if (repoUrl && !urlAllowed(repoUrl)) {
    issues.push(`repository URL does not reference tryvienna/desktop or tryvienna/* (got: ${repoUrl})`);
  }

  const bugsUrl = typeof pkg.bugs === 'string' ? pkg.bugs : pkg.bugs?.url;
  if (bugsUrl && !urlAllowed(bugsUrl)) {
    issues.push(`bugs URL does not reference tryvienna/desktop or tryvienna/* (got: ${bugsUrl})`);
  }

  const rel = relative(process.cwd(), file);
  if (issues.length === 0) {
    console.log(`  ok  ${rel}`);
  } else {
    problems += issues.length;
    console.log(`  ✗   ${rel}`);
    for (const issue of issues) console.log(`        — ${issue}`);
  }
}

console.log('');
console.log(`Scanned ${files.length} package.json files, found ${problems} issue(s).`);
process.exit(problems === 0 ? 0 : 1);
