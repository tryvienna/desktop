import type { TemplateContext } from '../types.ts';

/**
 * Version constants for @tryvienna packages used in generated scaffolds.
 * Update these when new versions of the SDK/UI are published to npm.
 */
const SDK_VERSION = '^0.1.6';
const UI_VERSION = '^0.0.6';

export function renderPackageJson(ctx: TemplateContext): string {
  const { naming } = ctx;

  return `{
  "name": "plugin-${naming.pluginName}",
  "version": "0.0.1",
  "private": true,
  "description": "${ctx.description}",
  "license": "Apache-2.0",
  "author": "Vienna contributors",
  "homepage": "https://tryvienna.dev/docs",
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./schema": "./src/schema.ts",
    "./ui": "./src/ui/index.ts"
  },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "codegen": "graphql-codegen --config codegen.ts",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format:check": "prettier --check .",
    "format": "prettier --write ."
  },
  "dependencies": {
    "@tryvienna/sdk": "${SDK_VERSION}",
    "zod": "^3.25.67"
  },
  "devDependencies": {
    "@graphql-codegen/cli": "^6.1.2",
    "@graphql-codegen/client-preset": "^5.2.3",
    "@graphql-typed-document-node/core": "^3.2.0",
    "@types/node": "^25.3.2",
    "@types/react": "^19.0.0",
    "@tryvienna/ui": "${UI_VERSION}",
    "graphql-tag": "^2.12.6",
    "lucide-react": "^0.500.0",
    "tsx": "^4.20.3",
    "typescript": "^5.9.3"
  }
}
`;
}
