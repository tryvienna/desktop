import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { FullscreenButton } from './fullscreen-button';

const meta = {
  title: 'Display/FullscreenButton',
  component: FullscreenButton,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    isFullscreen: { control: 'boolean' },
    onClick: { action: 'clicked' },
    className: { control: 'text' },
  },
} satisfies Meta<typeof FullscreenButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { isFullscreen: false },
};

export const Fullscreen: Story = {
  args: { isFullscreen: true },
};

export const Interactive: Story = {
  render: () => {
    const [isFullscreen, setIsFullscreen] = useState(false);
    return (
      <div className="flex flex-col items-center gap-4">
        <FullscreenButton
          isFullscreen={isFullscreen}
          onClick={() => setIsFullscreen((v) => !v)}
        />
        <span className="text-xs text-muted-foreground">
          {isFullscreen ? 'Fullscreen (click to exit)' : 'Normal (click to enter fullscreen)'}
        </span>
      </div>
    );
  },
};

export const CustomClassName: Story = {
  args: {
    isFullscreen: false,
    className: 'bg-muted p-2 rounded-md',
  },
};
