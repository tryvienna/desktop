import type { Meta, StoryObj } from '@storybook/react';
import { Textarea } from './textarea';
import { Label } from './label';

const meta = {
  title: 'Form Controls/Textarea',
  component: Textarea,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    disabled: { control: 'boolean' },
    placeholder: { control: 'text' },
    rows: { control: 'number' },
  },
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { placeholder: 'Write your message...' },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
};

export const WithLabel: Story = {
  render: () => (
    <div className="grid gap-2 w-80">
      <Label htmlFor="bio">Bio</Label>
      <Textarea id="bio" placeholder="Tell us about yourself..." />
    </div>
  ),
};

export const WithRows: Story = {
  render: () => (
    <div className="grid gap-2 w-80">
      <Label htmlFor="message">Message</Label>
      <Textarea id="message" placeholder="Type your message..." rows={6} />
    </div>
  ),
};

export const WithError: Story = {
  render: () => (
    <div className="grid gap-2 w-80">
      <Label htmlFor="desc">Description</Label>
      <Textarea id="desc" placeholder="Describe the issue..." aria-invalid={true} />
      <p className="text-destructive text-sm">Description is required.</p>
    </div>
  ),
};

export const Disabled: Story = {
  args: { placeholder: 'Disabled textarea', disabled: true },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
};

export const WithDefaultValue: Story = {
  render: () => (
    <div className="grid gap-2 w-80">
      <Label htmlFor="prefilled">Notes</Label>
      <Textarea
        id="prefilled"
        defaultValue="This textarea has pre-filled content that demonstrates how longer text looks in the component. The field-sizing: content CSS property allows it to auto-resize."
      />
    </div>
  ),
};
