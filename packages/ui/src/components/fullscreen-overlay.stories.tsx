import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { FullscreenOverlay } from './fullscreen-overlay';
import { FullscreenButton } from './fullscreen-button';
import { Button } from './button';

const meta = {
  title: 'Domain/FullscreenOverlay',
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function FullscreenOverlayDemo() {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open Fullscreen</Button>
      <FullscreenOverlay open={open} onClose={() => setOpen(false)}>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Fullscreen Content</h2>
            <p className="text-muted-foreground mb-4">Press Escape or click the X to close</p>
            <Button onClick={() => setOpen(false)}>Close</Button>
          </div>
        </div>
      </FullscreenOverlay>
    </>
  );
}

export const Default: Story = {
  render: () => <FullscreenOverlayDemo />,
};

function ToggleButtonDemo() {
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  return (
    <div className="flex items-center gap-4">
      <FullscreenButton
        isFullscreen={isFullscreen}
        onClick={() => setIsFullscreen(!isFullscreen)}
      />
      <span className="text-sm text-muted-foreground">
        {isFullscreen ? 'Fullscreen' : 'Normal'}
      </span>
    </div>
  );
}

export const WithToggleButton: Story = {
  render: () => <ToggleButtonDemo />,
};
