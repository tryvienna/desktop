import type { Meta, StoryObj } from '@storybook/react';
import {
  MailIcon,
  PlusIcon,
  TrashIcon,
  DownloadIcon,
  LoaderIcon,
  ChevronRightIcon,
} from 'lucide-react';
import { Button } from './button';

const meta = {
  title: 'Form Controls/Button',
  component: Button,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
    },
    size: {
      control: 'select',
      options: ['default', 'xs', 'sm', 'lg', 'icon', 'icon-xs', 'icon-sm', 'icon-lg'],
    },
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { children: 'Button' },
};

export const Destructive: Story = {
  args: { variant: 'destructive', children: 'Delete' },
};

export const Outline: Story = {
  args: { variant: 'outline', children: 'Outline' },
};

export const Secondary: Story = {
  args: { variant: 'secondary', children: 'Secondary' },
};

export const Ghost: Story = {
  args: { variant: 'ghost', children: 'Ghost' },
};

export const Link: Story = {
  args: { variant: 'link', children: 'Link Button' },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-4">
      <Button variant="default">Default</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">Link</Button>
    </div>
  ),
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-4">
      <Button size="xs">Extra Small (24px)</Button>
      <Button size="sm">Small (32px)</Button>
      <Button size="default">Default (40px)</Button>
      <Button size="lg">Large (48px)</Button>
    </div>
  ),
};

export const WithIcons: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-4">
      <Button>
        <MailIcon /> Send Email
      </Button>
      <Button variant="destructive">
        <TrashIcon /> Delete
      </Button>
      <Button variant="outline">
        <DownloadIcon /> Download
      </Button>
      <Button variant="secondary">
        Next <ChevronRightIcon />
      </Button>
    </div>
  ),
};

export const IconButtons: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-4">
      <Button size="icon-xs" variant="ghost">
        <PlusIcon />
      </Button>
      <Button size="icon-sm" variant="ghost">
        <PlusIcon />
      </Button>
      <Button size="icon" variant="outline">
        <PlusIcon />
      </Button>
      <Button size="icon-lg" variant="outline">
        <PlusIcon />
      </Button>
    </div>
  ),
};

export const Loading: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-4">
      <Button disabled>
        <LoaderIcon className="animate-spin" /> Please wait
      </Button>
      <Button variant="outline" disabled>
        <LoaderIcon className="animate-spin" /> Loading...
      </Button>
    </div>
  ),
};

export const Disabled: Story = {
  args: { children: 'Disabled', disabled: true },
};
