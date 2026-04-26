/**
 * ActiveWorkstreamTitle — Self-subscribing leaf that shows the active workstream in the TopBar.
 *
 * @ai-context
 * - Subscribes to WorkstreamListContext + ActiveIdContext internally
 * - Renders WorkstreamTitle with the active workstream's title + status
 * - Clicking the title opens the workstream settings drawer in full mode
 * - Leaf component: re-renders on any workstream change but doesn't cascade to parents
 * - Keeps AppLayout and ContentArea context-free (no unnecessary re-renders)
 */

import { useCallback, useMemo } from 'react';
import { WorkstreamTitle } from './WorkstreamTitle';
import { useWorkstreamList, useActiveWorkstreamId } from '../renderer/contexts/WorkstreamContext';
import { useDrawerActions } from '../lib/drawer';
import { workstreamSettingsContent } from './drawer';
import { useKeybindings } from '../providers/KeybindingsProvider';
import { getModifierLabel, getKeyLabel } from '../keybindings/utils';

export function ActiveWorkstreamTitle() {
  const { workstreams } = useWorkstreamList();
  const activeId = useActiveWorkstreamId();
  const { openFull } = useDrawerActions();
  const { getShortcut, platform } = useKeybindings();

  const ws = useMemo(
    () => workstreams.find((w) => w.id === activeId) ?? null,
    [workstreams, activeId],
  );

  const handleClick = useCallback(() => {
    if (activeId) {
      openFull(workstreamSettingsContent(activeId));
    }
  }, [activeId, openFull]);

  const shortcutKeys = useMemo(() => {
    const shortcut = getShortcut('workstream:settings');
    if (!shortcut) return undefined;
    return [
      ...shortcut.modifiers.map((m) => getModifierLabel(m, platform)),
      getKeyLabel(shortcut.key),
    ];
  }, [getShortcut, platform]);

  if (!ws) return null;
  return <WorkstreamTitle title={ws.title} status={ws.status} model={ws.model} onClick={handleClick} shortcutKeys={shortcutKeys} />;
}
