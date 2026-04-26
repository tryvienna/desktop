import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { SearchFilterBar } from './search-filter-bar';

const meta = {
  title: 'Composed/SearchFilterBar',
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function SearchOnlyDemo() {
  const [search, setSearch] = React.useState('');
  return (
    <div className="w-full max-w-lg">
      <SearchFilterBar value={search} onChange={setSearch} placeholder="Search items..." />
      <p className="mt-4 text-xs text-muted-foreground">Search value: &quot;{search}&quot;</p>
    </div>
  );
}

export const Default: Story = {
  render: () => <SearchOnlyDemo />,
};

function WithFilterDemo() {
  const [search, setSearch] = React.useState('');
  const [filter, setFilter] = React.useState('all');
  return (
    <div className="w-full max-w-lg">
      <SearchFilterBar
        value={search}
        onChange={setSearch}
        placeholder="Search projects..."
        filter={{
          value: filter,
          onChange: setFilter,
          placeholder: 'All statuses',
          options: [
            { label: 'All Statuses', value: 'all' },
            { label: 'Active', value: 'active' },
            { label: 'Archived', value: 'archived' },
            { label: 'Draft', value: 'draft' },
          ],
        }}
      />
      <p className="mt-4 text-xs text-muted-foreground">
        Search: &quot;{search}&quot; | Filter: &quot;{filter}&quot;
      </p>
    </div>
  );
}

export const WithFilter: Story = {
  render: () => <WithFilterDemo />,
};

function PrefilledDemo() {
  const [search, setSearch] = React.useState('dashboard');
  const [filter, setFilter] = React.useState('active');
  return (
    <div className="w-full max-w-lg">
      <SearchFilterBar
        value={search}
        onChange={setSearch}
        placeholder="Search..."
        filter={{
          value: filter,
          onChange: setFilter,
          placeholder: 'Filter by type',
          options: [
            { label: 'All Types', value: 'all' },
            { label: 'Active', value: 'active' },
            { label: 'Inactive', value: 'inactive' },
          ],
        }}
      />
      <p className="mt-4 text-xs text-muted-foreground">
        Pre-filled search with active filter. Click the X to clear the search.
      </p>
    </div>
  );
}

export const Prefilled: Story = {
  render: () => <PrefilledDemo />,
};
