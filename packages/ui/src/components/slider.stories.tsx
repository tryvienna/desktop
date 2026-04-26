import type { Meta, StoryObj } from '@storybook/react';
import { Slider } from './slider';
import { Label } from './label';

const meta = {
  title: 'Form Controls/Slider',
  component: Slider,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    disabled: { control: 'boolean' },
    min: { control: 'number' },
    max: { control: 'number' },
    step: { control: 'number' },
  },
} satisfies Meta<typeof Slider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { defaultValue: [50], max: 100, step: 1 },
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
    <div className="grid gap-4 w-80">
      <div className="flex items-center justify-between">
        <Label>Volume</Label>
        <span className="text-muted-foreground text-sm">75%</span>
      </div>
      <Slider defaultValue={[75]} max={100} step={1} />
    </div>
  ),
};

export const Range: Story = {
  render: () => (
    <div className="grid gap-4 w-80">
      <div className="flex items-center justify-between">
        <Label>Price range</Label>
        <span className="text-muted-foreground text-sm">$25 - $75</span>
      </div>
      <Slider defaultValue={[25, 75]} max={100} step={5} />
    </div>
  ),
};

export const WithSteps: Story = {
  render: () => (
    <div className="grid gap-4 w-80">
      <div className="flex items-center justify-between">
        <Label>Temperature</Label>
        <span className="text-muted-foreground text-sm">0.7</span>
      </div>
      <Slider defaultValue={[7]} max={20} step={1} />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>0.0</span>
        <span>1.0</span>
        <span>2.0</span>
      </div>
    </div>
  ),
};

export const Disabled: Story = {
  args: { defaultValue: [40], max: 100, step: 1, disabled: true },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
};

export const MinMax: Story = {
  render: () => (
    <div className="grid gap-4 w-80">
      <Label>Brightness (20-80%)</Label>
      <Slider defaultValue={[50]} min={20} max={80} step={5} />
    </div>
  ),
};
