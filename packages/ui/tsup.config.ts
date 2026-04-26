import { defineConfig } from 'tsup';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'components/index': 'src/components/index.ts',
    'hooks/index': 'src/hooks/index.ts',
    'utils/index': 'src/utils/index.ts',
    'feed/index': 'src/feed/index.ts',
    'feed/prompt': 'src/feed/prompt.ts',
    'feed/parse-specs': 'src/feed/parse-specs.ts',
    'feed/parse-feed-md': 'src/feed/parse-feed-md.ts',
    'feed/types': 'src/feed/types.ts',
  },
  format: ['esm'],
  dts: {
    compilerOptions: {
      composite: false,
      declarationMap: false,
      jsx: 'react-jsx',
    },
  },
  sourcemap: true,
  clean: true,
  jsx: 'react-jsx',
  external: [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.peerDependencies || {}),
  ],
});
