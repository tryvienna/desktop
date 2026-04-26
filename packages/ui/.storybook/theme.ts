import { create } from '@storybook/theming';

export default create({
  base: 'dark',

  // Brand
  brandTitle: '@tryvienna/ui',
  brandUrl: 'https://github.com/tryvienna/desktop',

  // Colors
  colorPrimary: '#d4a843',
  colorSecondary: '#d4a843',

  // UI
  appBg: '#1c1c1c',
  appContentBg: '#232323',
  appPreviewBg: '#232323',
  appBorderColor: '#3a3a3a',
  appBorderRadius: 8,

  // Text
  textColor: '#e0e0e0',
  textInverseColor: '#1c1c1c',
  textMutedColor: '#999999',

  // Toolbar
  barTextColor: '#b0b0b0',
  barSelectedColor: '#d4a843',
  barHoverColor: '#d4a843',
  barBg: '#1c1c1c',

  // Form
  inputBg: '#2a2a2a',
  inputBorder: '#3a3a3a',
  inputTextColor: '#e0e0e0',
  inputBorderRadius: 6,

  // Fonts
  fontBase: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  fontCode: '"JetBrains Mono", "Fira Code", monospace',
});
