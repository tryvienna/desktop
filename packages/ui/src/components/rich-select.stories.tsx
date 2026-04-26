import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { RichSelect } from './rich-select';

const meta = {
  title: 'Menus/RichSelect',
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const FRUIT_OPTIONS = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'cherry', label: 'Cherry' },
  { value: 'grape', label: 'Grape' },
];

function BasicDemo() {
  const [value, setValue] = React.useState('apple');
  return (
    <div className="w-64">
      <RichSelect value={value} onValueChange={setValue} options={FRUIT_OPTIONS} />
    </div>
  );
}

export const Default: Story = {
  render: () => <BasicDemo />,
};

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active', color: '#10B981', description: 'Currently running' },
  { value: 'paused', label: 'Paused', color: '#F59E0B', description: 'Temporarily stopped' },
  { value: 'stopped', label: 'Stopped', color: '#EF4444', description: 'Not running' },
  {
    value: 'archived',
    label: 'Archived',
    color: '#6B7280',
    description: 'No longer in use',
    disabled: true,
  },
];

function CustomRenderDemo() {
  const [value, setValue] = React.useState('active');
  return (
    <div className="w-64">
      <RichSelect
        value={value}
        onValueChange={setValue}
        options={STATUS_OPTIONS}
        renderValue={(opt) => (
          <span className="flex items-center gap-2">
            <span
              className="size-2 rounded-full shrink-0"
              style={{ backgroundColor: opt.color as string }}
            />
            <span className="font-medium">{opt.label}</span>
          </span>
        )}
        renderOption={(opt) => (
          <span className="flex items-center gap-2">
            <span
              className="size-2 rounded-full shrink-0"
              style={{ backgroundColor: opt.color as string }}
            />
            <span className="flex flex-col">
              <span className="font-medium leading-tight">{opt.label}</span>
              <span className="text-xs text-muted-foreground leading-tight mt-1">
                {opt.description as string}
              </span>
            </span>
          </span>
        )}
      />
    </div>
  );
}

export const CustomRendering: Story = {
  render: () => <CustomRenderDemo />,
};

function SmallDemo() {
  const [value, setValue] = React.useState('apple');
  return (
    <div className="w-48">
      <RichSelect value={value} onValueChange={setValue} options={FRUIT_OPTIONS} size="sm" />
    </div>
  );
}

export const Small: Story = {
  render: () => <SmallDemo />,
};

export const Disabled: Story = {
  render: () => (
    <div className="w-64">
      <RichSelect value="apple" onValueChange={() => {}} options={FRUIT_OPTIONS} disabled />
    </div>
  ),
};
