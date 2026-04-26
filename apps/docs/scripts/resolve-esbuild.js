#!/usr/bin/env node

/**
 * Resolves the correct esbuild binary for VitePress.
 *
 * The monorepo's esbuild 0.21.x module has a hardcoded ESBUILD_BINARY_PATH
 * from the desktop app's Electron forge build. This script finds the matching
 * platform-specific binary from the pnpm virtual store so VitePress works.
 */

import { existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'

const root = resolve(dirname(new URL(import.meta.url).pathname), '..', '..', '..')
const platform = `${process.platform}-${process.arch}`
const pnpmDir = resolve(root, 'node_modules', '.pnpm')

// Find esbuild 0.21.x directories in the pnpm virtual store
try {
  const entries = readdirSync(pnpmDir).filter(e => e.startsWith('esbuild@0.21'))
  for (const entry of entries) {
    const bin = resolve(pnpmDir, entry, 'node_modules', '@esbuild', platform, 'bin', 'esbuild')
    if (existsSync(bin)) {
      console.log(bin)
      process.exit(0)
    }
  }
} catch {
  // Fallback: let esbuild try to resolve itself
}
