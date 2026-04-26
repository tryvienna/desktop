import type { Meta, StoryObj } from '@storybook/react';
import { Toaster, toast } from './sonner';
import { Button } from './button';

const meta = {
  title: 'Feedback/Toaster',
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div>
      <Toaster />
      <Button onClick={() => toast('Event has been created')}>Show Toast</Button>
    </div>
  ),
};

export const Success: Story = {
  render: () => (
    <div>
      <Toaster />
      <Button onClick={() => toast.success('Profile updated successfully')}>
        Show Success Toast
      </Button>
    </div>
  ),
};

export const Error: Story = {
  render: () => (
    <div>
      <Toaster />
      <Button variant="destructive" onClick={() => toast.error('Something went wrong')}>
        Show Error Toast
      </Button>
    </div>
  ),
};

export const Promise: Story = {
  render: () => (
    <div>
      <Toaster />
      <Button
        onClick={() =>
          toast.promise(new Promise((resolve) => setTimeout(resolve, 2000)), {
            loading: 'Saving...',
            success: 'Saved!',
            error: 'Failed',
          })
        }
      >
        Show Promise Toast
      </Button>
    </div>
  ),
};

export const WithDescription: Story = {
  render: () => (
    <div>
      <Toaster />
      <Button
        onClick={() =>
          toast('Event created', {
            description: 'Monday, January 3rd at 6:00 PM',
          })
        }
      >
        Show Toast with Description
      </Button>
    </div>
  ),
};
