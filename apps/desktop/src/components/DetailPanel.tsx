import { useState } from 'react';
import { SidePanel, type NavSectionData } from '@tryvienna/ui';
import { usePersistedState } from '../storage';

const MIN_WIDTH = 320;
const MAX_WIDTH = 800;
const SECTIONS: NavSectionData[] = [];

export function DetailPanel() {
  const [collapsed, setCollapsed] = useState(true);
  const [width, setWidth] = usePersistedState('panelWidth');

  return (
    <SidePanel
      className="pt-10"
      side="right"
      sections={SECTIONS}
      collapsed={collapsed}
      onCollapsedChange={setCollapsed}
      width={width}
      onWidthChange={setWidth}
      minWidth={MIN_WIDTH}
      maxWidth={MAX_WIDTH}
      density="comfortable"
      toggleShortcutKeys={['⌘', '\\']}
    />
  );
}
