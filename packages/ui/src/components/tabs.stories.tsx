import type { Meta, StoryObj } from '@storybook/react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs';
import { Input } from './input';
import { Label } from './label';
import { Button } from './button';

const meta = {
  title: 'Navigation/Tabs',
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Tabs defaultValue="account" className="w-96">
      <TabsList className="w-full">
        <TabsTrigger value="account" className="flex-1">
          Account
        </TabsTrigger>
        <TabsTrigger value="password" className="flex-1">
          Password
        </TabsTrigger>
      </TabsList>
      <TabsContent value="account">
        <div className="grid gap-4 pt-4">
          <div className="grid gap-2">
            <Label htmlFor="tab-name">Name</Label>
            <Input id="tab-name" defaultValue="Will" />
          </div>
          <Button>Save</Button>
        </div>
      </TabsContent>
      <TabsContent value="password">
        <div className="grid gap-4 pt-4">
          <div className="grid gap-2">
            <Label htmlFor="tab-pw">Current password</Label>
            <Input id="tab-pw" type="password" />
          </div>
          <Button>Update</Button>
        </div>
      </TabsContent>
    </Tabs>
  ),
};

export const ThreeTabs: Story = {
  render: () => (
    <Tabs defaultValue="overview" className="w-96">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="analytics">Analytics</TabsTrigger>
        <TabsTrigger value="reports">Reports</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">
        <p className="text-sm text-muted-foreground pt-4">Overview content.</p>
      </TabsContent>
      <TabsContent value="analytics">
        <p className="text-sm text-muted-foreground pt-4">Analytics content.</p>
      </TabsContent>
      <TabsContent value="reports">
        <p className="text-sm text-muted-foreground pt-4">Reports content.</p>
      </TabsContent>
    </Tabs>
  ),
};
