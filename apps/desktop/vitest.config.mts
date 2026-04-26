import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    environmentMatchGlobs: [['**/*.test.tsx', 'jsdom']],
    setupFiles: ['./src/test-setup.ts'],
    include: [
      'src/**/*.unit.test.ts',
      'src/**/*.unit.test.tsx',
      'src/**/*.integration.test.ts',
      'src/**/*.integration.test.tsx',
    ],
    exclude: ['node_modules', 'dist', 'out', '.vite', 'tests/**'],
    testTimeout: 10000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'json', 'html'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: [
        '**/*.test.ts',
        '**/*.test.tsx',
        'src/main.ts', // Electron bootstrap — requires app, BrowserWindow, safeStorage
        'src/preload.ts', // Electron preload — contextBridge one-liner
        'src/renderer.ts', // React DOM bootstrap — createRoot + render
        'src/test-setup.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
    pool: 'forks',
    server: {
      deps: {
        // Inline graphql + @vienna/* through Vite's transform pipeline to ensure
        // graphql module is evaluated exactly once (avoids CJS/ESM dual-load)
        inline: [/graphql/, /@vienna\//],
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
});
