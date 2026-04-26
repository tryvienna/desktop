import type { Meta, StoryObj } from '@storybook/react';
import { Label } from './label';
import { Input } from './input';
import { Checkbox } from './checkbox';

const meta = {
  title: 'Form Controls/Label',
  component: Label,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof Label>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { children: 'Email address' },
};

export const WithInput: Story = {
  render: () => (
    <div className="grid gap-2 w-80">
      <Label htmlFor="username">Username</Label>
      <Input id="username" placeholder="Enter username" />
    </div>
  ),
};

export const WithCheckbox: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Checkbox id="terms" />
      <Label htmlFor="terms">Accept terms and conditions</Label>
    </div>
  ),
};

export const DisabledSibling: Story = {
  render: () => (
    <div className="grid gap-2 w-80">
      <Label htmlFor="disabled-input">Disabled field</Label>
      <Input id="disabled-input" placeholder="Cannot edit" disabled />
    </div>
  ),
};

export const Required: Story = {
  render: () => (
    <div className="grid gap-2 w-80">
      <Label htmlFor="required-field">
        Email <span className="text-destructive">*</span>
      </Label>
      <Input id="required-field" type="email" placeholder="required@example.com" required />
    </div>
  ),
};
