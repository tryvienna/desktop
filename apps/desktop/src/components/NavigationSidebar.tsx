import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronsUpDown, Check, Plus, Home, Inbox } from 'lucide-react';
import type { NavSectionData } from '@tryvienna/ui';
import {
  SidePanel,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  Button,
  NavActionButton,
} from '@tryvienna/ui';
import { isEditableFile } from '@vienna/editor/utils';
import { usePersistedState } from '../storage';
import { SettingsButton } from './SettingsButton';
import { UpdateButton } from './UpdateButton';
import { FeedbackButton } from './FeedbackButton';
import { ExplorePluginsButton } from './ExplorePluginsButton';
import { useWorkstreamList, useActiveWorkstreamId, useWorkstreamActions, useViewMode } from '../renderer/contexts/WorkstreamContext';
import { useQuery, GET_INBOX_UNREAD_COUNT } from '@vienna/graphql/client';
import { useWorkstreamsNavSections } from '../renderer/hooks/useWorkstreamsNavSections';
import { useWorkstreamTodoMap } from '../renderer/hooks/useWorkstreamTodoMap';
import { useRoutinesNavSection } from '../renderer/hooks/useRoutinesNavSection';
import { useWorkstreamGroups } from '../renderer/hooks/useWorkstreamGroups';
import {
  useDirectoriesNavSection,
  DIR_ITEM_PREFIX,
  FILE_ITEM_PREFIX,
} from '../renderer/hooks/useDirectoriesNavSection';
import {
  useClaudeSettingsItems,
  CLAUDE_CFG_PREFIX,
  CLAUDE_CFG_DIR_PREFIX,
} from '../renderer/hooks/useClaudeSettingsNavSection';
import { useTasksNavSection } from '../renderer/hooks/useTasksNavSection';
import { useDrawerActions } from '../lib/drawer';
import { useKeybindings } from '../providers/KeybindingsProvider';
import { getModifierLabel, getKeyLabel } from '../keybindings/utils';
import { workstreamSettingsContent, groupSettingsContent, fileEditorContent, fileEditorTab, claudeSettingsEditorTab, entityDrawerTab } from './drawer';
import { useActionForm } from '../providers/ActionFormProvider';
import { usePluginNavSections } from '../renderer/hooks/usePluginNavSections';

const MIN_WIDTH = 160;
const MAX_WIDTH = 320;

export function NavigationSidebar() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = usePersistedState('sidebarCollapsed');
  const [width, setWidth] = usePersistedState('sidebarWidth');

  // Listen for toggle events from the command palette / keyboard shortcuts
  useEffect(() => {
    const handler = () => setCollapsed(!collapsed);
    document.addEventListener('vienna:toggle-sidebar', handler);
    return () => document.removeEventListener('vienna:toggle-sidebar', handler);
  }, [setCollapsed, collapsed]);

  const { projectId, projects, workstreams } = useWorkstreamList();
  const activeWorkstreamId = useActiveWorkstreamId();
  const {
    setActiveWorkstream,
    setViewMode,
    switchProject,
    createWorkstream: _createWorkstream,
    pinWorkstream,
    unpinWorkstream,
    archiveWorkstream,
    deleteWorkstream,
  } = useWorkstreamActions();
  const viewMode = useViewMode();
  const { data: inboxCountData } = useQuery(GET_INBOX_UNREAD_COUNT, { pollInterval: 30_000 });
  const inboxUnreadCount = inboxCountData?.inboxUnreadCount ?? 0;
  const { openFull, openTab } = useDrawerActions();
  const { showForm, showGroupForm, showRoutineForm, showPluginForm, showTaskForm } = useActionForm();
  const { getShortcut, platform } = useKeybindings();

  const newWorkstreamShortcutLabel = useMemo(() => {
    const shortcut = getShortcut('app:new-workstream');
    if (!shortcut) return undefined;
    return [...shortcut.modifiers.map((m) => getModifierLabel(m, platform)), getKeyLabel(shortcut.key)].join('');
  }, [getShortcut, platform]);

  const newGroupShortcutLabel = useMemo(() => {
    const shortcut = getShortcut('app:new-group');
    if (!shortcut) return undefined;
    return [...shortcut.modifiers.map((m) => getModifierLabel(m, platform)), getKeyLabel(shortcut.key)].join('');
  }, [getShortcut, platform]);

  const {
    groups,
    pinGroup,
    unpinGroup,
  } = useWorkstreamGroups(projectId);

  // ─── Create actions ─────────────────────────────────────────────────────
  const onCreateWorkstream = useCallback(
    (groupId?: string) => {
      showForm(groupId);
    },
    [showForm],
  );

  const onOpenSettings = useCallback(
    (id: string) => {
      setActiveWorkstream(id);
      openFull(workstreamSettingsContent(id));
    },
    [openFull, setActiveWorkstream],
  );

  const onOpenGroupSettings = useCallback(
    (groupId: string) => {
      openFull(groupSettingsContent(groupId));
    },
    [openFull],
  );

  const todoMap = useWorkstreamTodoMap();

  const { sections: workstreamSections, selectedId } = useWorkstreamsNavSections({
    workstreams,
    groups,
    activeWorkstreamId,
    todoMap,
    onCreateWorkstream,
    onCreateGroup: showGroupForm,
    onPinWorkstream: pinWorkstream,
    onUnpinWorkstream: unpinWorkstream,
    onArchiveWorkstream: archiveWorkstream,
    onOpenSettings,
    onDeleteWorkstream: deleteWorkstream,
    onPinGroup: pinGroup,
    onUnpinGroup: unpinGroup,
    onOpenGroupSettings,
  });

  const { section: routinesSection } = useRoutinesNavSection({
    projectId,
    workstreams,
    onCreateRoutine: showRoutineForm,
    onPinWorkstream: pinWorkstream,
    onUnpinWorkstream: unpinWorkstream,
    onOpenSettings,
  });

  const {
    section: directoriesSection,
    confirmDialog,
    onDirectoryClick,
    branchInfoMap,
    revealFile,
  } = useDirectoriesNavSection({
    projectId,
    workstreamId: activeWorkstreamId,
  });

  const { section: tasksSection } = useTasksNavSection({
    projectId,
    onCreateTask: showTaskForm,
  });

  const pluginNavSections = usePluginNavSections();

  const {
    item: claudeSettingsItem,
    onConfigDirClick,
  } = useClaudeSettingsItems({
    projectId,
    workstreamId: activeWorkstreamId,
  });

  // ─── Controlled expansion state (enables programmatic reveal) ───────────────
  const [expansionState, setExpansionState] = usePersistedState('sidebarExpansionState');

  // Track file highlighted via "open in file viewer" (cleared on next sidebar click)
  const [revealedFileId, setRevealedFileId] = useState<string | null>(null);

  // Keep revealFile ref stable for the event listener
  const revealFileRef = useRef(revealFile);
  useEffect(() => { revealFileRef.current = revealFile; }, [revealFile]);

  useEffect(() => {
    const handler = async (e: Event) => {
      const { filePath } = (e as CustomEvent<{ filePath: string }>).detail;
      const result = await revealFileRef.current(filePath);
      if (!result) return;

      // Un-collapse sidebar
      setCollapsed(false);

      // Expand the directories section and all ancestor folders
      setExpansionState((prev) => {
        const sections = prev.collapsedSections?.includes('directories')
          ? prev.sections
          : prev.sections;
        const collapsedSections = (prev.collapsedSections ?? []).filter(
          (id) => id !== 'directories',
        );
        const items = [...new Set([...prev.items, ...result.dirItemIds])];
        return { ...prev, sections, collapsedSections, items };
      });

      setRevealedFileId(result.fileItemId);

      // Scroll the file into view after React re-renders with new expansion state
      // Double rAF ensures the DOM has updated after state changes
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const el = document.querySelector(
            `[data-testid="nav-item-${CSS.escape(result.fileItemId)}"]`,
          );
          el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        });
      });
    };

    document.addEventListener('vienna:reveal-in-file-viewer', handler);
    return () => document.removeEventListener('vienna:reveal-in-file-viewer', handler);
  }, [setCollapsed]);

  const sections = useMemo<NavSectionData[]>(() => {
    const result = [...workstreamSections, routinesSection, tasksSection];
    if (directoriesSection) {
      // Append the "Claude Settings" folder item into the directories section
      if (claudeSettingsItem) {
        result.push({
          ...directoriesSection,
          items: [...directoriesSection.items, claudeSettingsItem],
        });
      } else {
        result.push(directoriesSection);
      }
    } else if (claudeSettingsItem) {
      // No directories configured, but global/enterprise configs still exist
      result.push({
        id: 'directories',
        label: 'Directories',
        items: [claudeSettingsItem],
      });
    }
    return result;
  }, [workstreamSections, routinesSection, tasksSection, directoriesSection, claudeSettingsItem]);

  const onSelect = useCallback(
    (id: string) => {
      // Clear file reveal highlight on any sidebar interaction
      setRevealedFileId(null);

      // Group sections are handled by SidePanel; guard against stale item IDs
      if (id.startsWith('group:')) {
        return;
      }

      // Task items open the task entity drawer
      if (id.startsWith('task:')) {
        const taskId = id.slice('task:'.length);
        const taskUri = `@vienna//task/${taskId}`;
        openTab(entityDrawerTab(taskUri));
        return;
      }

      if (id.startsWith(CLAUDE_CFG_PREFIX)) {
        // IDs prefixed with "!" are non-existing files — don't open them
        const rest = id.slice(CLAUDE_CFG_PREFIX.length);
        if (rest.startsWith('!')) return;
        if (isEditableFile(rest)) {
          // Route settings.json files to the visual settings editor
          const basename = rest.split('/').pop() ?? '';
          if (basename === 'settings.json' || basename === 'settings.local.json') {
            openTab(claudeSettingsEditorTab(rest));
          } else {
            openTab(fileEditorTab(rest));
          }
        }
        return;
      }

      if (id.startsWith(CLAUDE_CFG_DIR_PREFIX)) {
        const dirPath = id.slice(CLAUDE_CFG_DIR_PREFIX.length);
        onConfigDirClick(dirPath);
        return;
      }

      // Scope grouping folders and the top-level Claude Settings folder — just toggle expand (handled by SidePanel)
      if (id.startsWith('claude-scope:') || id === 'claude-settings') {
        return;
      }

      if (id.startsWith(DIR_ITEM_PREFIX)) {
        const dirPath = id.slice(DIR_ITEM_PREFIX.length);
        onDirectoryClick(dirPath);
        return;
      }

      if (id.startsWith(FILE_ITEM_PREFIX)) {
        const filePath = id.slice(FILE_ITEM_PREFIX.length);
        if (!isEditableFile(filePath)) return;
        const fileName = filePath.split('/').pop() ?? filePath;
        // Find which branch and directory this file belongs to by checking branchInfoMap
        let branch: string | null = null;
        let directoryPath: string | null = null;
        for (const [dirPath, info] of branchInfoMap) {
          if (info.worktreePath && filePath.startsWith(info.worktreePath)) {
            branch = info.branch;
            directoryPath = dirPath;
            break;
          }
        }
        // If not matched by worktree, check base directory paths
        if (!directoryPath) {
          for (const [dirPath] of branchInfoMap) {
            if (filePath.startsWith(dirPath)) {
              directoryPath = dirPath;
              break;
            }
          }
        }
        openTab({
          id: `file-editor:${filePath}`,
          label: fileName,
          initialContent: fileEditorContent(filePath, { branch, directoryPath }),
        });
        return;
      }

      setActiveWorkstream(id);
    },
    [setActiveWorkstream, openTab, onDirectoryClick, onConfigDirClick, branchInfoMap],
  );

  const currentProject = projects.find((p) => p.id === projectId);

  const projectSwitcher = projects.length > 1 ? (
    <div className="px-3 pb-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-between gap-1 font-medium text-foreground"
          >
            <span className="truncate">{currentProject?.name ?? 'Project'}</span>
            <ChevronsUpDown size={14} className="shrink-0 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {projects.map((project) => (
            <DropdownMenuItem
              key={project.id}
              onClick={() => switchProject(project.id)}
              className="gap-2"
            >
              {project.id === projectId && <Check size={14} className="shrink-0" />}
              {project.id !== projectId && <span className="w-3.5 shrink-0" />}
              <span className="truncate">{project.name}</span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => navigate('/settings?tab=projects')}
            className="text-muted-foreground"
          >
            Manage projects...
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  ) : undefined;

  const isHome = viewMode === 'home';
  const isInbox = viewMode === 'inbox';

  const sidebarHeader = (
    <>
      {projectSwitcher}
      <div className="px-3 pb-2 flex flex-col gap-1.5">
        <button
          type="button"
          onClick={() => setViewMode('inbox')}
          className={`flex w-full items-center gap-1.5 rounded-md px-3 py-1.5 text-xs transition-colors cursor-pointer ${
            isInbox
              ? 'bg-[color-mix(in_oklch,var(--brand-primary)_10%,transparent)] text-[var(--text-brand)]'
              : 'text-muted-foreground hover:text-[var(--text-brand)]'
          }`}
        >
          <Inbox size={13} />
          Inbox
          {inboxUnreadCount > 0 && (
            <span className="ml-auto inline-flex items-center justify-center rounded-full bg-[var(--brand-primary)] text-white text-[10px] font-medium min-w-[18px] h-[18px] px-1">
              {inboxUnreadCount > 99 ? '99+' : inboxUnreadCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveWorkstream(null)}
          className={`flex w-full items-center gap-1.5 rounded-md px-3 py-1.5 text-xs transition-colors cursor-pointer ${
            isHome
              ? 'bg-[color-mix(in_oklch,var(--brand-primary)_10%,transparent)] text-[var(--text-brand)]'
              : 'text-muted-foreground hover:text-[var(--text-brand)]'
          }`}
        >
          <Home size={13} />
          Home
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-1.5 rounded-md border border-dashed border-border-muted px-3 py-1.5 text-xs text-muted-foreground hover:border-[var(--brand-primary)] hover:text-[var(--text-brand)] transition-colors cursor-pointer"
            >
              <Plus size={13} />
              Create
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem onClick={() => showForm()}>
              New Workstream
              {newWorkstreamShortcutLabel && <DropdownMenuShortcut>{newWorkstreamShortcutLabel}</DropdownMenuShortcut>}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={showGroupForm}>
              New Scope
              {newGroupShortcutLabel && <DropdownMenuShortcut>{newGroupShortcutLabel}</DropdownMenuShortcut>}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={showPluginForm}>
              New Plugin
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="px-3 pt-1 pb-1">
        <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">Your work</span>
      </div>
    </>
  );

  return (
    <>
      <SidePanel
        className="pt-10"
        sections={sections}
        selectedId={revealedFileId ?? selectedId}
        onSelect={onSelect}
        collapsed={collapsed}
        onCollapsedChange={setCollapsed}
        width={width}
        onWidthChange={setWidth}
        minWidth={MIN_WIDTH}
        maxWidth={MAX_WIDTH}
        expanded={expansionState}
        onExpandedChange={setExpansionState}
        density="comfortable"
        toggleShortcutKeys={['⌘', 'B']}
        header={sidebarHeader}
        footer={<><ExplorePluginsButton /><FeedbackButton /><UpdateButton /><SettingsButton /></>}
      >
        <div className="px-3 pt-3 pb-1 flex items-center justify-between">
          <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">Plugins</span>
          <NavActionButton onClick={showPluginForm} ariaLabel="Create plugin">
            <Plus size={12} />
          </NavActionButton>
        </div>
        {pluginNavSections.length > 0 ? pluginNavSections : (
          <div className="px-3 py-1">
            <button
              type="button"
              onClick={showPluginForm}
              className="flex w-full items-center gap-1.5 rounded-md border border-dashed border-border-muted px-3 py-1.5 text-xs text-muted-foreground hover:border-[var(--brand-primary)] hover:text-[var(--text-brand)] transition-colors cursor-pointer"
            >
              <Plus size={13} />
              Create plugin
            </button>
          </div>
        )}
      </SidePanel>

      {confirmDialog}
    </>
  );
}
