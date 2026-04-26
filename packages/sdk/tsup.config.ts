import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'react/index': 'src/react/index.ts',
    'graphql/index': 'src/graphql/index.ts',
    codegen: 'src/codegen.ts',
  },
  format: ['esm'],
  dts: {
    compilerOptions: {
      composite: false,
      declarationMap: false,
    },
  },
  sourcemap: true,
  clean: true,
  external: [
    'zod',
    'react',
    'graphql',
    'graphql-tag',
    '@apollo/client',
    /^@apollo\/client\/.*/,
    '@graphql-typed-document-node/core',
  ],
});
