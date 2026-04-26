/**
 * WorkstreamWidgetArea — Renders workstream-widget canvases for linked entities.
 *
 * Mounted between TopBar and chat content in ContentArea. When entities linked
 * to the active workstream define a workstreamWidget UI component, they render
 * here in a vertical stack. Returns null when no widgets are available.
 */

import { useWorkstreamWidgets } from '../renderer/hooks/useWorkstreamWidgets';

export function WorkstreamWidgetArea() {
  const widgets = useWorkstreamWidgets();

  if (widgets.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 shrink-0 overflow-y-auto max-h-[40vh] border-b border-border px-3 py-2">
      {widgets}
    </div>
  );
}
