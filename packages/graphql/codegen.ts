import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: './schema.graphql',
  documents: ['src/client/operations.ts'],
  generates: {
    './src/client/generated/': {
      preset: 'client',
      config: {
        useTypeImports: true,
        enumsAsTypes: true,
        scalars: {
          DateTime: 'string | number',
          JSON: 'Record<string, unknown>',
        },
      },
    },
  },
};

export default config;
