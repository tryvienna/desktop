import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ConfirmDialog } from './confirm-dialog';
import { Button } from './button';

const meta = {
  title: 'Composed/ConfirmDialog',
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <ConfirmDialog
      trigger={<Button variant="destructive">Delete Item</Button>}
      title="Delete this item?"
      description="This action cannot be undone. The item and all associated data will be permanently removed."
      confirmLabel="Delete"
      variant="destructive"
      onConfirm={() => alert('Item deleted!')}
    />
  ),
};

export const NonDestructive: Story = {
  render: () => (
    <ConfirmDialog
      trigger={<Button variant="outline">Save Changes</Button>}
      title="Save changes?"
      description="Your changes will be saved and applied immediately."
      confirmLabel="Save"
      variant="default"
      onConfirm={() => alert('Changes saved!')}
    />
  ),
};

function ControlledDemo() {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="flex flex-col items-center gap-4">
      <Button onClick={() => setOpen(true)}>Open Confirm Dialog</Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Discard draft?"
        description="You have unsaved changes. Are you sure you want to discard them?"
        confirmLabel="Discard"
        cancelLabel="Keep Editing"
        variant="destructive"
        onConfirm={() => {
          alert('Draft discarded!');
          setOpen(false);
        }}
        onCancel={() => setOpen(false)}
      />
      <p className="text-xs text-muted-foreground">
        Dialog is controlled via state: {open ? 'open' : 'closed'}
      </p>
    </div>
  );
}

export const Controlled: Story = {
  render: () => <ControlledDemo />,
};

export const CustomLabels: Story = {
  render: () => (
    <ConfirmDialog
      trigger={<Button variant="outline">Archive Project</Button>}
      title="Archive this project?"
      description="The project will be moved to the archive. You can restore it later from the archive page."
      confirmLabel="Yes, Archive"
      cancelLabel="No, Keep Active"
      variant="default"
      onConfirm={() => alert('Project archived!')}
    />
  ),
};
