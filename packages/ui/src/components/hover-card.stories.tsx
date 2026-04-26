import type { Meta, StoryObj } from '@storybook/react';
import { HoverCard, HoverCardTrigger, HoverCardContent } from './hover-card';
import { Avatar, AvatarFallback } from './avatar';

const meta = {
  title: 'Overlays/HoverCard',
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <HoverCard>
      <HoverCardTrigger asChild>
        <a href="#" className="text-sm font-medium underline underline-offset-4">
          @vienna
        </a>
      </HoverCardTrigger>
      <HoverCardContent>
        <div className="flex gap-4">
          <Avatar>
            <AvatarFallback>V</AvatarFallback>
          </Avatar>
          <div className="grid gap-1">
            <h4 className="text-sm font-semibold">Vienna</h4>
            <p className="text-sm text-muted-foreground">Desktop app for AI-powered workflows.</p>
            <p className="text-xs text-muted-foreground">Joined December 2024</p>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  ),
};
