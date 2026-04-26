import type { Meta, StoryObj } from '@storybook/react';
import { Switch } from './switch';
import { Label } from './label';

const meta = {
  title: 'Form Controls/Switch',
  component: Switch,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    checked: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Switch id="default-switch" />
      <Label htmlFor="default-switch">Airplane mode</Label>
    </div>
  ),
};

export const Checked: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Switch id="checked-switch" defaultChecked />
      <Label htmlFor="checked-switch">Enabled by default</Label>
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className="grid gap-4">
      <div className="flex items-center gap-2">
        <Switch id="disabled-off" disabled />
        <Label htmlFor="disabled-off">Disabled (off)</Label>
      </div>
      <div className="flex items-center gap-2">
        <Switch id="disabled-on" disabled defaultChecked />
        <Label htmlFor="disabled-on">Disabled (on)</Label>
      </div>
    </div>
  ),
};

export const SettingsGroup: Story = {
  render: () => (
    <div className="grid gap-6 w-80">
      <div className="flex items-center justify-between">
        <div className="grid gap-1">
          <Label htmlFor="notifications">Notifications</Label>
          <p className="text-muted-foreground text-sm">Receive push notifications</p>
        </div>
        <Switch id="notifications" defaultChecked />
      </div>
      <div className="flex items-center justify-between">
        <div className="grid gap-1">
          <Label htmlFor="sounds">Sound effects</Label>
          <p className="text-muted-foreground text-sm">Play sounds for actions</p>
        </div>
        <Switch id="sounds" />
      </div>
      <div className="flex items-center justify-between">
        <div className="grid gap-1">
          <Label htmlFor="dark-mode">Dark mode</Label>
          <p className="text-muted-foreground text-sm">Use dark color theme</p>
        </div>
        <Switch id="dark-mode" defaultChecked />
      </div>
    </div>
  ),
};
