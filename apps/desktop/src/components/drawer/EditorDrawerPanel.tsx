/**
 * EditorDrawerPanel — Monaco editor rendered inside a drawer tab.
 *
 * Manages file lifecycle (read, watch, save) and LSP integration.
 * Supports cross-file navigation by opening new editor tabs.
 *
 * @ai-context
 * - Receives file path from DrawerContentDescriptor payload
 * - Uses useFileEditor for file I/O and useDrawerNavigation for tab title
 * - Cmd+S saves, cross-file navigation opens new tabs
 * - Initializes Monaco workers on first render
 * - Shows a BranchSwitcherBar when directoryPath is set, with a combobox
 *   to preview the file in other worktrees (branches with existing worktrees)
 * - Auto-switches file when the active workstream changes by querying
 *   GET_DIRECTORIES_WITH_BRANCH_INFO and resolving the new effective path
 * - Cross-file navigation (Cmd+click) propagates branch + directoryPath
 *   context so the switcher persists when navigating between files
 */

import { useState, useEffect, useCallback, useMemo, useRef, useSyncExternalStore } from 'react';
import { getApi, getEvents } from '@vienna/ipc/renderer';
import {
  MonacoEditor,
  EditorFooter,
  useFileEditor,
  initializeMonaco,
  isReadOnlyPath,
  type MonacoEditorSelectionEvent,
} from '@vienna/editor';
import {
  useDrawerSelectionCapture,
  SelectionPopover,
  type SelectionChangeEvent,
} from '@vienna/chat-ui';
import { useQuery, useLazyQuery, GET_GIT_BRANCHES, GET_DIRECTORIES_WITH_BRANCH_INFO } from '@vienna/graphql/client';
import {
  cn,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandItem,
  Badge,
  ScrollArea,
  Markdown,
} from '@tryvienna/ui';
import { GitBranch, Check, ChevronsUpDown, PanelLeft, Eye, EyeOff } from 'lucide-react';
import type { DrawerContentDescriptor } from '../../lib/drawer';
import { useDrawerNavigation, useDrawerActions, useDrawerState } from '../../lib/drawer';
import { api, events } from '../../ipc';
import { useActiveWorkstreamId } from '../../renderer/contexts/WorkstreamContext';
import { getFileEditorPayload, fileEditorContent } from './content';

let monacoInitialized = false;

/**
 * Extract the relative path of a file within a project directory.
 * Handles both direct paths (`/repo/src/foo.ts`) and worktree paths
 * (`/repo/.worktrees/branch-name/src/foo.ts`).
 */
function getRelativePath(filePath: string, directoryPath: string): string {
  // Direct path: /repo/src/foo.ts → src/foo.ts
  if (filePath.startsWith(directoryPath + '/')) {
    const after = filePath.slice(directoryPath.length + 1);
    // Check if it's a .worktrees path within the directory
    if (after.startsWith('.worktrees/')) {
      // /repo/.worktrees/branch/src/foo.ts → skip ".worktrees/<branch>/"
      const parts = after.split('/');
      return parts.slice(2).join('/');
    }
    return after;
  }
  // Fallback: just the filename
  return filePath.split('/').pop() ?? filePath;
}

function useEditorTheme(): 'vienna-dark' | 'vienna-light' {
  const isDark = useSyncExternalStore(
    (cb) => {
      const observer = new MutationObserver(cb);
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
      return () => observer.disconnect();
    },
    () => document.documentElement.classList.contains('dark'),
  );
  return isDark ? 'vienna-dark' : 'vienna-light';
}

export interface EditorDrawerPanelProps {
  content: DrawerContentDescriptor;
}

export function EditorDrawerPanel({ content }: EditorDrawerPanelProps) {
  const payload = getFileEditorPayload(content);
  const filePath = payload?.filePath ?? '';
  const initialLine = payload?.line;
  const initialColumn = payload?.column;
  const payloadBranch = payload?.branch ?? null;
  const payloadDirectoryPath = payload?.directoryPath ?? null;

  // ─── Derive directoryPath and branch from active workstream when not in payload ─
  // This ensures files opened from the diff panel or other surfaces without
  // explicit branch context still get the branch switcher bar.
  const activeWorkstreamId = useActiveWorkstreamId();
  const { data: branchInfoData } = useQuery(GET_DIRECTORIES_WITH_BRANCH_INFO, {
    variables: { workstreamId: activeWorkstreamId! },
    skip: !activeWorkstreamId,
  });

  const { directoryPath, branch } = useMemo(() => {
    // If payload already has directoryPath, use it
    if (payloadDirectoryPath) {
      return { directoryPath: payloadDirectoryPath, branch: payloadBranch };
    }
    // Otherwise, derive from active workstream's branch info by matching filePath
    const dirs = branchInfoData?.directoriesWithBranchInfo ?? [];
    for (const d of dirs) {
      const eff = d.effectivePath ?? d.path;
      if (eff && filePath.startsWith(eff + '/')) {
        return { directoryPath: d.path as string, branch: (d.branch as string) ?? null };
      }
    }
    // Also check base directory paths (file might be on HEAD, no worktree)
    for (const d of dirs) {
      if (d.path && filePath.startsWith(d.path + '/')) {
        return { directoryPath: d.path as string, branch: (d.branch as string) ?? null };
      }
    }
    return { directoryPath: null, branch: payloadBranch };
  }, [payloadDirectoryPath, payloadBranch, branchInfoData, filePath]);

  const ipcClient = useRef(getApi(api));
  const ipcEvents = useRef(getEvents(events));
  const { updateCurrentTitle, replace } = useDrawerNavigation();
  const { openTab, updateTabDirty } = useDrawerActions();
  const { activeTab } = useDrawerState();
  const editorTheme = useEditorTheme();
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const fileName = filePath.split('/').pop() ?? filePath;

  // Initialize Monaco workers once
  useEffect(() => {
    if (!monacoInitialized) {
      initializeMonaco();
      monacoInitialized = true;
    }
  }, []);

  // File lifecycle
  const {
    content: fileContent,
    language,
    isDirty,
    isLoading,
    setContent,
    save,
  } = useFileEditor({
    fileClient: ipcClient.current.file,
    fileEvents: ipcEvents.current.file,
    lspClient: ipcClient.current.lsp,
    filePath,
  });

  // "Ask Vienna" selection capture for Monaco selections
  const { handleSelectionChange, handleCapture, showPopover, popoverPosition } =
    useDrawerSelectionCapture({
      drawerId: `file-editor:${filePath}`,
      drawerTitle: fileName,
      containerRef: editorContainerRef,
    });

  const handleEditorSelectionChange = useCallback(
    (event: MonacoEditorSelectionEvent) => {
      // Convert client coordinates to container-relative, exactly matching
      // how SelectionCaptureWrapper computes its mouseup position.
      let viewportPosition: SelectionChangeEvent['viewportPosition'];
      if (event.clientPosition && editorContainerRef.current) {
        const containerRect = editorContainerRef.current.getBoundingClientRect();
        viewportPosition = {
          x: event.clientPosition.x - containerRect.left,
          y: event.clientPosition.y - containerRect.top,
        };
      }

      handleSelectionChange({
        hasSelection: event.hasSelection,
        selectedText: event.selectedText,
        viewportPosition,
        // Provide file metadata so the hook creates a code_selection context
        metadata: event.hasSelection
          ? { filePath, language: language || '' }
          : undefined,
      });
    },
    [filePath, language, handleSelectionChange],
  );

  // ─── Markdown preview state ──────────────────────────────────────────
  const [showPreview, setShowPreview] = useState(false);
  const isMarkdown = language === 'markdown';

  // Reset preview when navigating to a different file
  useEffect(() => {
    setShowPreview(false);
  }, [filePath]);

  // Cmd+S in preview mode (Monaco handles it when mounted & visible)
  useEffect(() => {
    if (!showPreview) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        void save();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [showPreview, save]);

  // Update tab title and dirty state
  useEffect(() => {
    updateCurrentTitle(fileName);
  }, [fileName, updateCurrentTitle]);

  const tabId = activeTab?.id;
  useEffect(() => {
    if (!tabId) return;
    updateTabDirty(tabId, isDirty);
  }, [isDirty, tabId, updateTabDirty]);

  const handleSave = useCallback(() => {
    void save();
  }, [save]);

  const handleNavigateToFile = useCallback(
    (targetPath: string, line: number, column: number) => {
      const targetFileName = targetPath.split('/').pop() ?? targetPath;
      openTab({
        id: `file-editor:${targetPath}`,
        label: targetFileName,
        initialContent: fileEditorContent(targetPath, { line, column, branch, directoryPath }),
      });
    },
    [openTab, branch, directoryPath],
  );

  const handleBranchSwitch = useCallback(
    (newFilePath: string, newBranch: string | null) => {
      const newFileName = newFilePath.split('/').pop() ?? newFilePath;
      replace(
        fileEditorContent(newFilePath, { branch: newBranch, directoryPath }),
        newFileName,
      );
    },
    [replace, directoryPath],
  );

  // ─── Auto-switch file when active workstream changes ────────────────
  const prevBranchRef = useRef(branch);
  useEffect(() => {
    if (!directoryPath || !branchInfoData) return;
    const dirInfo = branchInfoData.directoriesWithBranchInfo?.find(
      (d) => d.path === directoryPath,
    );
    if (!dirInfo) return;

    const newBranch = dirInfo.branch ?? null;
    if (newBranch === prevBranchRef.current) return;
    prevBranchRef.current = newBranch;

    const newEffectivePath = dirInfo.effectivePath ?? dirInfo.path;
    const relativePath = getRelativePath(filePath, directoryPath);
    const newFilePath = `${newEffectivePath}/${relativePath}`;
    const newFileName = newFilePath.split('/').pop() ?? newFilePath;

    replace(
      fileEditorContent(newFilePath, { branch: newBranch, directoryPath }),
      newFileName,
    );
  }, [branchInfoData, directoryPath, branch, filePath, replace]);

  if (isLoading || fileContent === null) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-neutral-500">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <EditorToolbar
        directoryPath={directoryPath}
        filePath={filePath}
        currentBranch={branch}
        onSwitch={handleBranchSwitch}
        isMarkdown={isMarkdown}
        showPreview={showPreview}
        onTogglePreview={() => setShowPreview((p) => !p)}
      />
      <div ref={editorContainerRef} className="relative flex-1 min-h-0">
        {showPreview && isMarkdown && (
          <ScrollArea className="h-full">
            <div className="p-6">
              <Markdown content={fileContent ?? ''} size="md" />
            </div>
          </ScrollArea>
        )}
        <div className={cn('h-full', showPreview && isMarkdown && 'hidden')}>
          <MonacoEditor
            filePath={filePath}
            languageId={language}
            content={fileContent}
            readOnly={isReadOnlyPath(filePath)}
            theme={editorTheme}
            lspClient={ipcClient.current.lsp}
            lspEvents={ipcEvents.current.lsp}
            onChange={setContent}
            onSave={handleSave}
            onNavigateToFile={handleNavigateToFile}
            onSelectionChange={handleEditorSelectionChange}
            line={initialLine}
            column={initialColumn}
          />
        </div>
        {showPopover && (
          <SelectionPopover
            visible
            position={popoverPosition}
            onCapture={handleCapture}
            containerRef={editorContainerRef}
          />
        )}
      </div>
      <EditorFooter filePath={filePath} language={language} />
    </div>
  );
}

// =============================================================================
// Editor Toolbar
// =============================================================================

interface EditorToolbarProps {
  directoryPath: string | null;
  filePath: string;
  currentBranch: string | null;
  onSwitch: (newFilePath: string, newBranch: string | null) => void;
  isMarkdown: boolean;
  showPreview: boolean;
  onTogglePreview: () => void;
}

function EditorToolbar({
  directoryPath,
  filePath,
  currentBranch,
  onSwitch,
  isMarkdown,
  showPreview,
  onTogglePreview,
}: EditorToolbarProps) {
  const [open, setOpen] = useState(false);

  const [fetchBranches, { data: branchesData, loading }] = useLazyQuery(GET_GIT_BRANCHES, {
    fetchPolicy: 'network-only',
  });

  const branches = branchesData?.gitBranches ?? [];
  const headBranch = branches.find((b) => b.isCurrent);

  const handleOpen = useCallback(
    (isOpen: boolean) => {
      setOpen(isOpen);
      if (isOpen && directoryPath) {
        fetchBranches({ variables: { path: directoryPath } });
      }
    },
    [fetchBranches, directoryPath],
  );

  const handleSelect = useCallback(
    (branchName: string) => {
      if (!directoryPath) return;
      const target = branches.find((b) => b.name === branchName);
      if (!target) return;

      const targetRoot = target.isCurrent ? directoryPath : target.worktreePath;
      if (!targetRoot) return;

      const relativePath = getRelativePath(filePath, directoryPath);
      const newFilePath = `${targetRoot}/${relativePath}`;
      const newBranch = target.isCurrent ? null : branchName;

      setOpen(false);
      onSwitch(newFilePath, newBranch);
    },
    [branches, filePath, directoryPath, onSwitch],
  );

  const displayBranch = currentBranch ?? headBranch?.name ?? 'HEAD';

  const handleRevealInFileViewer = useCallback(() => {
    document.dispatchEvent(
      new CustomEvent('vienna:reveal-in-file-viewer', { detail: { filePath } }),
    );
  }, [filePath]);

  const iconClass = cn(
    'inline-flex items-center justify-center rounded p-0.5',
    'transition-colors duration-100 cursor-pointer',
    directoryPath
      ? 'text-amber-700/60 hover:text-amber-700 dark:text-amber-500/60 dark:hover:text-amber-400'
      : 'text-muted-foreground/60 hover:text-foreground',
  );

  return (
    <div
      className={cn(
        'flex items-center px-3 py-1 border-b',
        directoryPath
          ? 'border-amber-600/20 bg-amber-600/6 dark:border-amber-500/25 dark:bg-amber-500/8'
          : 'border-border-muted/30',
      )}
    >
      {directoryPath && (
        <Popover open={open} onOpenChange={handleOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                'inline-flex items-center gap-1.5 font-mono text-[11px]',
                'text-amber-700 hover:text-amber-600 dark:text-amber-500 dark:hover:text-amber-400',
                'transition-colors duration-100 cursor-pointer',
              )}
            >
              <GitBranch className="size-3 shrink-0" />
              <span className="truncate max-w-[200px]">{displayBranch}</span>
              <ChevronsUpDown className="size-3 opacity-60" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="w-64 rounded-lg border border-border-default bg-surface-elevated p-0 shadow-lg"
            align="start"
            side="bottom"
          >
            <Command shouldFilter>
              <CommandInput placeholder="Switch branch..." />
              <CommandList className="max-h-[200px]">
                <CommandEmpty>{loading ? 'Loading branches...' : 'No branches found'}</CommandEmpty>
                {branches
                  .filter((b) => !b.isRemote && b.name && (b.isCurrent || b.hasWorktree))
                  .map((b) => {
                    const isActive = b.name === currentBranch || (!currentBranch && b.isCurrent);
                    return (
                      <CommandItem
                        key={b.name}
                        value={b.name ?? ''}
                        onSelect={() => { if (b.name) handleSelect(b.name); }}
                        className={cn(isActive && 'bg-accent')}
                      >
                        {b.hasWorktree ? (
                          <span className="size-1.5 shrink-0 rounded-full bg-foreground/40" />
                        ) : (
                          <span className="size-1.5 shrink-0" />
                        )}
                        <span
                          className={cn(
                            'flex-1 truncate font-mono text-xs',
                            isActive ? 'text-foreground' : 'text-muted-foreground',
                          )}
                        >
                          {b.name}
                        </span>
                        {b.isCurrent && (
                          <Badge variant="secondary" className="h-auto px-1 py-0 text-[10px]">
                            HEAD
                          </Badge>
                        )}
                        {isActive && (
                          <Check className="size-3.5 text-foreground" />
                        )}
                      </CommandItem>
                    );
                  })}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}

      <div className="ml-auto flex items-center gap-1">
        {isMarkdown && (
          <button
            type="button"
            onClick={onTogglePreview}
            title={showPreview ? 'Edit markdown' : 'Preview markdown'}
            className={iconClass}
          >
            {showPreview ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
          </button>
        )}
        <button
          type="button"
          onClick={handleRevealInFileViewer}
          title="Open in file viewer"
          className={iconClass}
        >
          <PanelLeft className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
