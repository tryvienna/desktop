import type { Meta, StoryObj } from '@storybook/react';
import { EmptyState } from './empty-state';
import { Button } from './button';
import { InboxIcon, SearchIcon, FileIcon } from 'lucide-react';

const meta = {
  title: 'Composed/EmptyState',
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="w-96">
      <EmptyState title="No items yet" description="Get started by creating your first item." />
    </div>
  ),
};

export const WithIcon: Story = {
  render: () => (
    <div className="w-96">
      <EmptyState
        icon={<InboxIcon />}
        title="No messages"
        description="You don't have any messages yet. Messages from your team will appear here."
      />
    </div>
  ),
};

export const WithAction: Story = {
  render: () => (
    <div className="w-96">
      <EmptyState
        icon={<FileIcon />}
        title="No documents"
        description="Upload your first document to get started with the workspace."
        action={<Button>Upload Document</Button>}
      />
    </div>
  ),
};

export const SearchNoResults: Story = {
  render: () => (
    <div className="w-96">
      <EmptyState
        icon={<SearchIcon />}
        title="No results found"
        description="Try adjusting your search terms or filters to find what you're looking for."
        action={
          <Button variant="outline" size="sm">
            Clear Filters
          </Button>
        }
      />
    </div>
  ),
};
