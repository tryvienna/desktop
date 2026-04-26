/**
 * GroupSettingsDrawer — Orchestrator for workstream group settings in full-mode drawer.
 *
 * @ai-context
 * - Reads groupId from drawer state (mode.content.payload)
 * - Finds the matching group from useWorkstreamGroups
 * - Composes TitleSection + FooterActions inside DrawerContainer + DrawerBody
 * - Wires rename/pin/delete callbacks to useWorkstreamGroups actions
 * - Shows loading skeleton when group not yet available
 * - Uses internal state to toggle to ScopedPermissionsPanel (full-mode has no nav stack)
 * - data-slot="group-settings-drawer"
 */

import { useMemo, useCallback, useState } from 'react';
import { Shield, ChevronRight } from 'lucide-react';
import { DrawerBody, Separator } from '@tryvienna/ui';
import { DrawerContainer, useDrawerState } from '../../../lib/drawer';
import { useWorkstreamList } from '../../../renderer/contexts/WorkstreamContext';
import { useWorkstreamGroups } from '../../../renderer/hooks/useWorkstreamGroups';
import { getGroupIdFromContent } from '../content';
import { ScopedPermissionsPanel } from '../scoped-permissions/ScopedPermissionsPanel';
import { useScopedPermissions } from '../scoped-permissions/useScopedPermissions';
import { GroupTitleSection } from './GroupTitleSection';
import { GroupDirectoryBranchSection } from './GroupDirectoryBranchSection';
import { GroupFooterActions } from './GroupFooterActions';
import { LinkedEntities } from '../../domain';
import { GroupTagsSection } from './GroupTagsSection';

export function GroupSettingsDrawer() {
  const [showPermissions, setShowPermissions] = useState(false);
  const { state } = useDrawerState();
  const groupId =
    state.mode.type === 'full' ? getGroupIdFromContent(state.mode.content) : null;

  const { projectId, workstreams: allWorkstreams } = useWorkstreamList();
  const { overrideCount: permissionOverrides } = useScopedPermissions('group', groupId);
  const { groups, renameGroup, updateGroupEmoji, pinGroup, unpinGroup, deleteGroup, archiveGroup } =
    useWorkstreamGroups(projectId);

  const group = useMemo(
    () => groups.find((g) => g.id === groupId) ?? null,
    [groups, groupId],
  );

  const memberWorkstreams = useMemo(
    () => allWorkstreams.filter((ws) => ws.groupId === groupId),
    [allWorkstreams, groupId],
  );

  const handleNameSave = useCallback(
    async (name: string) => {
      if (groupId) await renameGroup(groupId, name);
    },
    [groupId, renameGroup],
  );

  const handleEmojiSave = useCallback(
    async (emoji: string | null) => {
      if (groupId) await updateGroupEmoji(groupId, emoji);
    },
    [groupId, updateGroupEmoji],
  );

  const handlePin = useCallback(() => {
    if (groupId) pinGroup(groupId);
  }, [groupId, pinGroup]);

  const handleUnpin = useCallback(() => {
    if (groupId) unpinGroup(groupId);
  }, [groupId, unpinGroup]);

  const handleDelete = useCallback(() => {
    if (groupId) deleteGroup(groupId);
  }, [groupId, deleteGroup]);

  const handleArchive = useCallback(() => {
    if (groupId) archiveGroup(groupId);
  }, [groupId, archiveGroup]);

  if (!group) {
    return (
      <DrawerContainer title="Scope Settings">
        <DrawerBody>
          <div data-slot="group-settings-drawer" className="space-y-4">
            <div className="h-6 w-48 bg-muted animate-pulse rounded" />
            <div className="h-4 w-32 bg-muted animate-pulse rounded" />
          </div>
        </DrawerBody>
      </DrawerContainer>
    );
  }

  if (showPermissions && groupId) {
    return (
      <ScopedPermissionsPanel
        scopeType="group"
        scopeId={groupId}
        scopeLabel={group.name}
        onBack={() => setShowPermissions(false)}
      />
    );
  }

  return (
    <DrawerContainer
      title={group.name}
      footer={
        <GroupFooterActions
          group={group}
          workstreamCount={memberWorkstreams.length}
          workstreamNames={memberWorkstreams.map((ws) => ({ id: ws.id, name: ws.title }))}
          onPin={handlePin}
          onUnpin={handleUnpin}
          onDelete={handleDelete}
          onArchive={handleArchive}
        />
      }
    >
      <DrawerBody>
        <div data-slot="group-settings-drawer" className="space-y-6">
          <GroupTitleSection group={group} onNameSave={handleNameSave} onEmojiSave={handleEmojiSave} />
          <Separator />
          {groupId && <GroupDirectoryBranchSection groupId={groupId} />}
          <Separator />
          {groupId && <LinkedEntities targetId={groupId} scope="group" />}
          {groupId && projectId && (
            <>
              <Separator />
              <GroupTagsSection groupId={groupId} projectId={projectId} />
            </>
          )}
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-lg px-1 py-2 text-left hover:bg-accent/50"
            onClick={() => setShowPermissions(true)}
          >
            <div className="flex items-center gap-3">
              <Shield size={16} className="text-amber-400" />
              <div>
                <span className="text-sm font-medium">Permissions</span>
                <p className="text-xs text-muted-foreground">Override tool permissions for this scope</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {permissionOverrides > 0 && (
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-400 border border-amber-500/20">
                  {permissionOverrides}
                </span>
              )}
              <ChevronRight size={14} className="text-muted-foreground" />
            </div>
          </button>
        </div>
      </DrawerBody>
    </DrawerContainer>
  );
}
