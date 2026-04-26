import fs from 'node:fs';
import path from 'node:path';

/**
 * Write a file map to disk under the given base directory.
 * Creates directories as needed. Skips if file already exists.
 */
export function writeFileMap(
  baseDir: string,
  files: Map<string, string>,
  options: { dryRun?: boolean } = {},
): void {
  if (options.dryRun) {
    console.log(`\nDry run — would create ${files.size} files in ${baseDir}/\n`);
    for (const filePath of [...files.keys()].sort()) {
      console.log(`  ${filePath}`);
    }
    console.log('');
    return;
  }

  for (const [relativePath, content] of files) {
    const fullPath = path.join(baseDir, relativePath);
    const dir = path.dirname(fullPath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(fullPath, content);
  }
}
