// Storybook preview — Vienna chat-ui
//
// Uses globalTypes toolbar toggle for dark/light theme switching.
// Light is the default; .dark class activates dark mode (matches @tryvienna/ui convention).

import type { Preview, Decorator } from '@storybook/react';
import { useEffect } from 'react';
import '../src/theme/chat-ui.css';

// Theme decorator — toggles .dark class on document root
const withTheme: Decorator = (Story, context) => {
  const theme = context.globals.theme || 'dark';

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);

    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  return (
    <div className="min-h-screen bg-surface-page text-foreground">
      <Story />
    </div>
  );
};

const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'Color theme',
      toolbar: {
        title: 'Theme',
        icon: 'sun',
        items: [
          { value: 'dark', title: 'Dark', icon: 'moon' },
          { value: 'light', title: 'Light', icon: 'sun' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: 'dark',
  },
  decorators: [withTheme],
  parameters: {
    layout: 'padded',
    backgrounds: {
      disable: true,
    },
  },
};

export default preview;
