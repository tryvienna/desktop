import type { ReactNode } from 'react';
import { NavigationSidebar } from './NavigationSidebar';
import { ContentArea } from './ContentArea';
import { DrawerShell } from './drawer';

export function AppLayout({ children }: { children?: ReactNode }) {
  return (
    <div className="relative flex h-full w-full">
      <NavigationSidebar />
      <ContentArea>{children}</ContentArea>
      <DrawerShell />
    </div>
  );
}
