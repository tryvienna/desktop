// Parse CHANGELOG.md into JSON for the web changelog page.
//
// Usage:
//   node scripts/parse-changelog.js              # generate changelogs.json at CHANGELOG_JSON_OUT or default
//   node scripts/parse-changelog.js --version v0.0.7  # print markdown for a single version (used by release.sh)
//
// The default output path is apps/web/public/changelogs.json (used by the
// private web repo). If apps/web/public/ does not exist (OSS checkout), the
// JSON generation step is skipped unless CHANGELOG_JSON_OUT points elsewhere.

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const changelogFile = path.join(repoRoot, 'CHANGELOG.md');
const defaultOutput = path.join(repoRoot, 'apps/web/public/changelogs.json');
const outputFile = process.env.CHANGELOG_JSON_OUT
  ? path.resolve(process.env.CHANGELOG_JSON_OUT)
  : defaultOutput;

function parseChangelog() {
  const changelog = fs.readFileSync(changelogFile, 'utf8');
  const lines = changelog.split('\n');

  const entries = [];
  let current = null;
  let currentSection = null;

  for (const line of lines) {
    const versionMatch = line.match(/^## (v[\d.]+)\s*(?:—|-|–)\s*(.+)$/);
    if (versionMatch) {
      if (current) entries.push(current);
      current = { version: versionMatch[1], date: versionMatch[2].trim(), sections: {} };
      currentSection = null;
      continue;
    }

    if (!current) continue;

    const sectionMatch = line.match(/^### (.+)$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1].toLowerCase();
      current.sections[currentSection] = [];
      continue;
    }

    if (currentSection && line.startsWith('- ')) {
      current.sections[currentSection].push(line.slice(2).trim());
    }
  }
  if (current) entries.push(current);

  return entries;
}

// --version flag: print the markdown body for a single version to stdout
const versionFlagIdx = process.argv.indexOf('--version');
if (versionFlagIdx !== -1) {
  const targetVersion = process.argv[versionFlagIdx + 1];
  if (!targetVersion) {
    process.stderr.write('Error: --version requires a version argument (e.g. v0.0.7)\n');
    process.exit(1);
  }
  const entries = parseChangelog();
  const entry = entries.find((e) => e.version === targetVersion || e.version === `v${targetVersion}`);
  if (!entry) process.exit(0);

  const sectionOrder = ['new', 'improved', 'fixed', 'removed', 'security'];
  const lines = [];
  for (const key of sectionOrder) {
    const items = entry.sections[key];
    if (!items || items.length === 0) continue;
    lines.push(`### ${key.charAt(0).toUpperCase() + key.slice(1)}`);
    for (const item of items) lines.push(`- ${item}`);
    lines.push('');
  }
  process.stdout.write(lines.join('\n').trim());
  process.exit(0);
}

// Default: generate the full JSON file, but skip if the target parent dir
// doesn't already exist AND the user didn't explicitly set CHANGELOG_JSON_OUT.
// This keeps the OSS checkout from failing where apps/web is absent.
const outputDir = path.dirname(outputFile);
if (!process.env.CHANGELOG_JSON_OUT && !fs.existsSync(outputDir)) {
  console.log(`Skipping changelog JSON: ${outputDir} does not exist (OSS checkout).`);
  process.exit(0);
}

const entries = parseChangelog();
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputFile, JSON.stringify(entries, null, 2) + '\n');
console.log(`Generated ${entries.length} changelog entries → ${path.relative(repoRoot, outputFile)}`);
