import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: ['dist/', 'node_modules/', 'storybook-static/'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-console': 'error',
      'no-restricted-syntax': [
        'warn',
        {
          selector:
            'Property[key.name=/^(padding|paddingTop|paddingRight|paddingBottom|paddingLeft|margin|marginTop|marginRight|marginBottom|marginLeft|gap|rowGap|columnGap)$/][value.raw=/^[1-9]/]',
          message:
            'Use Tailwind spacing classes (p-2, gap-4, m-3) instead of inline pixel values. 8pt grid: base unit is 4px.',
        },
        {
          selector:
            'Property[key.name=/^(padding|paddingTop|paddingRight|paddingBottom|paddingLeft|margin|marginTop|marginRight|marginBottom|marginLeft|gap|rowGap|columnGap)$/][value.raw=/\\dpx/]',
          message:
            'Use Tailwind spacing classes (p-2, gap-4, m-3) instead of inline px values. 8pt grid: base unit is 4px.',
        },
      ],
    },
  },
  prettierConfig
);
