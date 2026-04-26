import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    pool: 'vmForks',
    server: {
      deps: {
        // Inline all deps through Vite's transform pipeline to ensure
        // graphql module is evaluated exactly once
        inline: true,
      },
    },
  },
});
