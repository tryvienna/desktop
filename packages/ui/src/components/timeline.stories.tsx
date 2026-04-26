import type { Meta, StoryObj } from '@storybook/react';
import { ContentProvider } from './content-provider';
import { Timeline } from './timeline';
import {
  CheckCircleIcon,
  AlertTriangleIcon,
  InfoIcon,
  RocketIcon,
  CircleDotIcon,
} from 'lucide-react';

const meta = {
  title: 'Composed/Timeline',
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="w-96">
      <ContentProvider density="default">
        <Timeline
          items={[
            {
              title: 'Project created',
              description: 'Repository initialized with base configuration',
              timestamp: '2 hours ago',
              variant: 'success',
            },
            {
              title: 'First commit',
              description: 'Added initial project structure and dependencies',
              timestamp: '1 hour ago',
              variant: 'active',
            },
            {
              title: 'CI pipeline configured',
              description: 'GitHub Actions workflow added for automated testing',
              timestamp: '45 min ago',
            },
            {
              title: 'Build failed',
              description: 'TypeScript compilation error in module resolver',
              timestamp: '30 min ago',
              variant: 'destructive',
            },
            {
              title: 'Pending review',
              description: 'Pull request awaiting team review',
              timestamp: 'Just now',
            },
          ]}
        />
      </ContentProvider>
    </div>
  ),
};

export const WithIcons: Story = {
  render: () => (
    <div className="w-96">
      <ContentProvider density="default">
        <Timeline
          items={[
            {
              title: 'Deployment successful',
              description: 'v2.1.0 deployed to production',
              timestamp: '3 hours ago',
              icon: <CheckCircleIcon className="text-emerald-500" />,
            },
            {
              title: 'Performance warning',
              description: 'Response time exceeded 500ms threshold',
              timestamp: '2 hours ago',
              icon: <AlertTriangleIcon className="text-yellow-500" />,
            },
            {
              title: 'Configuration updated',
              description: 'Cache TTL increased to 3600 seconds',
              timestamp: '1 hour ago',
              icon: <InfoIcon className="text-blue-500" />,
            },
            {
              title: 'Feature launched',
              description: 'Dark mode toggle is now live for all users',
              timestamp: '30 min ago',
              icon: <RocketIcon className="text-purple-500" />,
            },
            {
              title: 'Monitoring active',
              description: 'All systems operating normally',
              timestamp: 'Just now',
              icon: <CircleDotIcon className="text-emerald-500" />,
            },
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
        <Timeline
          items={[
            { title: 'Step 1', description: 'Initialize repository', variant: 'success' },
            { title: 'Step 2', description: 'Install dependencies', variant: 'success' },
            { title: 'Step 3', description: 'Configure environment', variant: 'active' },
            { title: 'Step 4', description: 'Run tests', variant: 'default' },
          ]}
        />
      </ContentProvider>
    </div>
  ),
};

export const RelaxedDensity: Story = {
  render: () => (
    <div className="w-96">
      <ContentProvider density="relaxed">
        <Timeline
          items={[
            { title: 'Created', description: 'Issue was opened by Alice', timestamp: 'Jan 15' },
            {
              title: 'Assigned',
              description: 'Assigned to Bob',
              timestamp: 'Jan 16',
              variant: 'active',
            },
            {
              title: 'Resolved',
              description: 'Fix deployed to production',
              timestamp: 'Jan 18',
              variant: 'success',
            },
          ]}
        />
      </ContentProvider>
    </div>
  ),
};
