import type { Meta, StoryObj } from '@storybook/react';
import { Target, Rocket, BarChart3, FolderOpen } from 'lucide-react';
import { EntityCard } from './entity-card';

const meta = {
  title: 'Composed/EntityCard',
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="w-80">
      <EntityCard
        icon={<Target className="size-5" />}
        title="Project Alpha"
        description="Main development project for the Q1 product launch"
      />
    </div>
  ),
};

export const WithBadges: Story = {
  render: () => (
    <div className="w-80">
      <EntityCard
        icon={<Rocket className="size-5" />}
        title="Deployment Pipeline"
        description="CI/CD configuration and deployment automation"
        badges={[
          { label: 'Active', variant: 'default' },
          { label: 'Production', variant: 'secondary' },
          { label: 'Critical', variant: 'destructive' },
          { label: 'v2.1', variant: 'outline' },
        ]}
      />
    </div>
  ),
};

export const WithStats: Story = {
  render: () => (
    <div className="w-80">
      <EntityCard
        icon={<BarChart3 className="size-5" />}
        title="Analytics Dashboard"
        description="Real-time metrics and reporting interface"
        badges={[{ label: 'Active', variant: 'default' }]}
        stats={[
          { label: 'Views', value: '12.4k' },
          { label: 'Users', value: '842' },
          { label: 'Events', value: '3.2M' },
        ]}
      />
    </div>
  ),
};

export const Clickable: Story = {
  render: () => (
    <div className="w-80">
      <EntityCard
        icon={<FolderOpen className="size-5" />}
        title="Documentation"
        description="Internal team docs and API reference"
        badges={[{ label: 'Updated', variant: 'secondary' }]}
        stats={[
          { label: 'Pages', value: '47' },
          { label: 'Contributors', value: '8' },
        ]}
        onClick={() => alert('Entity card clicked!')}
      />
    </div>
  ),
};

export const WithoutIcon: Story = {
  render: () => (
    <div className="w-80">
      <EntityCard
        title="Background Worker"
        description="Processes queued tasks and scheduled jobs"
        badges={[{ label: 'Running', variant: 'default' }]}
        stats={[
          { label: 'Jobs', value: '156' },
          { label: 'Failed', value: '2' },
        ]}
      />
    </div>
  ),
};
