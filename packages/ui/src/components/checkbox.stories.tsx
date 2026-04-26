import type { Meta, StoryObj } from '@storybook/react';
import { Checkbox } from './checkbox';
import { Label } from './label';

const meta = {
  title: 'Form Controls/Checkbox',
  component: Checkbox,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    checked: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Checkbox id="default" />
      <Label htmlFor="default">Accept terms</Label>
    </div>
  ),
};

export const Checked: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Checkbox id="checked" defaultChecked />
      <Label htmlFor="checked">Checked by default</Label>
    </div>
  ),
};

export const Indeterminate: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Checkbox id="indeterminate" checked="indeterminate" />
      <Label htmlFor="indeterminate">Indeterminate state</Label>
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className="grid gap-4">
      <div className="flex items-center gap-2">
        <Checkbox id="disabled-unchecked" disabled />
        <Label htmlFor="disabled-unchecked">Disabled unchecked</Label>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="disabled-checked" disabled defaultChecked />
        <Label htmlFor="disabled-checked">Disabled checked</Label>
      </div>
    </div>
  ),
};

export const CheckboxGroup: Story = {
  render: () => (
    <div className="grid gap-3">
      <Label className="text-base font-semibold">Notification preferences</Label>
      <div className="flex items-center gap-2">
        <Checkbox id="email-notif" defaultChecked />
        <Label htmlFor="email-notif">Email notifications</Label>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="push-notif" defaultChecked />
        <Label htmlFor="push-notif">Push notifications</Label>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="sms-notif" />
        <Label htmlFor="sms-notif">SMS notifications</Label>
      </div>
    </div>
  ),
};
