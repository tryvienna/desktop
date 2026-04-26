import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import {
  DrawerPanel,
  DrawerPanelHeader,
  DrawerPanelContent,
  DrawerBody,
  DrawerPanelFooter,
} from './drawer-layout';
import { Button } from './button';
import { Separator } from './separator';

const meta = {
  title: 'Layout/DrawerLayout',
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <DrawerPanel className="w-80 h-96">
      <DrawerPanelHeader title="Issue Details">
        <Button variant="ghost" size="sm">Edit</Button>
      </DrawerPanelHeader>
      <DrawerPanelContent>
        <DrawerBody>
          <p className="text-sm text-muted-foreground">Drawer body content with compact density.</p>
          <Separator className="my-4" />
          <p className="text-sm text-muted-foreground">Additional content section.</p>
        </DrawerBody>
      </DrawerPanelContent>
      <DrawerPanelFooter className="flex items-center justify-end gap-2">
        <Button variant="outline" size="sm">Cancel</Button>
        <Button size="sm">Save</Button>
      </DrawerPanelFooter>
    </DrawerPanel>
  ),
};
