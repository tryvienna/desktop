import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ModelSelector } from './model-selector';

const meta = {
  title: 'Domain/ModelSelector',
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function ModelSelectorDemo() {
  const [model, setModel] = React.useState<string>('sonnet');
  return (
    <div className="w-64">
      <ModelSelector value={model} onChange={setModel} />
    </div>
  );
}

export const Default: Story = {
  render: () => <ModelSelectorDemo />,
};

export const Disabled: Story = {
  render: () => (
    <div className="w-64">
      <ModelSelector value="opus" onChange={() => {}} disabled />
    </div>
  ),
};

function TopSideDemo() {
  const [model, setModel] = React.useState<string>('haiku');
  return (
    <div className="w-64 mt-48">
      <ModelSelector value={model} onChange={setModel} side="top" />
    </div>
  );
}

export const OpenTop: Story = {
  render: () => <TopSideDemo />,
};
