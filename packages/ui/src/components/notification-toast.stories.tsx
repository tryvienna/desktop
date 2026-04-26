import type { Meta, StoryObj } from '@storybook/react';
import { NotificationToast } from './notification-toast';

const meta = {
  title: 'Feedback/NotificationToast',
  component: NotificationToast,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'success', 'error', 'warning', 'info'],
    },
    title: { control: 'text' },
    description: { control: 'text' },
    id: { control: 'text' },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 356 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof NotificationToast>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    id: 'story-default',
    title: 'Something happened',
    description: 'Here are some details about what happened.',
  },
};

export const Success: Story = {
  args: {
    id: 'story-success',
    variant: 'success',
    title: 'Workstream ready',
    description: 'Code review completed successfully.',
  },
};

export const Error: Story = {
  args: {
    id: 'story-error',
    variant: 'error',
    title: 'Deploy failed',
    description: 'The pipeline exited with code 1. Check the logs for details.',
  },
};

export const Warning: Story = {
  args: {
    id: 'story-warning',
    variant: 'warning',
    title: 'Rate limit approaching',
    description: 'You have used 90% of your API quota for this billing cycle.',
  },
};

export const Info: Story = {
  args: {
    id: 'story-info',
    variant: 'info',
    title: 'New version available',
    description: 'Version 2.4.0 is ready to install.',
  },
};

export const TitleOnly: Story = {
  args: {
    id: 'story-title-only',
    variant: 'success',
    title: 'Changes saved',
  },
};

export const WithActions: Story = {
  args: {
    id: 'story-actions',
    variant: 'info',
    title: 'New version available',
    description: 'Version 2.4.0 is ready to install.',
    actions: [
      { label: 'Update', onClick: () => {} },
      { label: 'Later', onClick: () => {} },
    ],
  },
};

export const Clickable: Story = {
  args: {
    id: 'story-clickable',
    variant: 'success',
    title: 'Workstream ready',
    description: 'Click to navigate to the workstream.',
    onClick: () => {},
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <NotificationToast id="all-default" variant="default" title="Default" description="Default variant notification." />
      <NotificationToast id="all-success" variant="success" title="Success" description="Operation completed successfully." />
      <NotificationToast id="all-error" variant="error" title="Error" description="Something went wrong." />
      <NotificationToast id="all-warning" variant="warning" title="Warning" description="Proceed with caution." />
      <NotificationToast id="all-info" variant="info" title="Info" description="Here is some useful information." />
    </div>
  ),
};
