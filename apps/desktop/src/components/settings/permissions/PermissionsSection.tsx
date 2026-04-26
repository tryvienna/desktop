/**
 * PermissionsSection — Main permissions settings section.
 *
 * Renders the preset bar and all tool groups with their permission toggles.
 */

import { usePermissions } from './hooks';
import { PermissionPresetBar } from './PermissionPresetBar';
import { PermissionToolGroup } from './PermissionToolGroup';
import { PermissionTemplatesSection } from './PermissionTemplatesSection';
import { EntityActionsGroup } from './EntityActionsGroup';
import { TOOL_GROUP_DISPLAY } from './constants';

export function PermissionsSection() {
  const {
    loading,
    activePreset,
    getPermission,
    setPermission,
    setBatchPermissions,
    applyPreset,
    counts,
  } = usePermissions();

  if (loading) return null;

  return (
    <div className="grid gap-6">
      <PermissionPresetBar
        activePreset={activePreset}
        onSelect={applyPreset}
      />

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {counts.allowed} of {counts.total} tools auto-allowed
        </p>
      </div>

      <div className="grid gap-2">
        {TOOL_GROUP_DISPLAY.map((group) => (
          <PermissionToolGroup
            key={group.id}
            group={group}
            getPermission={getPermission}
            onToggle={setPermission}
          />
        ))}
        <EntityActionsGroup
          getPermission={getPermission}
          onToggle={setPermission}
          onBatchToggle={setBatchPermissions}
        />
      </div>

      <div className="border-t border-border pt-6">
        <PermissionTemplatesSection />
      </div>
    </div>
  );
}
