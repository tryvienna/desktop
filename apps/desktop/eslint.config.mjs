import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      '.vite/',
      'out/',
      'dist/',
      'node_modules/',
      'coverage/',
      'test-results/',
      'playwright-report/',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-console': 'error',
    },
  },
  {
    files: ['tests/**/*.ts'],
    rules: {
      'react-hooks/rules-of-hooks': 'off',
    },
  },
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[object.name='process'][property.name='env']",
          message:
            'Direct access to process.env is prohibited. For config values use @vienna/env. For child process environments use getEnrichedEnv() from @vienna/shell-env.',
        },
        {
          selector: "MemberExpression[object.type='MetaProperty'][property.name='env']",
          message:
            'Direct access to import.meta.env is prohibited. Import from @vienna/env instead. See packages/env/CLAUDE.md.',
        },
        {
          selector: "MemberExpression[object.name='window']",
          message:
            'Direct window property access is prohibited in renderer code. Use getApi()/getEvents() from @vienna/ipc/renderer instead. See packages/ipc/README.md.',
        },
        {
          selector: "MemberExpression[object.name='localStorage']",
          message:
            'Direct localStorage access is prohibited. Use usePersistedState() or readScoped()/writeScoped() from src/storage.ts instead.',
        },
      ],
    },
  },
  {
    files: ['src/storage.ts', 'src/**/*.test.ts', 'src/**/*.test.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[object.name='process'][property.name='env']",
          message:
            'Direct access to process.env is prohibited. For config values use @vienna/env. For child process environments use getEnrichedEnv() from @vienna/shell-env.',
        },
        {
          selector: "MemberExpression[object.type='MetaProperty'][property.name='env']",
          message:
            'Direct access to import.meta.env is prohibited. Import from @vienna/env instead. See packages/env/CLAUDE.md.',
        },
        {
          selector: "MemberExpression[object.name='window']",
          message:
            'Direct window property access is prohibited in renderer code. Use getApi()/getEvents() from @vienna/ipc/renderer instead. See packages/ipc/README.md.',
        },
      ],
    },
  },
  prettierConfig
);
