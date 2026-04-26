import type { Meta, StoryObj } from '@storybook/react';
import { ContentProvider } from './content-provider';
import { ContentSection } from './content-section';
import { Button } from './button';

const meta = {
  title: 'Composed/ContentSection',
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="w-96">
      <ContentProvider density="default">
        <ContentSection title="Project Details">
          <p className="text-sm text-muted-foreground">
            This section contains project configuration and metadata. Content is spaced according to
            the density context provided by ContentProvider.
          </p>
        </ContentSection>
      </ContentProvider>
    </div>
  ),
};

export const Collapsible: Story = {
  render: () => (
    <div className="w-96">
      <ContentProvider density="default">
        <ContentSection title="Advanced Settings" collapsible>
          <p className="text-sm text-muted-foreground">
            These are advanced settings that can be collapsed. Click the title to toggle visibility.
          </p>
          <p className="text-sm text-muted-foreground">
            Additional content that will be hidden when collapsed.
          </p>
        </ContentSection>
      </ContentProvider>
    </div>
  ),
};

export const CollapsedByDefault: Story = {
  render: () => (
    <div className="w-96">
      <ContentProvider density="default">
        <ContentSection title="Hidden Section" collapsible defaultCollapsed>
          <p className="text-sm text-muted-foreground">
            This content is hidden by default. Click the title to expand.
          </p>
        </ContentSection>
      </ContentProvider>
    </div>
  ),
};

export const Loading: Story = {
  render: () => (
    <div className="w-96">
      <ContentProvider density="default">
        <ContentSection title="Loading Data" loading skeletonCount={4}>
          <p>This content will not be shown while loading.</p>
        </ContentSection>
      </ContentProvider>
    </div>
  ),
};

export const WithTitleActions: Story = {
  render: () => (
    <div className="w-96">
      <ContentProvider density="default">
        <ContentSection
          title="Team Members"
          titleAction={
            <Button size="xs" variant="outline">
              Add Member
            </Button>
          }
        >
          <p className="text-sm text-muted-foreground">Alice, Bob, and Charlie are on this team.</p>
        </ContentSection>
      </ContentProvider>
    </div>
  ),
};
