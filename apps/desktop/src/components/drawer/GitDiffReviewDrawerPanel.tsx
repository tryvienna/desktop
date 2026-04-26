/**
 * GitDiffReviewDrawerPanel — Drawer panel for reviewing git changes on a branch.
 *
 * @ai-context
 * - Three view modes: "All Changes", "Commits", "Working Tree"
 * - "All Changes": aggregate diff of branch vs base with file list
 * - "Commits": list of commits, click to expand per-commit diffs
 * - "Working Tree": uncommitted changes (staged + unstaged + untracked)
 * - Multi-directory support with directory headers
 * - Uses DiffView from @vienna/chat-ui for consistent diff rendering
 * - Uses DrawerContainer for drawer shell (header, scroll, focus trap)
 * - Fetches data via GraphQL queries on demand
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { cn } from '@tryvienna/ui';
import { DiffView, DiffModeToggle } from '@vienna/chat-ui';
import { useApolloClient } from '@vienna/graphql/client';
import {
  GET_GIT_DIFF_SUMMARY,
  GET_GIT_COMMIT_LOG,
  GET_GIT_STATUS_FILES,
  GET_GIT_FILE_AT_REF,
  GET_GIT_FILE_DIFF,
} from '@vienna/graphql/client';
import { createRendererLogger } from '@vienna/logger/renderer';
import { GitCommit, ChevronDown, ChevronRight, Folder, ChevronsDownUp, ChevronsUpDown, ExternalLink } from 'lucide-react';

const logger = createRendererLogger();

import { DrawerContainer } from '../../lib/drawer/DrawerContainer';
import { useDrawerActions } from '../../lib/drawer';
import { useGitDiffStatus } from '../../renderer/hooks/useGitDiffStatus';
import { useGitRefreshTrigger } from '../../renderer/hooks/useGitRefreshTrigger';
import type { DrawerContentDescriptor } from '../../lib/drawer';
import type { GitDiffReviewPayload } from './content';
import { fileEditorTab } from './content';

// ─── Types ────────────────────────────────────────────────────────────────────

type ViewMode = 'all' | 'commits' | 'working';

interface CommitData {
  hash: string;
  shortHash: string;
  message: string;
  author: string;
  date: number;
}

interface FileData {
  path: string;
  status: string;
  oldPath: string | null;
  staged: boolean;
  additions?: number | null;
  deletions?: number | null;
}

interface FileContentPair {
  oldContent: string;
  newContent: string;
  loading: boolean;
  error?: boolean;
  rawDiff?: string;
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  M: 'bg-yellow-500/20 text-yellow-500',
  A: 'bg-emerald-500/20 text-emerald-500',
  D: 'bg-red-500/20 text-red-500',
  R: 'bg-blue-500/20 text-blue-500',
  U: 'bg-neutral-500/20 text-neutral-400',
};

const STATUS_LABELS: Record<string, string> = {
  M: 'Modified',
  A: 'Added',
  D: 'Deleted',
  R: 'Renamed',
  U: 'Untracked',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      title={STATUS_LABELS[status] ?? status}
      className={cn(
        'inline-flex items-center justify-center w-4 h-4 rounded text-[9px] font-bold shrink-0',
        STATUS_COLORS[status] ?? STATUS_COLORS['M'],
      )}
    >
      {status}
    </span>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const EXT_TO_LANGUAGE: Record<string, string> = {
  ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
  py: 'python', rb: 'ruby', go: 'go', rs: 'rust', java: 'java',
  kt: 'kotlin', swift: 'swift', c: 'c', cpp: 'cpp', h: 'c', hpp: 'cpp',
  cs: 'csharp', css: 'css', scss: 'scss', html: 'html', json: 'json',
  yaml: 'yaml', yml: 'yaml', md: 'markdown', sql: 'sql', sh: 'bash',
  zsh: 'bash', bash: 'bash', toml: 'toml', xml: 'xml', graphql: 'graphql',
};

function inferLanguage(filePath: string): string | undefined {
  const ext = filePath.split('.').pop()?.toLowerCase();
  return ext ? EXT_TO_LANGUAGE[ext] : undefined;
}

// ─── File List Item ───────────────────────────────────────────────────────────

function FileListItem({
  file,
  expanded,
  onToggle,
  onOpenInEditor,
  contentPair,
  stickyTop = 0,
}: {
  file: FileData;
  expanded: boolean;
  onToggle: () => void;
  onOpenInEditor?: (filePath: string) => void;
  contentPair: FileContentPair | null;
  stickyTop?: number;
}) {
  const fileName = file.path.split('/').pop() ?? file.path;
  const dirPath = file.path.includes('/')
    ? file.path.slice(0, file.path.lastIndexOf('/'))
    : '';

  return (
    <div className="border-b border-border-muted/20">
      <div className="flex items-center bg-background" style={{ position: 'sticky', top: stickyTop, zIndex: 20 }}>
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            'flex flex-1 items-center gap-2 px-3 py-1.5 text-left min-w-0',
            'border-none cursor-pointer bg-background',
            'hover:bg-surface-hover transition-colors duration-100',
          )}
        >
        {expanded ? (
          <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-3 shrink-0 text-muted-foreground" />
        )}
        <StatusBadge status={file.status} />
        <span className="flex-1 truncate text-xs font-mono">
          <span className="text-foreground">{fileName}</span>
          {dirPath && (
            <span className="text-muted-foreground/60 ml-1">{dirPath}</span>
          )}
        </span>
        {file.oldPath && (
          <span className="text-[10px] text-muted-foreground/50 truncate max-w-32">
            ← {file.oldPath}
          </span>
        )}
        {(file.additions || file.deletions) ? (
          <span className="font-mono text-[10px] shrink-0 ml-auto">
            {file.additions ? <span className="text-emerald-500">+{file.additions}</span> : null}
            {file.additions && file.deletions ? <span className="opacity-50">{' '}</span> : null}
            {file.deletions ? <span className="text-red-400">-{file.deletions}</span> : null}
          </span>
        ) : null}
        </button>
        {onOpenInEditor && (
          <button
            type="button"
            onClick={() => onOpenInEditor(file.path)}
            title="Open in editor"
            className={cn(
              'shrink-0 p-1 mr-2 rounded',
              'text-muted-foreground/40',
              'hover:text-foreground-secondary hover:bg-surface-hover/60',
              'cursor-pointer transition-colors duration-100',
              'border-none bg-transparent',
            )}
          >
            <ExternalLink className="size-3" />
          </button>
        )}
      </div>

      {expanded && contentPair && (
        <div data-nano-file-path={file.path} data-nano-language={inferLanguage(file.path)}>
          {contentPair.loading ? (
            <div className="px-3 py-2 text-xs text-muted-foreground/50">
              Loading diff...
            </div>
          ) : contentPair.error && contentPair.rawDiff ? (
            <pre className="px-3 py-2 text-xs font-mono text-muted-foreground overflow-x-auto whitespace-pre">
              {contentPair.rawDiff}
            </pre>
          ) : contentPair.error ? (
            <div className="px-3 py-2 text-xs text-muted-foreground/50 italic">
              Failed to load diff
            </div>
          ) : contentPair.oldContent === contentPair.newContent ? (
            <div className="px-3 py-2 text-xs text-muted-foreground/50 italic">
              No differences
            </div>
          ) : (
            <DiffView
              oldContent={contentPair.oldContent}
              newContent={contentPair.newContent}
              filePath={file.path}
              maxHeight={Number.MAX_SAFE_INTEGER}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Commit List Item ─────────────────────────────────────────────────────────

function CommitListItem({
  commit,
  expanded,
  onToggle,
  files,
  fileContents,
  onToggleFile,
  onOpenInEditor,
  expandedFiles,
  fileKeyPrefix,
  fileStickyTop = 0,
}: {
  commit: CommitData;
  expanded: boolean;
  onToggle: () => void;
  files: FileData[] | null;
  fileContents: Map<string, FileContentPair>;
  onToggleFile: (filePath: string) => void;
  onOpenInEditor?: (filePath: string) => void;
  expandedFiles: Set<string>;
  fileKeyPrefix: string;
  fileStickyTop?: number;
}) {
  const relativeDate = useMemo(() => {
    const now = Date.now();
    const diff = now - commit.date;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }, [commit.date]);

  return (
    <div className="border-b border-border-muted/20">
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'flex w-full items-center gap-2 px-3 py-2 text-left',
          'border-none bg-transparent cursor-pointer',
          'hover:bg-surface-hover transition-colors duration-100',
        )}
      >
        {expanded ? (
          <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-3 shrink-0 text-muted-foreground" />
        )}
        <GitCommit className="size-3.5 shrink-0 text-muted-foreground" />
        <div className="flex-1 min-w-0">
          <div className="text-xs text-foreground truncate">
            {commit.message}
          </div>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60">
            <span className="font-mono">{commit.shortHash}</span>
            <span>{commit.author}</span>
            <span>{relativeDate}</span>
          </div>
        </div>
      </button>

      {expanded && files && (
        <div className="ml-4 border-l border-border-muted/20">
          {files.map((file) => {
            const fileKey = `${fileKeyPrefix}:${file.path}`;
            return (
              <FileListItem
                key={file.path}
                file={file}
                expanded={expandedFiles.has(fileKey)}
                onToggle={() => onToggleFile(file.path)}
                onOpenInEditor={onOpenInEditor}
                contentPair={fileContents.get(fileKey) ?? null}
                stickyTop={fileStickyTop}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Tab Bar ──────────────────────────────────────────────────────────────────

function ViewTabs({
  active,
  onChange,
}: {
  active: ViewMode;
  onChange: (mode: ViewMode) => void;
}) {
  const tabs: { id: ViewMode; label: string }[] = [
    { id: 'all', label: 'All Changes' },
    { id: 'commits', label: 'Commits' },
    { id: 'working', label: 'Working Tree' },
  ];

  return (
    <div className="flex items-center border-b border-border-muted/30 px-3 gap-3">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            'pb-1.5 pt-1 text-xs border-0 bg-transparent cursor-pointer transition-colors',
            active === tab.id
              ? 'border-b-foreground text-foreground font-medium'
              : 'border-b-transparent text-muted-foreground hover:text-foreground',
          )}
          style={{
            borderBottomWidth: '2px',
            borderBottomStyle: 'solid',
            borderBottomColor:
              active === tab.id ? 'var(--foreground)' : 'transparent',
          }}
        >
          {tab.label}
        </button>
      ))}
      <div className="ml-auto">
        <DiffModeToggle />
      </div>
    </div>
  );
}

// ─── Directory Section ────────────────────────────────────────────────────────

function DirectoryHeader({ name }: { name: string }) {
  return (
    <div className="px-3 py-1.5 bg-surface-sunken/50 text-[10px] text-muted-foreground font-mono tracking-wide uppercase sticky top-0 z-10 border-b border-border-muted/30 flex items-center gap-1.5">
      <Folder className="size-3 opacity-60" />
      {name}
    </div>
  );
}

// ─── Expand/Collapse Toolbar ──────────────────────────────────────────────────

function ExpandCollapseBar({
  expandedCount,
  totalCount,
  onExpandAll,
  onCollapseAll,
}: {
  expandedCount: number;
  totalCount: number;
  onExpandAll: () => void;
  onCollapseAll: () => void;
}) {
  if (totalCount === 0) return null;
  return (
    <div className="flex items-center justify-between px-3 py-1 border-b border-border-muted/20 bg-background">
      <span className="text-[10px] text-muted-foreground/60">
        {totalCount} file{totalCount !== 1 ? 's' : ''}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onExpandAll}
          disabled={expandedCount === totalCount}
          className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-foreground disabled:opacity-30 bg-transparent border-none cursor-pointer disabled:cursor-default transition-colors"
        >
          <ChevronsUpDown className="size-3" />
          Expand all
        </button>
        <button
          type="button"
          onClick={onCollapseAll}
          disabled={expandedCount === 0}
          className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-foreground disabled:opacity-30 bg-transparent border-none cursor-pointer disabled:cursor-default transition-colors"
        >
          <ChevronsDownUp className="size-3" />
          Collapse all
        </button>
      </div>
    </div>
  );
}

// ─── Shared: fetch old/new content for a file ─────────────────────────────────

function useFetchFileContent(client: ReturnType<typeof useApolloClient>) {
  return useCallback(
    async (
      effectivePath: string,
      filePath: string,
      oldRef: string | null,
      newRef: string | null,
    ): Promise<{ oldContent: string; newContent: string; error?: boolean; rawDiff?: string }> => {
      const oldVars = { path: effectivePath, filePath, ref: oldRef };
      const newVars = { path: effectivePath, filePath, ref: newRef };

      const results = await Promise.allSettled([
        oldRef
          ? client
              .query({
                query: GET_GIT_FILE_AT_REF,
                variables: oldVars,
                fetchPolicy: 'network-only',
              })
              .then((r: { data?: Record<string, unknown> }) =>
                (r.data?.gitFileAtRef as string) ?? '',
              )
          : Promise.resolve(''),
        client
          .query({
            query: GET_GIT_FILE_AT_REF,
            variables: newVars,
            fetchPolicy: 'network-only',
          })
          .then((r: { data?: Record<string, unknown> }) =>
            (r.data?.gitFileAtRef as string) ?? '',
          ),
      ]);

      const oldContent = results[0].status === 'fulfilled' ? results[0].value : '';
      const newContent = results[1].status === 'fulfilled' ? results[1].value : '';
      const anyFailed = results[0].status === 'rejected' || results[1].status === 'rejected';

      // If both succeeded and have content, use them directly
      if (!anyFailed && (oldContent || newContent)) {
        return { oldContent, newContent };
      }

      // If one succeeded with content and the other is empty (new/deleted file), that's ok
      if (!anyFailed) {
        return { oldContent, newContent };
      }

      // Fetches failed — try GET_GIT_FILE_DIFF as fallback for raw unified diff
      try {
        const diffResult = await client.query({
          query: GET_GIT_FILE_DIFF,
          variables: { path: effectivePath, filePath, base: oldRef },
          fetchPolicy: 'network-only',
        });
        const rawDiff = (diffResult.data as Record<string, unknown> | undefined)?.gitFileDiff as string | undefined;
        if (rawDiff?.trim()) {
          return { oldContent: '', newContent: '', error: true, rawDiff };
        }
      } catch (fallbackErr) {
        logger.error('[GitDiff] File content fetch failed', {
          filePath,
          error: String(fallbackErr),
        });
      }

      logger.error('[GitDiff] All fetch attempts failed', { filePath });
      return { oldContent: '', newContent: '', error: true };
    },
    [client],
  );
}

// ─── All Changes View ─────────────────────────────────────────────────────────

function AllChangesView({
  directories,
  refreshKey,
  tabsHeight,
  onOpenInEditor,
}: {
  directories: Array<{
    path: string;
    name: string;
    effectivePath: string;
    baseBranch: string;
  }>;
  refreshKey: number;
  tabsHeight: number;
  onOpenInEditor?: (filePath: string) => void;
}) {
  const client = useApolloClient();
  const fetchFileContent = useFetchFileContent(client);
  const [files, setFiles] = useState<
    Map<string, { files: FileData[]; loading: boolean }>
  >(new Map());
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [fileContents, setFileContents] = useState<Map<string, FileContentPair>>(new Map());
  const showDirHeaders = directories.length > 1;

  // Helper: fetch content for a single file key
  const fetchForKey = useCallback(
    (key: string) => {
      const colonIdx = key.indexOf(':');
      const dirPath = key.slice(0, colonIdx);
      const filePath = key.slice(colonIdx + 1);
      const dir = directories.find((d) => d.path === dirPath);
      if (!dir) return;
      setFileContents((prev) =>
        new Map(prev).set(key, { oldContent: '', newContent: '', loading: true }),
      );
      fetchFileContent(dir.effectivePath, filePath, dir.baseBranch, null).then(
        (result) => {
          setFileContents((prev) =>
            new Map(prev).set(key, { ...result, loading: false }),
          );
        },
      ).catch(() => {
        setFileContents((prev) =>
          new Map(prev).set(key, { oldContent: '', newContent: '', loading: false, error: true }),
        );
      });
    },
    [directories, fetchFileContent],
  );

  // Re-fetch content for expanded files when refreshKey changes
  useEffect(() => {
    if (refreshKey > 0) {
      for (const key of expandedFiles) {
        fetchForKey(key);
      }
    }
  }, [refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps -- only on refreshKey

  useEffect(() => {
    for (const dir of directories) {
      setFiles((prev) => {
        const next = new Map(prev);
        next.set(dir.path, { files: [], loading: true });
        return next;
      });

      // Fetch both branch diff files AND working tree status, then merge
      Promise.all([
        client
          .query({
            query: GET_GIT_DIFF_SUMMARY,
            variables: { path: dir.effectivePath, base: dir.baseBranch },
            fetchPolicy: 'network-only',
          })
          .then((result: { data?: Record<string, unknown> }) => {
            const summary = result.data?.gitDiffSummary as Record<string, unknown> | undefined;
            return (summary?.files ?? []) as FileData[];
          })
          .catch((err: unknown) => {
            logger.error('[GitDiff] gitDiffSummary failed', {
              effectivePath: dir.effectivePath,
              error: String(err),
            });
            return [] as FileData[];
          }),
        client
          .query({
            query: GET_GIT_STATUS_FILES,
            variables: { path: dir.effectivePath },
            fetchPolicy: 'network-only',
          })
          .then((result: { data?: Record<string, unknown> }) =>
            (result.data?.gitStatusFiles ?? []) as FileData[],
          )
          .catch((err: unknown) => {
            logger.error('[GitDiff] gitStatusFiles failed', {
              effectivePath: dir.effectivePath,
              error: String(err),
            });
            return [] as FileData[];
          }),
      ]).then(([branchFiles, workingFiles]) => {
        const seen = new Set(branchFiles.map((f: FileData) => f.path));
        const merged = [...branchFiles];
        for (const wf of workingFiles) {
          if (!seen.has(wf.path)) {
            merged.push(wf);
            seen.add(wf.path);
          }
        }
        setFiles((prev) => {
          const next = new Map(prev);
          next.set(dir.path, { files: merged, loading: false });
          return next;
        });
      });
    }
  }, [directories, client, refreshKey]);

  const toggleFile = useCallback(
    (dirPath: string, filePath: string) => {
      const key = `${dirPath}:${filePath}`;
      const isCurrentlyExpanded = expandedFiles.has(key);

      if (isCurrentlyExpanded) {
        setExpandedFiles((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      } else {
        setExpandedFiles((prev) => {
          const next = new Set(prev);
          next.add(key);
          return next;
        });
        if (!fileContents.has(key)) {
          fetchForKey(key);
        }
      }
    },
    [expandedFiles, fileContents, fetchForKey],
  );

  // All file keys for expand/collapse all
  const allFileKeys = useMemo(() => {
    const keys: string[] = [];
    for (const dir of directories) {
      const data = files.get(dir.path);
      if (data && !data.loading) {
        for (const file of data.files) {
          keys.push(`${dir.path}:${file.path}`);
        }
      }
    }
    return keys;
  }, [directories, files]);

  const expandAll = useCallback(() => {
    const newExpanded = new Set(allFileKeys);
    setExpandedFiles(newExpanded);
    for (const key of allFileKeys) {
      if (!fileContents.has(key)) {
        fetchForKey(key);
      }
    }
  }, [allFileKeys, fileContents, fetchForKey]);

  const collapseAll = useCallback(() => {
    setExpandedFiles(new Set());
  }, []);

  return (
    <div>
      <ExpandCollapseBar
        expandedCount={expandedFiles.size}
        totalCount={allFileKeys.length}
        onExpandAll={expandAll}
        onCollapseAll={collapseAll}
      />
      {directories.map((dir) => {
        const data = files.get(dir.path);
        return (
          <div key={dir.path}>
            {showDirHeaders && <DirectoryHeader name={dir.name} />}
            {data?.loading && (
              <div className="px-3 py-4 text-xs text-muted-foreground/50">
                Loading...
              </div>
            )}
            {data &&
              !data.loading &&
              data.files.map((file) => {
                const key = `${dir.path}:${file.path}`;
                return (
                  <FileListItem
                    key={key}
                    file={file}
                    expanded={expandedFiles.has(key)}
                    onToggle={() => toggleFile(dir.path, file.path)}
                    onOpenInEditor={onOpenInEditor ? (fp) => onOpenInEditor(`${dir.effectivePath}/${fp}`) : undefined}
                    contentPair={fileContents.get(key) ?? null}
                    stickyTop={tabsHeight}
                  />
                );
              })}
            {data && !data.loading && data.files.length === 0 && (
              <div className="px-3 py-4 text-xs text-muted-foreground/50">
                No changes
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Commits View ─────────────────────────────────────────────────────────────

function CommitsView({
  directories,
  refreshKey,
  tabsHeight,
  onOpenInEditor,
}: {
  directories: Array<{
    path: string;
    name: string;
    effectivePath: string;
    baseBranch: string;
  }>;
  refreshKey: number;
  onOpenInEditor?: (filePath: string) => void;
  tabsHeight: number;
}) {
  const client = useApolloClient();
  const fetchFileContent = useFetchFileContent(client);
  const [commits, setCommits] = useState<
    Map<string, { commits: CommitData[]; loading: boolean }>
  >(new Map());
  const [expandedCommits, setExpandedCommits] = useState<Set<string>>(new Set());
  // Per-commit file lists
  const [commitFiles, setCommitFiles] = useState<Map<string, FileData[]>>(new Map());
  // Per-commit expanded files and their content
  const [expandedCommitFiles, setExpandedCommitFiles] = useState<Set<string>>(new Set());
  const [commitFileContents, setCommitFileContents] = useState<Map<string, FileContentPair>>(new Map());
  const showDirHeaders = directories.length > 1;

  // Re-fetch expanded commit file diffs on refresh
  useEffect(() => {
    if (refreshKey > 0) {
      // Re-fetch file lists for expanded commits
      for (const commitKey of expandedCommits) {
        const colonIdx = commitKey.indexOf(':');
        const dirPath = commitKey.slice(0, colonIdx);
        const hash = commitKey.slice(colonIdx + 1);
        const dir = directories.find((d) => d.path === dirPath);
        if (dir) {
          client
            .query({
              query: GET_GIT_DIFF_SUMMARY,
              variables: { path: dir.effectivePath, base: `${hash}^` },
              fetchPolicy: 'network-only',
            })
            .then((result: { data?: Record<string, unknown> }) => {
              const summary = result.data?.gitDiffSummary as Record<string, unknown> | undefined;
              setCommitFiles((prev) =>
                new Map(prev).set(commitKey, ((summary?.files ?? []) as FileData[])),
              );
            })
            .catch(() => {
              setCommitFiles((prev) => new Map(prev).set(commitKey, []));
            });
        }
      }
      // Re-fetch content for expanded file diffs
      for (const fileKey of expandedCommitFiles) {
        const parts = fileKey.split(':');
        // key format: dirPath:hash:filePath — dirPath may contain slashes but not colons
        const dirPath = parts[0]!;
        const hash = parts[1]!;
        const filePath = parts.slice(2).join(':');
        const dir = directories.find((d) => d.path === dirPath);
        if (dir) {
          setCommitFileContents((prev) =>
            new Map(prev).set(fileKey, { oldContent: '', newContent: '', loading: true }),
          );
          fetchFileContent(dir.effectivePath, filePath, `${hash}^`, hash).then(
            (result) => {
              setCommitFileContents((prev) =>
                new Map(prev).set(fileKey, { ...result, loading: false }),
              );
            },
          ).catch(() => {
            setCommitFileContents((prev) =>
              new Map(prev).set(fileKey, { oldContent: '', newContent: '', loading: false, error: true }),
            );
          });
        }
      }
    }
  }, [refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    for (const dir of directories) {
      setCommits((prev) => {
        const next = new Map(prev);
        next.set(dir.path, { commits: [], loading: true });
        return next;
      });

      client
        .query({
          query: GET_GIT_COMMIT_LOG,
          variables: { path: dir.effectivePath, base: dir.baseBranch },
          fetchPolicy: 'network-only',
        })
        .then((result: { data?: Record<string, unknown> }) => {
          setCommits((prev) => {
            const next = new Map(prev);
            next.set(dir.path, {
              commits: (result.data?.gitCommitLog ?? []) as CommitData[],
              loading: false,
            });
            return next;
          });
        })
        .catch(() => {
          setCommits((prev) => {
            const next = new Map(prev);
            next.set(dir.path, { commits: [], loading: false });
            return next;
          });
        });
    }
  }, [directories, client, refreshKey]);

  const toggleCommit = useCallback(
    (dirPath: string, hash: string) => {
      const commitKey = `${dirPath}:${hash}`;
      const isCurrentlyExpanded = expandedCommits.has(commitKey);

      if (isCurrentlyExpanded) {
        setExpandedCommits((prev) => {
          const next = new Set(prev);
          next.delete(commitKey);
          return next;
        });
      } else {
        setExpandedCommits((prev) => {
          const next = new Set(prev);
          next.add(commitKey);
          return next;
        });

        if (!commitFiles.has(commitKey)) {
          const dir = directories.find((d) => d.path === dirPath);
          if (dir) {
            client
              .query({
                query: GET_GIT_DIFF_SUMMARY,
                variables: { path: dir.effectivePath, base: `${hash}^` },
                fetchPolicy: 'network-only',
              })
              .then((result: { data?: Record<string, unknown> }) => {
                const summary = result.data?.gitDiffSummary as Record<string, unknown> | undefined;
                setCommitFiles((prev) =>
                  new Map(prev).set(commitKey, ((summary?.files ?? []) as FileData[])),
                );
              })
              .catch(() => {
                setCommitFiles((prev) => new Map(prev).set(commitKey, []));
              });
          }
        }
      }
    },
    [directories, client, expandedCommits, commitFiles],
  );

  const toggleCommitFile = useCallback(
    (dirPath: string, hash: string, filePath: string) => {
      const fileKey = `${dirPath}:${hash}:${filePath}`;
      const isCurrentlyExpanded = expandedCommitFiles.has(fileKey);

      if (isCurrentlyExpanded) {
        setExpandedCommitFiles((prev) => {
          const next = new Set(prev);
          next.delete(fileKey);
          return next;
        });
      } else {
        setExpandedCommitFiles((prev) => {
          const next = new Set(prev);
          next.add(fileKey);
          return next;
        });

        if (!commitFileContents.has(fileKey)) {
          const dir = directories.find((d) => d.path === dirPath);
          if (dir) {
            setCommitFileContents((prev) =>
              new Map(prev).set(fileKey, { oldContent: '', newContent: '', loading: true }),
            );
            fetchFileContent(dir.effectivePath, filePath, `${hash}^`, hash).then(
              (result) => {
                setCommitFileContents((prev) =>
                  new Map(prev).set(fileKey, { ...result, loading: false }),
                );
              },
            ).catch(() => {
              setCommitFileContents((prev) =>
                new Map(prev).set(fileKey, { oldContent: '', newContent: '', loading: false, error: true }),
              );
            });
          }
        }
      }
    },
    [directories, expandedCommitFiles, commitFileContents, fetchFileContent],
  );

  return (
    <div>
      {directories.map((dir) => {
        const data = commits.get(dir.path);
        return (
          <div key={dir.path}>
            {showDirHeaders && <DirectoryHeader name={dir.name} />}
            {data?.loading && (
              <div className="px-3 py-4 text-xs text-muted-foreground/50">
                Loading...
              </div>
            )}
            {data &&
              !data.loading &&
              data.commits.map((commit) => {
                const commitKey = `${dir.path}:${commit.hash}`;
                const isExpanded = expandedCommits.has(commitKey);
                const files = commitFiles.get(commitKey) ?? null;

                return (
                  <CommitListItem
                    key={commitKey}
                    commit={commit}
                    expanded={isExpanded}
                    onToggle={() => toggleCommit(dir.path, commit.hash)}
                    files={isExpanded ? files : null}
                    fileContents={commitFileContents}
                    onToggleFile={(fp) => toggleCommitFile(dir.path, commit.hash, fp)}
                    onOpenInEditor={onOpenInEditor ? (fp) => onOpenInEditor(`${dir.effectivePath}/${fp}`) : undefined}
                    expandedFiles={expandedCommitFiles}
                    fileKeyPrefix={commitKey}
                    fileStickyTop={tabsHeight}
                  />
                );
              })}
            {data && !data.loading && data.commits.length === 0 && (
              <div className="px-3 py-4 text-xs text-muted-foreground/50">
                No commits ahead of base
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Working Tree View ────────────────────────────────────────────────────────

function WorkingTreeView({
  directories,
  refreshKey,
  tabsHeight,
  onOpenInEditor,
}: {
  directories: Array<{
    path: string;
    name: string;
    effectivePath: string;
    baseBranch: string;
  }>;
  refreshKey: number;
  onOpenInEditor?: (filePath: string) => void;
  tabsHeight: number;
}) {
  const client = useApolloClient();
  const fetchFileContent = useFetchFileContent(client);
  const [files, setFiles] = useState<
    Map<string, { files: FileData[]; loading: boolean }>
  >(new Map());
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [fileContents, setFileContents] = useState<Map<string, FileContentPair>>(new Map());
  const showDirHeaders = directories.length > 1;

  // Helper: fetch content for a single file key
  const fetchForKey = useCallback(
    (key: string) => {
      const colonIdx = key.indexOf(':');
      const dirPath = key.slice(0, colonIdx);
      const filePath = key.slice(colonIdx + 1);
      const dir = directories.find((d) => d.path === dirPath);
      if (!dir) return;
      setFileContents((prev) =>
        new Map(prev).set(key, { oldContent: '', newContent: '', loading: true }),
      );
      fetchFileContent(dir.effectivePath, filePath, 'HEAD', null).then(
        (result) => {
          setFileContents((prev) =>
            new Map(prev).set(key, { ...result, loading: false }),
          );
        },
      ).catch(() => {
        setFileContents((prev) =>
          new Map(prev).set(key, { oldContent: '', newContent: '', loading: false, error: true }),
        );
      });
    },
    [directories, fetchFileContent],
  );

  // Re-fetch content for expanded files on refresh
  useEffect(() => {
    if (refreshKey > 0) {
      for (const key of expandedFiles) {
        fetchForKey(key);
      }
    }
  }, [refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    for (const dir of directories) {
      setFiles((prev) => {
        const next = new Map(prev);
        next.set(dir.path, { files: [], loading: true });
        return next;
      });

      client
        .query({
          query: GET_GIT_STATUS_FILES,
          variables: { path: dir.effectivePath },
          fetchPolicy: 'network-only',
        })
        .then((result: { data?: Record<string, unknown> }) => {
          setFiles((prev) => {
            const next = new Map(prev);
            next.set(dir.path, {
              files: (result.data?.gitStatusFiles ?? []) as FileData[],
              loading: false,
            });
            return next;
          });
        })
        .catch(() => {
          setFiles((prev) => {
            const next = new Map(prev);
            next.set(dir.path, { files: [], loading: false });
            return next;
          });
        });
    }
  }, [directories, client, refreshKey]);

  const toggleFile = useCallback(
    (dirPath: string, filePath: string) => {
      const key = `${dirPath}:${filePath}`;
      const isCurrentlyExpanded = expandedFiles.has(key);

      if (isCurrentlyExpanded) {
        setExpandedFiles((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      } else {
        setExpandedFiles((prev) => {
          const next = new Set(prev);
          next.add(key);
          return next;
        });
        if (!fileContents.has(key)) {
          fetchForKey(key);
        }
      }
    },
    [expandedFiles, fileContents, fetchForKey],
  );

  const allFileKeys = useMemo(() => {
    const keys: string[] = [];
    for (const dir of directories) {
      const data = files.get(dir.path);
      if (data && !data.loading) {
        for (const file of data.files) {
          keys.push(`${dir.path}:${file.path}`);
        }
      }
    }
    return keys;
  }, [directories, files]);

  const expandAll = useCallback(() => {
    setExpandedFiles(new Set(allFileKeys));
    for (const key of allFileKeys) {
      if (!fileContents.has(key)) {
        fetchForKey(key);
      }
    }
  }, [allFileKeys, fileContents, fetchForKey]);

  const collapseAll = useCallback(() => {
    setExpandedFiles(new Set());
  }, []);

  return (
    <div>
      <ExpandCollapseBar
        expandedCount={expandedFiles.size}
        totalCount={allFileKeys.length}
        onExpandAll={expandAll}
        onCollapseAll={collapseAll}
      />
      {directories.map((dir) => {
        const data = files.get(dir.path);
        return (
          <div key={dir.path}>
            {showDirHeaders && <DirectoryHeader name={dir.name} />}
            {data?.loading && (
              <div className="px-3 py-4 text-xs text-muted-foreground/50">
                Loading...
              </div>
            )}
            {data &&
              !data.loading &&
              data.files.map((file) => {
                const key = `${dir.path}:${file.path}`;
                return (
                  <FileListItem
                    key={key}
                    file={file}
                    expanded={expandedFiles.has(key)}
                    onToggle={() => toggleFile(dir.path, file.path)}
                    onOpenInEditor={onOpenInEditor ? (fp) => onOpenInEditor(`${dir.effectivePath}/${fp}`) : undefined}
                    contentPair={fileContents.get(key) ?? null}
                    stickyTop={tabsHeight}
                  />
                );
              })}
            {data && !data.loading && data.files.length === 0 && (
              <div className="px-3 py-4 text-xs text-muted-foreground/50">
                Working tree clean
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

function GitDiffReviewContent({
  workstreamId,
}: {
  workstreamId: string;
}) {
  const { directories: diffDirs, isLoading } = useGitDiffStatus(workstreamId);
  const { refreshKey } = useGitRefreshTrigger(workstreamId);
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const { openTab } = useDrawerActions();

  const handleOpenInEditor = useCallback(
    (filePath: string) => openTab(fileEditorTab(filePath)),
    [openTab],
  );

  const directories = useMemo(
    () =>
      diffDirs.map((d) => ({
        path: d.path,
        name: d.name,
        effectivePath: d.effectivePath,
        branch: d.branch,
        baseBranch: d.baseBranch,
      })),
    [diffDirs],
  );

  if (isLoading && directories.length === 0) {
    return (
      <DrawerContainer title="Git Changes" hideRefresh>
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          Loading...
        </div>
      </DrawerContainer>
    );
  }

  if (directories.length === 0) {
    return (
      <DrawerContainer title="Git Changes" hideRefresh>
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          No branches with changes to review.
        </div>
      </DrawerContainer>
    );
  }

  return (
    <DrawerContainer
      title="Git Changes"
      hideRefresh
      contentClassName="p-0"
      subheader={<ViewTabs active={viewMode} onChange={setViewMode} />}
    >
      {viewMode === 'all' && <AllChangesView directories={directories} refreshKey={refreshKey} tabsHeight={0} onOpenInEditor={handleOpenInEditor} />}
      {viewMode === 'commits' && <CommitsView directories={directories} refreshKey={refreshKey} tabsHeight={0} onOpenInEditor={handleOpenInEditor} />}
      {viewMode === 'working' && (
        <WorkingTreeView directories={directories} refreshKey={refreshKey} tabsHeight={0} onOpenInEditor={handleOpenInEditor} />
      )}
    </DrawerContainer>
  );
}

// ─── Outer Wrapper ────────────────────────────────────────────────────────────

export function GitDiffReviewDrawerPanel({
  content,
}: {
  content: DrawerContentDescriptor;
}) {
  const payload = content.payload as unknown as GitDiffReviewPayload | undefined;

  if (!payload?.workstreamId) {
    return (
      <DrawerContainer title="Git Changes" hideRefresh>
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          No workstream selected.
        </div>
      </DrawerContainer>
    );
  }

  return <GitDiffReviewContent workstreamId={payload.workstreamId} />;
}
