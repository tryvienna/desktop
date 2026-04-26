// PreparingIndicator Stories — Animated typing dots
//
// Matches drift-v2: bouncing dots shown while waiting for assistant response.

import type { Meta, StoryObj } from '@storybook/react';
import { useState, useEffect } from 'react';
import { PreparingIndicator } from './preparing-indicator';

const meta: Meta<typeof PreparingIndicator> = {
  title: 'Chat/preparing-indicator',
  component: PreparingIndicator,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="p-8 bg-surface-page">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof PreparingIndicator>;

/** Default — three bouncing dots */
export const Default: Story = {};

/** Container only — no dots (used as height placeholder) */
export const ContainerOnly: Story = {
  args: { useDots: false },
};

/** In chat context — indicator between user message and assistant response */
export const InChatContext: Story = {
  render: () => (
    <div className="max-w-3xl flex flex-col gap-8 text-foreground">
      <div className="py-2">How do I set up a React project with TypeScript?</div>
      <PreparingIndicator />
    </div>
  ),
};

/** Lifecycle simulation — appears for 3s, then disappears (simulating response arrival) */
export const LifecycleSimulation: Story = {
  render: function LifecycleRender() {
    const [isPreparing, setIsPreparing] = useState(true);

    useEffect(() => {
      const timer = setTimeout(() => setIsPreparing(false), 3000);
      return () => clearTimeout(timer);
    }, []);

    return (
      <div className="max-w-3xl flex flex-col gap-8 text-foreground">
        <div className="py-2">Explain how event sourcing works.</div>
        {isPreparing ? (
          <PreparingIndicator />
        ) : (
          <div className="py-2 text-foreground">
            Event sourcing is an architectural pattern where state changes are stored as a sequence
            of events rather than just the current state...
          </div>
        )}
      </div>
    );
  },
};

/** Multiple indicators — simulating multiple concurrent workstreams */
export const MultipleIndicators: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <PreparingIndicator />
      <PreparingIndicator />
      <PreparingIndicator />
    </div>
  ),
};

/** State comparison — side by side with other chat states */
export const StateComparison: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-8 text-foreground">
      <div>
        <div className="text-[11px] text-muted-foreground mb-2">Preparing</div>
        <PreparingIndicator />
      </div>
      <div>
        <div className="text-[11px] text-muted-foreground mb-2">Streaming</div>
        <div className="py-2 text-sm">The answer is being generated...</div>
      </div>
      <div>
        <div className="text-[11px] text-muted-foreground mb-2">Complete</div>
        <div className="py-2 text-sm">Here is the complete response.</div>
      </div>
    </div>
  ),
};
