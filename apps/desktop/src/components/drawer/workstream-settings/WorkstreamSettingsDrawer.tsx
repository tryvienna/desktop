/**
 * WorkstreamSettingsDrawer — Slim orchestrator for workstream settings in full-mode drawer.
 *
 * @ai-context
 * - Always shows settings for the active workstream (reads from WorkstreamContext)
 * - Automatically switches when the user selects a different workstream
 * - Composes all settings sections inside DrawerContainer + DrawerBody
 * - Wires each section's callbacks to WorkstreamContext actions
 * - Shows loading skeleton when workstream not yet available
 * - Uses internal state to toggle to ScopedPermissionsPanel (full-mode has no nav stack)
 * - data-slot="workstream-settings-drawer"
 */

import { useMemo, useCallback, useState } from 'react';
import { Shield, ChevronRight } from 'lucide-react';
import { DrawerBody, Separator } from '@tryvienna/ui';
import { useQuery } from '@apollo/client';
import {
  useWorkstreamList,
  useActiveWorkstreamId,
  useWorkstreamActions,
} from '../../../renderer/contexts/WorkstreamContext';
import { useWorkstreamGroups } from '../../../renderer/hooks/useWorkstreamGroups';
import { GET_BRANCH_SELECTIONS } from '@vienna/graphql/client/operations';
import { DrawerContainer } from '../../../lib/drawer';
import { ScopedPermissionsPanel } from '../scoped-permissions/ScopedPermissionsPanel';
import { useScopedPermissions } from '../scoped-permissions/useScopedPermissions';
import { TitleSection } from './TitleSection';
import { ModelSection } from './ModelSection';
import { GroupSection } from './GroupSection';
import { DirectoryBranchSection } from './DirectoryBranchSection';
import { FooterActions } from './FooterActions';
import { LinkedEntities, WorkstreamReferences } from '../../domain';
import { RoutineSection } from './RoutineSection';
import { TagsSection } from './TagsSection';

export function WorkstreamSettingsDrawer({ initialTab }: { initialTab?: 'permissions' } = {}) {
  const [showPermissions, setShowPermissions] = useState(initialTab === 'permissions');
  const workstreamId = useActiveWorkstreamId();
  const { projectId, workstreams } = useWorkstreamList();
  const {
    updateWorkstreamTitle,
    switchWorkstreamModel,
    pinWorkstream,
    unpinWorkstream,
    archiveWorkstream,
    deleteWorkstream,
  } = useWorkstreamActions();

  const workstream = useMemo(
    () => workstreams.find((w) => w.id === workstreamId) ?? null,
    [workstreams, workstreamId]
  );

  const handleTitleSave = useCallback(
    async (title: string) => {
      if (workstreamId) await updateWorkstreamTitle(workstreamId, title);
    },
    [workstreamId, updateWorkstreamTitle]
  );

  const handleModelChange = useCallback(
    async (model: string) => {
      if (workstreamId) await switchWorkstreamModel(workstreamId, model);
    },
    [workstreamId, switchWorkstreamModel]
  );

  const handlePin = useCallback(() => {
    if (workstreamId) pinWorkstream(workstreamId);
  }, [workstreamId, pinWorkstream]);

  const handleUnpin = useCallback(() => {
    if (workstreamId) unpinWorkstream(workstreamId);
  }, [workstreamId, unpinWorkstream]);

  const handleArchive = useCallback(() => {
    if (workstreamId) archiveWorkstream(workstreamId);
  }, [workstreamId, archiveWorkstream]);

  const handleDelete = useCallback(() => {
    if (workstreamId) deleteWorkstream(workstreamId);
  }, [workstreamId, deleteWorkstream]);

  const { data: branchSelectionsData } = useQuery(GET_BRANCH_SELECTIONS, {
    variables: { workstreamId: workstreamId ?? '' },
    skip: !workstreamId,
  });

  const worktreePaths = useMemo(
    () =>
      (branchSelectionsData?.branchSelections ?? [])
        .map((s) => s.worktreePath)
        .filter((p): p is string => p != null),
    [branchSelectionsData]
  );

  const { overrideCount: permissionOverrides } = useScopedPermissions('workstream', workstreamId);
  const { groups, addWorkstreamToGroup, removeWorkstreamFromGroup } = useWorkstreamGroups(projectId);

  const handleGroupChange = useCallback(
    (groupId: string | null) => {
      if (!workstreamId) return;
      if (groupId) {
        addWorkstreamToGroup(workstreamId, groupId);
      } else {
        removeWorkstreamFromGroup(workstreamId);
      }
    },
    [workstreamId, addWorkstreamToGroup, removeWorkstreamFromGroup],
  );

  if (!workstream) {
    return (
      <DrawerContainer title="Settings">
        <DrawerBody>
          <div data-slot="workstream-settings-drawer" className="space-y-4">
            <div className="h-6 w-48 bg-muted animate-pulse rounded" />
            <div className="h-4 w-32 bg-muted animate-pulse rounded" />
            <div className="h-10 w-full bg-muted animate-pulse rounded" />
          </div>
        </DrawerBody>
      </DrawerContainer>
    );
  }

  if (showPermissions && workstreamId) {
    return (
      <ScopedPermissionsPanel
        scopeType="workstream"
        scopeId={workstreamId}
        scopeLabel={workstream.title}
        onBack={() => setShowPermissions(false)}
      />
    );
  }

  return (
    <DrawerContainer
      title={workstream.title}
      footer={
        <FooterActions
          workstream={workstream}
          onPin={handlePin}
          onUnpin={handleUnpin}
          onArchive={handleArchive}
          onDelete={handleDelete}
          worktreePaths={worktreePaths}
        />
      }
    >
      <DrawerBody>
        <div data-slot="workstream-settings-drawer" className="space-y-6">
          <TitleSection workstream={workstream} onTitleSave={handleTitleSave} />
          <Separator />
          <ModelSection workstream={workstream} onModelChange={handleModelChange} />
          {groups.length > 0 && (
            <>
              <Separator />
              <GroupSection
                currentGroupId={workstream.groupId ?? null}
                groups={groups}
                onGroupChange={handleGroupChange}
              />
            </>
          )}
          <Separator />
          {workstreamId && <LinkedEntities targetId={workstreamId} scope="workstream" />}
          {workstreamId && <WorkstreamReferences workstreamId={workstreamId} />}
          <Separator />
          {workstreamId && <DirectoryBranchSection workstreamId={workstreamId} />}
          <Separator />
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-lg px-1 py-2 text-left hover:bg-accent/50"
            onClick={() => setShowPermissions(true)}
          >
            <div className="flex items-center gap-3">
              <Shield size={16} className="text-amber-400" />
              <div>
                <span className="text-sm font-medium">Permissions</span>
                <p className="text-xs text-muted-foreground">Override tool permissions for this workstream</p>
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
          {workstreamId && projectId && (
            <>
              <Separator />
              <TagsSection workstreamId={workstreamId} projectId={projectId} />
            </>
          )}
          {workstream.isRoutineWorkstream && workstreamId && (
            <>
              <Separator />
              <RoutineSection workstreamId={workstreamId} />
            </>
          )}
        </div>
      </DrawerBody>
    </DrawerContainer>
  );
}
