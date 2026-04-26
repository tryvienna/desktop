import type { Meta, StoryObj } from '@storybook/react';
import { AspectRatio } from './aspect-ratio';

const meta = {
  title: 'Layout/AspectRatio',
  component: AspectRatio,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof AspectRatio>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Widescreen: Story = {
  render: () => (
    <div className="w-96 overflow-hidden rounded-lg border">
      <AspectRatio ratio={16 / 9}>
        <div className="flex size-full items-center justify-center bg-muted text-muted-foreground text-sm">
          16:9
        </div>
      </AspectRatio>
    </div>
  ),
};

export const Square: Story = {
  render: () => (
    <div className="w-48 overflow-hidden rounded-lg border">
      <AspectRatio ratio={1}>
        <div className="flex size-full items-center justify-center bg-muted text-muted-foreground text-sm">
          1:1
        </div>
      </AspectRatio>
    </div>
  ),
};

export const Classic: Story = {
  render: () => (
    <div className="w-80 overflow-hidden rounded-lg border">
      <AspectRatio ratio={4 / 3}>
        <div className="flex size-full items-center justify-center bg-muted text-muted-foreground text-sm">
          4:3
        </div>
      </AspectRatio>
    </div>
  ),
};
