/**
 * DrawerShell — Thin composition shell for the drawer UI.
 *
 * @ai-context
 * - Composes TabbedDrawer + DrawerTabBar + DrawerContentRenderer + useDrawerKeyboard
 * - This is the component that replaces DetailPanel in AppLayout
 * - Uses inline mode so the drawer participates in the flex layout (pushes chat left)
 * - Always renders (even when closed) so ShellContainer can animate width to 0
 * - Passes Cmd+\ shortcut hint to the glass pill toggle
 * - data-slot="drawer-shell"
 */

import {
  TabbedDrawer,
  DrawerTabBar,
  DrawerTabContent,
  DrawerContentRenderer,
  useDrawerKeyboard,
} from '../../lib/drawer';

const TOGGLE_SHORTCUT_KEYS = ['⌘', '\\'];

export function DrawerShell() {
  useDrawerKeyboard();

  return (
    <TabbedDrawer mode="inline" toggleShortcutKeys={TOGGLE_SHORTCUT_KEYS}>
      <DrawerTabBar />
      <DrawerTabContent>
        <DrawerContentRenderer />
      </DrawerTabContent>
    </TabbedDrawer>
  );
}
