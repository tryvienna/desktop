import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ContentProvider } from './content-provider';
import { ContentSection } from './content-section';
import { MetadataList } from './metadata-list';

const meta = {
  title: 'Composed/ContentProvider',
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleItems = [
  { label: 'Name', value: 'John Doe' },
  { label: 'Email', value: 'john@example.com' },
  { label: 'Role', value: 'Administrator' },
  { label: 'Status', value: 'Active' },
];

export const Compact: Story = {
  render: () => (
    <div className="w-96">
      <ContentProvider density="compact">
        <ContentSection title="User Details">
          <MetadataList items={sampleItems} />
        </ContentSection>
        <ContentSection title="Account Info">
          <MetadataList
            items={[
              { label: 'Plan', value: 'Pro' },
              { label: 'Storage', value: '50 GB' },
            ]}
          />
        </ContentSection>
      </ContentProvider>
    </div>
  ),
};

export const Default: Story = {
  render: () => (
    <div className="w-96">
      <ContentProvider density="default">
        <ContentSection title="User Details">
          <MetadataList items={sampleItems} />
        </ContentSection>
        <ContentSection title="Account Info">
          <MetadataList
            items={[
              { label: 'Plan', value: 'Pro' },
              { label: 'Storage', value: '50 GB' },
            ]}
          />
        </ContentSection>
      </ContentProvider>
    </div>
  ),
};

export const Relaxed: Story = {
  render: () => (
    <div className="w-96">
      <ContentProvider density="relaxed">
        <ContentSection title="User Details">
          <MetadataList items={sampleItems} />
        </ContentSection>
        <ContentSection title="Account Info">
          <MetadataList
            items={[
              { label: 'Plan', value: 'Pro' },
              { label: 'Storage', value: '50 GB' },
            ]}
          />
        </ContentSection>
      </ContentProvider>
    </div>
  ),
};
