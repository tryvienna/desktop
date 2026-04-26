import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { getBranchName, getWorktreePorts } from './worktree';

const ports = getWorktreePorts(getBranchName());

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: ports.vite,
    strictPort: true,
  },
  resolve: {
    // Follow pnpm symlinks so Vite resolves transitive deps from
    // the real path inside .pnpm/ where sibling deps are linked.
    preserveSymlinks: false,
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    entries: ['index.html'],
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
    ],
    exclude: [
      '@vienna/claude-session',
      '@parcel/watcher',
    ],
  },
});
