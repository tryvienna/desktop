import { defineConfig } from 'vite';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { getBranchName } from './worktree';

const branch = getBranchName();
const commitSha = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
const channel = process.env.VIENNA_CHANNEL ?? 'production';

export default defineConfig(() => {
  return {
    define: {
      __VIENNA_BRANCH__: JSON.stringify(branch),
      __VIENNA_COMMIT__: JSON.stringify(commitSha),
      __VIENNA_CHANNEL__: JSON.stringify(channel),
    },
    resolve: {
      preserveSymlinks: false,
      alias: {
        // sharp is an optional image-processing dep of @huggingface/transformers.
        // We only use Whisper (audio), so stub it to avoid the native binary.
        sharp: path.resolve(__dirname, 'src/stubs/sharp.ts'),
      },
    },
    build: {
      rollupOptions: {
        external: [
          'better-sqlite3',
          '@vscode/ripgrep',
          // Plugin runtime: PluginBundler uses esbuild at runtime
          'esbuild',
          // Plugin runtime: evaluator provides these to plugins via custom require()
          // They must be available as-is at runtime, not bundled into the main process.
          'graphql',
          'graphql-tag',
          '@apollo/client',
          'react',
          'react/jsx-runtime',
          'react-dom',
          'lucide-react',
          'onnxruntime-node',
          '@parcel/watcher',
          '@loomhq/electron-click-through-workaround',
        ],
      },
    },
  };
});
