import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: { cli: 'src/index.ts' },
    format: ['esm'],
    dts: false,
    sourcemap: true,
    clean: true,
    banner: { js: '#!/usr/bin/env node' },
    external: ['commander'],
  },
  {
    entry: { 'generate-docs': 'src/generate-docs.ts' },
    format: ['esm'],
    dts: false,
    sourcemap: true,
    external: ['commander'],
  },
]);
