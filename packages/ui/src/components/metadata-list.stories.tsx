import type { Meta, StoryObj } from '@storybook/react';
import { ContentProvider } from './content-provider';
import { MetadataList } from './metadata-list';
import { UserIcon, MailIcon, CalendarIcon, HashIcon, MapPinIcon } from 'lucide-react';

const meta = {
  title: 'Composed/MetadataList',
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="w-96">
      <ContentProvider density="default">
        <MetadataList
          items={[
            { label: 'Full Name', value: 'Jane Doe', icon: <UserIcon /> },
            { label: 'Email', value: 'jane@example.com', icon: <MailIcon /> },
            { label: 'Created', value: 'March 1, 2026', icon: <CalendarIcon /> },
            { label: 'ID', value: 'usr_a1b2c3d4', icon: <HashIcon /> },
            { label: 'Location', value: 'San Francisco, CA', icon: <MapPinIcon /> },
            { label: 'Role', value: 'Engineering Manager' },
          ]}
        />
      </ContentProvider>
    </div>
  ),
};

export const Copyable: Story = {
  render: () => (
    <div className="w-96">
      <ContentProvider density="default">
        <MetadataList
          items={[
            { label: 'User ID', value: 'usr_a1b2c3d4', copyable: true, icon: <HashIcon /> },
            { label: 'Email', value: 'jane@example.com', copyable: true, icon: <MailIcon /> },
            {
              label: 'API Key',
              value: 'sk_live_abc123...',
              copyable: true,
              copyValue: 'sk_live_abc123def456',
            },
            { label: 'Location', value: 'San Francisco, CA', icon: <MapPinIcon /> },
          ]}
        />
      </ContentProvider>
    </div>
  ),
};

export const WithLinks: Story = {
  render: () => (
    <div className="w-96">
      <ContentProvider density="default">
        <MetadataList
          items={[
            { label: 'Name', value: 'Jane Doe', icon: <UserIcon /> },
            { label: 'Profile', value: 'View profile', href: '#profile' },
            { label: 'Documentation', value: 'View docs', href: '#docs' },
            { label: 'Email', value: 'jane@example.com', icon: <MailIcon /> },
          ]}
        />
      </ContentProvider>
    </div>
  ),
};

export const CompactDensity: Story = {
  render: () => (
    <div className="w-96">
      <ContentProvider density="compact">
        <MetadataList
          items={[
            { label: 'Name', value: 'Jane Doe', icon: <UserIcon /> },
            { label: 'Email', value: 'jane@example.com', icon: <MailIcon /> },
            { label: 'Created', value: 'March 1, 2026', icon: <CalendarIcon /> },
            { label: 'ID', value: 'usr_a1b2c3d4', copyable: true, icon: <HashIcon /> },
            { label: 'Location', value: 'San Francisco, CA', icon: <MapPinIcon /> },
          ]}
        />
      </ContentProvider>
    </div>
  ),
};
