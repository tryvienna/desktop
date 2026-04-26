import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    preserveSymlinks: false,
    dedupe: ['graphql'],
  },
  server: {
    port: 5190,
    proxy: {
      '/api': 'http://localhost:3200',
    },
  },
});
