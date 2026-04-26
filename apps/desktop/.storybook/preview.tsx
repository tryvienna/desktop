import type { Preview } from '@storybook/react';
import React from 'react';
import '@tryvienna/ui/styles.css';

const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'Theme',
      toolbar: {
        title: 'Theme',
        icon: 'paintbrush',
        items: [
          { value: 'dark', title: 'Dark (Vienna Gold)', icon: 'moon' },
          { value: 'light', title: 'Light (Vienna Light)', icon: 'sun' },
          { value: 'vscode', title: 'VS Code Dark', icon: 'browser' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: 'dark',
  },
  decorators: [
    (Story, context) => {
      const theme = context.globals.theme || 'dark';
      const isDark = theme !== 'light';
      const themeClass = theme === 'vscode' ? 'dark theme-vscode' : isDark ? 'dark' : 'light';

      React.useEffect(() => {
        document.documentElement.className = themeClass;
      }, [themeClass]);

      return (
        <div
          className={themeClass}
          style={{
            backgroundColor: 'var(--surface-page)',
            color: 'var(--text-primary)',
            minHeight: '100vh',
          }}
        >
          <Story />
        </div>
      );
    },
  ],
  parameters: {
    layout: 'fullscreen',
    backgrounds: { disable: true },
  },
};

export default preview;
