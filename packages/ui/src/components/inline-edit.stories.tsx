import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { InlineEdit } from './inline-edit';

const meta = {
  title: 'Composed/InlineEdit',
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function InlineEditDemo() {
  const [value, setValue] = React.useState('Project Alpha');
  return (
    <div className="w-64">
      <InlineEdit value={value} onSave={setValue} />
      <p className="mt-4 text-xs text-muted-foreground">Current value: &quot;{value}&quot;</p>
    </div>
  );
}

export const Default: Story = {
  render: () => <InlineEditDemo />,
};

function InlineEditPlaceholderDemo() {
  const [value, setValue] = React.useState('');
  return (
    <div className="w-64">
      <InlineEdit value={value} onSave={setValue} placeholder="Enter a project name..." />
      <p className="mt-4 text-xs text-muted-foreground">
        Current value: &quot;{value || '(empty)'}&quot;
      </p>
    </div>
  );
}

export const WithPlaceholder: Story = {
  render: () => <InlineEditPlaceholderDemo />,
};

function InlineEditLongTextDemo() {
  const [value, setValue] = React.useState(
    'This is a very long project name that will overflow the container and demonstrate truncation behavior'
  );
  return (
    <div className="w-64">
      <InlineEdit value={value} onSave={setValue} />
      <p className="mt-4 text-xs text-muted-foreground">
        Hover to see the pencil icon. Click to edit the full text.
      </p>
    </div>
  );
}

export const LongText: Story = {
  render: () => <InlineEditLongTextDemo />,
};

function InlineEditDisabledDemo() {
  const [value] = React.useState('Read-only value');
  return (
    <div className="w-64">
      <InlineEdit value={value} onSave={() => {}} disabled />
    </div>
  );
}

export const Disabled: Story = {
  render: () => <InlineEditDisabledDemo />,
};
