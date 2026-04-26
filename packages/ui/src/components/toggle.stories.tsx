import type { Meta, StoryObj } from '@storybook/react';
import { BoldIcon, UnderlineIcon } from 'lucide-react';
import { Toggle } from './toggle';

const meta = {
  title: 'Navigation/Toggle',
  component: Toggle,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof Toggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Toggle aria-label="Toggle bold">
      <BoldIcon />
    </Toggle>
  ),
};

export const WithText: Story = {
  render: () => <Toggle aria-label="Toggle italic">Italic</Toggle>,
};

export const Outline: Story = {
  render: () => (
    <Toggle variant="outline" aria-label="Toggle underline">
      <UnderlineIcon />
    </Toggle>
  ),
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Toggle size="sm" aria-label="Small">
        <BoldIcon />
      </Toggle>
      <Toggle size="default" aria-label="Default">
        <BoldIcon />
      </Toggle>
      <Toggle size="lg" aria-label="Large">
        <BoldIcon />
      </Toggle>
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <Toggle disabled aria-label="Disabled">
      <BoldIcon />
    </Toggle>
  ),
};
