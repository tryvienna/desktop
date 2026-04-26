import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from './collapsible';
import { Button } from './button';
import { ChevronsUpDownIcon } from 'lucide-react';

const meta = {
  title: 'Navigation/Collapsible',
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function CollapsibleDemo() {
  const [isOpen, setIsOpen] = React.useState(false);
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-80 space-y-2">
      <div className="flex items-center justify-between rounded-md border px-4 py-2">
        <h4 className="text-sm font-semibold">3 items</h4>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="icon-sm">
            <ChevronsUpDownIcon />
            <span className="sr-only">Toggle</span>
          </Button>
        </CollapsibleTrigger>
      </div>
      <div className="rounded-md border px-4 py-2 text-sm">Always visible</div>
      <CollapsibleContent className="space-y-2">
        <div className="rounded-md border px-4 py-2 text-sm">Hidden item 1</div>
        <div className="rounded-md border px-4 py-2 text-sm">Hidden item 2</div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export const Default: Story = {
  render: () => <CollapsibleDemo />,
};
