import type { Meta, StoryObj } from '@storybook/react';
import { RadioGroup, RadioGroupItem } from './radio-group';
import { Label } from './label';

const meta = {
  title: 'Form Controls/RadioGroup',
  component: RadioGroup,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof RadioGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <RadioGroup defaultValue="option-1">
      <div className="flex items-center gap-2">
        <RadioGroupItem value="option-1" id="opt-1" />
        <Label htmlFor="opt-1">Option One</Label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="option-2" id="opt-2" />
        <Label htmlFor="opt-2">Option Two</Label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="option-3" id="opt-3" />
        <Label htmlFor="opt-3">Option Three</Label>
      </div>
    </RadioGroup>
  ),
};

export const WithDescriptions: Story = {
  render: () => (
    <RadioGroup defaultValue="comfortable" className="gap-4">
      <div className="flex items-start gap-3">
        <RadioGroupItem value="compact" id="compact" className="mt-1" />
        <div className="grid gap-1">
          <Label htmlFor="compact">Compact</Label>
          <p className="text-muted-foreground text-sm">Minimal spacing for dense information.</p>
        </div>
      </div>
      <div className="flex items-start gap-3">
        <RadioGroupItem value="comfortable" id="comfortable" className="mt-1" />
        <div className="grid gap-1">
          <Label htmlFor="comfortable">Comfortable</Label>
          <p className="text-muted-foreground text-sm">
            Default spacing that balances density and readability.
          </p>
        </div>
      </div>
      <div className="flex items-start gap-3">
        <RadioGroupItem value="relaxed" id="relaxed" className="mt-1" />
        <div className="grid gap-1">
          <Label htmlFor="relaxed">Relaxed</Label>
          <p className="text-muted-foreground text-sm">Extra spacing for a more open layout.</p>
        </div>
      </div>
    </RadioGroup>
  ),
};

export const Horizontal: Story = {
  render: () => (
    <RadioGroup defaultValue="small" orientation="horizontal" className="flex gap-4">
      <div className="flex items-center gap-2">
        <RadioGroupItem value="small" id="h-small" />
        <Label htmlFor="h-small">Small</Label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="medium" id="h-medium" />
        <Label htmlFor="h-medium">Medium</Label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="large" id="h-large" />
        <Label htmlFor="h-large">Large</Label>
      </div>
    </RadioGroup>
  ),
};

export const Disabled: Story = {
  render: () => (
    <RadioGroup defaultValue="option-1" disabled>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="option-1" id="d-1" />
        <Label htmlFor="d-1">Selected (disabled)</Label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="option-2" id="d-2" />
        <Label htmlFor="d-2">Unselected (disabled)</Label>
      </div>
    </RadioGroup>
  ),
};
