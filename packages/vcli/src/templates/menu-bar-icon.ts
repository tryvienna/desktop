import type { TemplateContext } from '../types.ts';

export function renderMenuBarIcon(ctx: TemplateContext): string {
  const { naming } = ctx;
  const pascal = naming.pascalName;

  return `/**
 * ${pascal}MenuBarIcon — Menu bar icon component (32px button).
 */

import type { MenuBarIconProps } from '@tryvienna/sdk';
import { Circle } from 'lucide-react';

export function ${pascal}MenuBarIcon({ pluginId, hostApi, logger }: MenuBarIconProps) {
  // TODO: Replace with your plugin's icon
  return <Circle size={16} />;
}
`;
}
