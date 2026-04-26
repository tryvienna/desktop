import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.unit.test.ts', 'src/**/*.unit.test.tsx'],
  },
});
