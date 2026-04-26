import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { MarkdownEditor } from './markdown-editor';

const meta = {
  title: 'RichContent/MarkdownEditor',
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function MarkdownEditorDemo() {
  const [value, setValue] = React.useState(
    '# Hello World\n\nThis is **bold** and *italic* text.\n\n- Item one\n- Item two\n'
  );
  return (
    <div className="w-[500px]">
      <MarkdownEditor value={value} onChange={setValue} showActions={false} />
    </div>
  );
}

export const Default: Story = {
  render: () => <MarkdownEditorDemo />,
};

function MarkdownEditorWithActionsDemo() {
  const [value, setValue] = React.useState('Write some markdown here...\n');
  const [saved, setSaved] = React.useState('');
  return (
    <div className="w-[500px] flex flex-col gap-4">
      <MarkdownEditor
        value={value}
        onChange={setValue}
        onSave={(v) => setSaved(v)}
        onCancel={() => setValue('')}
      />
      {saved && (
        <p className="text-xs text-muted-foreground">
          Last saved: &quot;{saved.slice(0, 60)}...&quot;
        </p>
      )}
    </div>
  );
}

export const WithActions: Story = {
  render: () => <MarkdownEditorWithActionsDemo />,
};

function MarkdownEditorSmallDemo() {
  const [value, setValue] = React.useState('Small preview text with `code` and **bold**.\n');
  return (
    <div className="w-[500px]">
      <MarkdownEditor value={value} onChange={setValue} size="sm" showActions={false} />
    </div>
  );
}

export const SmallSize: Story = {
  render: () => <MarkdownEditorSmallDemo />,
};
