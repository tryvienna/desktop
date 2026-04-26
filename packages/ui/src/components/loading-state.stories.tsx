import type { Meta, StoryObj } from '@storybook/react';
import { LoadingState } from './loading-state';

const meta = {
  title: 'Feedback/LoadingState',
  component: LoadingState,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof LoadingState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithLabel: Story = {
  args: {
    label: 'Loading workstreams...',
  },
};

export const WithDescription: Story = {
  args: {
    label: 'Loading data',
    description: 'This may take a moment',
  },
};

export const Inline: Story = {
  args: {
    variant: 'inline',
    label: 'Saving...',
  },
};

export const InPanel: Story = {
  render: () => (
    <div className="w-80 h-64 border border-border rounded-lg bg-background flex flex-col">
      <div className="px-4 py-3 border-b border-border">
        <span className="text-sm font-medium">Panel Title</span>
      </div>
      <LoadingState label="Loading content..." />
    </div>
  ),
};

export const SpinnerSizes: Story = {
  render: () => (
    <div className="flex flex-col gap-8">
      <LoadingState spinnerSize="xs" label="Extra small" variant="inline" />
      <LoadingState spinnerSize="sm" label="Small" variant="inline" />
      <LoadingState spinnerSize="md" label="Medium" variant="inline" />
      <LoadingState spinnerSize="lg" label="Large" variant="inline" />
      <LoadingState spinnerSize="xl" label="Extra large" variant="inline" />
    </div>
  ),
};
