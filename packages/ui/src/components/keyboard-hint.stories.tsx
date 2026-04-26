import type { Meta, StoryObj } from '@storybook/react';
import { KeyboardHint } from './keyboard-hint';

const meta = {
  title: 'Utility/KeyboardHint',
  component: KeyboardHint,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    keys: { control: 'object' },
    label: { control: 'text' },
    className: { control: 'text' },
  },
} satisfies Meta<typeof KeyboardHint>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { keys: 'Esc' },
};

export const SingleKeyWithLabel: Story = {
  args: { keys: 'Esc', label: 'to close' },
};

export const MultipleKeys: Story = {
  args: { keys: ['⌘', 'N'] },
};

export const MultipleKeysWithLabel: Story = {
  args: { keys: ['⌘', 'N'], label: 'New document' },
};

export const ModifierCombinations: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <KeyboardHint keys={['⌘', 'C']} label="Copy" />
      <KeyboardHint keys={['⌘', 'V']} label="Paste" />
      <KeyboardHint keys={['⌘', '⇧', 'P']} label="Command palette" />
      <KeyboardHint keys={['⌃', '⌥', 'Delete']} label="Delete word" />
      <KeyboardHint keys={['⌘', 'K']} />
    </div>
  ),
};

export const SingleKeys: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <KeyboardHint keys="Enter" />
      <KeyboardHint keys="Tab" />
      <KeyboardHint keys="Esc" />
      <KeyboardHint keys="Space" />
    </div>
  ),
};
