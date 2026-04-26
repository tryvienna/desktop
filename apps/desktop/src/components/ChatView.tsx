/**
 * ChatView — Main content component for the active workstream's conversation.
 *
 * Bridges useWorkstreamChat (IPC events → Zustand store) to the @vienna/chat-ui
 * Chat component via ChatProvider.
 *
 * @ai-context
 * - React.memo prevents re-render when AppLayout re-renders for unrelated reasons
 * - ChatProvider receives store only (no subscription/sessionId) — event connection
 *   is managed by useWorkstreamChat to coordinate with replay lifecycle
 * - All callbacks are stable refs from the hook — no child re-renders
 * - Uses unified ChatInput (via Chat) with entity palette, commands, draft persistence
 * - draftKey scoped per workstream so each gets its own persisted draft
 * - emptyState shows a greeting when no messages exist (fresh canvas empty state)
 */

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TerminalIcon } from 'lucide-react';
import { ChatProvider, Chat, defaultRegistry, EntityClickProvider, EntityWidgetProvider, TagStatusProvider, useChatAgentBusy, useDoubleEscapeInterrupt, InterruptHint, getEntityDisplayLabel, parseEntityURI, buildEntityURI, TokenUsageBar, useChatUsage, computeUsageDisplay, ActionFormBar, PasteEditorProvider, OpenFileProvider, TodoIndicator, TodoPanel, ChatInputUnified, transformInputValueToPlainText, buildContentBlocks } from '@vienna/chat-ui';
import type { ToolUse, ParsedEntityURI, Command, PaletteTab, PaletteEntity, ActionFormDefinition, ParsedPasteMarkup, VerificationCallbacks, ResolvedVerificationAction, SkillMenuItem, SkillPreviewItem, InputValue, Attachment } from '@vienna/chat-ui';
import { useMutation, useQuery, useLazyQuery, UPDATE_WORKSTREAM, GET_DIRECTORIES_WITH_BRANCH_INFO, GET_WORKSTREAM_TAGS, GET_USER_MESSAGE_HISTORY } from '@vienna/graphql/client';
import { getApi } from '@vienna/ipc/renderer';
import { createRendererLogger } from '@vienna/logger/renderer';
import { toast } from '@tryvienna/ui';
import { api } from '../ipc';

const searchLogger = createRendererLogger('GlobalSearch');
import { resolvedEntityWidgetRenderer } from './ResolvedEntityWidget';
import { useWorkstreamChat } from '../renderer/hooks/useWorkstreamChat';
import { useDrawerActions } from '../lib/drawer';
import { useEntityPalette } from '../providers/EntityProvider';
import { useCommandPalette } from '../providers/CommandProvider';
import { useSetActiveChatContext } from '../providers/ActiveChatStoreContext';
import { useFlowRegistry } from '../flows/useFlowRegistry';
import { entityDrawerContent, fileChangeReviewContent, fileEditorTab, pasteContent, planReviewContent, verificationActionsConfigContent, skillBrowserContent, helpDocTab } from './drawer/content';
import { getHelpDoc } from '../in-app-docs';
import { useSkills } from './skills/use-skills';
import { BranchPicker } from './BranchPicker';
import { PermissionIndicator } from './PermissionIndicator';
import { TagMenu } from './tags/TagMenu';
import { BranchStatusBar } from './BranchStatusBar';
import { ChatEmptyState } from './quick-actions/ChatEmptyState';
import { useWorkstreamList, useWorkstreamActions } from '../renderer/contexts/WorkstreamContext';
import { useVerificationActions } from './verification-actions/use-verification-actions';
import { useVoiceInput } from '../hooks/useVoiceInput';
import { WhisperModelDialog } from './WhisperModelDialog';
import { useKeybindings } from '../providers/KeybindingsProvider';
import { ShortcutBadge } from '../keybindings/components/ShortcutBadge';

const COMMAND_TABS: PaletteTab[] = [
  { id: 'all', label: 'All' },
  { id: 'skill', label: 'Skills' },
  { id: 'claude', label: 'Claude' },
  { id: 'workstream', label: 'Workstreams' },
  { id: 'navigation', label: 'Navigation' },
  { id: 'settings', label: 'Settings' },
  { id: 'developer', label: 'Developer' },
  { id: 'help', label: 'Help' },
];

interface ChatViewProps {
  workstreamId: string | null;
  /** Active action form definition (e.g. new workstream form) */
  activeActionForm?: ActionFormDefinition | null;
  /** Called when the action form is submitted */
  onActionFormSubmit?: (formId: string, answers: Record<string, string>) => void;
  /** Called when the action form is dismissed */
  onActionFormDismiss?: () => void;
  /** Step IDs disabled by user preferences */
  actionFormDisabledSteps?: string[];
  /** Called when user modifies step preferences */
  onActionFormPreferencesChange?: (disabledStepIds: string[]) => void;
  /** Called to show the fork workstream form */
  onShowForkForm?: (context: { messageId: string; providerUuid: string; workstreamId: string; workstreamTitle: string }) => void;
}

/** Connected token usage summary — must render inside ChatProvider */
const TokenUsageSummary = memo(function TokenUsageSummary() {
  const usage = useChatUsage();
  const { currentContext, cachePercent } = computeUsageDisplay(usage);

  if (currentContext === 0 && usage.outputTokens === 0) return null;

  return (
    <TokenUsageBar
      contextSize={currentContext}
      maxContext={usage.contextWindow ?? 200_000}
      outputTokens={usage.outputTokens}
      cacheHitRate={cachePercent}
      costUsd={usage.costUsd}
      collapsible
      className="justify-end px-0 pr-2 pt-0 pb-0"
    />
  );
});

/** Look up a registered tool renderer and render it, or return null for fallback */
function renderTool(
  toolUse: ToolUse,
  messageId: string,
  isFromHistory: boolean | undefined,
  onApprove?: (requestId: string, scope: 'once' | 'session' | 'permanent') => void,
  onDeny?: (requestId: string, message?: string) => void,
  onRevokeRule?: (toolName: string, scope: 'session' | 'persistent') => void,
  onOpenPlanReview?: (toolUseId: string, requestId: string) => void,
): React.ReactNode {
  const def = defaultRegistry.getRenderer(toolUse);
  if (!def) return null;
  const Component = def.component;
  // Construct a bound revoke closure from the tool's approval info
  const onRevoke = onRevokeRule && toolUse.approvalMethod
    ? () => {
        const scope = toolUse.approvalMethod === 'persistent_rule' ? 'persistent' as const : 'session' as const;
        onRevokeRule(toolUse.name, scope);
      }
    : undefined;
  return (
    <Component
      toolUse={toolUse}
      messageId={messageId}
      isFromHistory={isFromHistory}
      onApprove={onApprove}
      onDeny={onDeny}
      onRevoke={onRevoke}
      onOpenPlanReview={onOpenPlanReview}
    />
  );
}

export const ChatView = memo(function ChatView({
  workstreamId,
  activeActionForm,
  onActionFormSubmit,
  onActionFormDismiss,
  actionFormDisabledSteps,
  onActionFormPreferencesChange,
  onShowForkForm,
}: ChatViewProps) {
  const {
    store,
    isReplaying,
    sendMessage,
    approvePermission,
    denyPermission,
    revokeRule,
    interrupt,
    loadMore,
    rewindConversation,
  } = useWorkstreamChat(workstreamId);
  const navigate = useNavigate();
  const { openTab, openFull } = useDrawerActions();
  const { dataProvider: entityProvider, tabs: entityTabs } = useEntityPalette();
  const { dataProvider: commandProvider, commands: allCommands, executeCommand } = useCommandPalette();
  const setActiveChatContext = useSetActiveChatContext();
  const claudeCommandsWithFlow = useMemo(
    () => allCommands
      .filter((c): c is typeof c & { body: string } => c.id.startsWith('claude-cmd:') && c.hasFlow === true && typeof c.body === 'string')
      .map((c) => ({ id: c.id, title: c.title, body: c.body })),
    [allCommands],
  );
  const flowRegistry = useFlowRegistry({ claudeCommands: claudeCommandsWithFlow });
  const { workstreams, projectId } = useWorkstreamList();
  const { archiveWorkstream, setActiveWorkstream, createWorkstream } = useWorkstreamActions();
  const { actions: verificationActionConfigs } = useVerificationActions();
  const { installedSkills, activate } = useSkills();

  // ── Voice input (push-to-talk transcription) ───────────────────────
  const voice = useVoiceInput({});
  const { getShortcut, platform } = useKeybindings();
  const voiceShortcut = getShortcut('input:voice');
  const voiceShortcutHint = useMemo(
    () => voiceShortcut ? <ShortcutBadge shortcut={voiceShortcut} platform={platform} /> : null,
    [voiceShortcut, platform],
  );

  // ── Tag status lookup (live status for TagExecutionWidget) ──────────
  // Only poll when tags are applied to avoid unnecessary queries
  const [hasTags, setHasTags] = useState(false);
  const { data: wsTagData } = useQuery(GET_WORKSTREAM_TAGS, {
    variables: { workstreamId: workstreamId ?? '' },
    skip: !workstreamId,
    pollInterval: hasTags ? 3000 : 0,
  });
  useEffect(() => {
    setHasTags((wsTagData?.workstreamTags?.length ?? 0) > 0);
  }, [wsTagData]);
  const tagStatusLookup = useCallback(
    (wsId: string) => {
      if (wsId !== workstreamId || !wsTagData?.workstreamTags) return [];
      return wsTagData.workstreamTags
        .filter((wsl) => wsl.tagName)
        .map((wsl) => ({
          tagName: String(wsl.tagName),
          status: String(wsl.status ?? 'pending'),
        }));
    },
    [workstreamId, wsTagData],
  );

  // ── User message history (for up-arrow navigation in chat input) ────────
  // Fetch the most recent user-sent messages when workstream changes.
  // As the user navigates backward, preemptively load older pages.

  const { data: initialHistoryData } = useQuery(GET_USER_MESSAGE_HISTORY, {
    variables: { workstreamId: workstreamId ?? '', limit: 10 },
    skip: !workstreamId,
    fetchPolicy: 'network-only',
  });

  const [messageHistory, setMessageHistory] = useState<string[]>([]);
  const historyCursorRef = useRef<number | undefined>(undefined);
  const historyHasMoreRef = useRef(true);

  // Seed from initial query result, or reset when workstream changes and
  // query hasn't returned yet. Single effect avoids race between separate
  // reset + seed effects whose execution order is not guaranteed by React.
  useEffect(() => {
    if (!initialHistoryData?.userMessageHistory) {
      // Query still loading for the new workstream — reset to empty
      setMessageHistory([]);
      historyCursorRef.current = undefined;
      historyHasMoreRef.current = true;
      return;
    }
    const { items, hasMore } = initialHistoryData.userMessageHistory;
    setMessageHistory(items.map((i) => i.text));
    historyHasMoreRef.current = hasMore;
    historyCursorRef.current = items.length > 0 ? items[items.length - 1].eventId : undefined;
  }, [workstreamId, initialHistoryData]);

  const [fetchMoreHistory] = useLazyQuery(GET_USER_MESSAGE_HISTORY);

  const handleMessageHistoryNearEnd = useCallback(() => {
    if (!historyHasMoreRef.current || !workstreamId || historyCursorRef.current == null) return;
    const cursor = historyCursorRef.current;
    fetchMoreHistory({
      variables: { workstreamId, limit: 10, before: cursor },
      fetchPolicy: 'network-only',
    }).then(({ data }) => {
      if (!data?.userMessageHistory) return;
      const { items, hasMore } = data.userMessageHistory;
      if (items.length === 0) return;
      const newTexts = items.map((i) => i.text);
      setMessageHistory((prev) => [...prev, ...newTexts]);
      historyHasMoreRef.current = hasMore;
      historyCursorRef.current = items[items.length - 1].eventId;
    }).catch(() => {
      // Stop retrying on failure — the user can trigger another load by navigating
      historyHasMoreRef.current = false;
    });
  }, [workstreamId, fetchMoreHistory]);

  // ── Skills state ─────────────────────────────────────────────────────────
  const [pendingSkills, setPendingSkills] = useState<SkillPreviewItem[]>([]);
  const [skillBodies, setSkillBodies] = useState<Map<string, string>>(new Map());

  // Build SkillMenuItem[] from installed enabled skills (pinned first)
  const skillMenuItems = useMemo<SkillMenuItem[]>(() => {
    return installedSkills
      .filter((s) => s.enabled)
      .sort((a, b) =>
        a.pinned === b.pinned ? 0 : a.pinned ? -1 : 1
      )
      .map((s) => ({
        id: s.id ?? '',
        name: s.name ?? '',
        description: s.description ?? '',
        pinned: s.pinned ?? false,
      }));
  }, [installedSkills]);

  const handleSkillSelect = useCallback(
    async (skillId: string) => {
      // Use functional update to check for duplicates without stale closure
      let alreadyPending = false;
      setPendingSkills((prev) => {
        if (prev.some((s) => s.id === skillId)) {
          alreadyPending = true;
        }
        return prev;
      });
      if (alreadyPending) return;

      const body = await activate(skillId);
      if (!body) return;

      const skill = installedSkills.find((s) => s.id === skillId);
      if (!skill?.id) return;

      const skillId_ = skill.id;
      setPendingSkills((prev) => {
        if (prev.some((s) => s.id === skillId)) return prev;
        return [...prev, { id: skillId_, name: skill.name ?? '', description: skill.description ?? '' }];
      });
      setSkillBodies((prev) => new Map(prev).set(skillId_, body));
    },
    [activate, installedSkills],
  );

  const handleBrowseSkills = useCallback(() => {
    openFull(skillBrowserContent());
  }, [openFull]);

  const handleSkillRemove = useCallback((skillId: string) => {
    setPendingSkills((prev) => prev.filter((s) => s.id !== skillId));
    setSkillBodies((prev) => {
      const next = new Map(prev);
      next.delete(skillId);
      return next;
    });
  }, []);

  const handleClearPendingSkills = useCallback(() => {
    setPendingSkills([]);
    setSkillBodies(new Map());
  }, []);

  // Listen for skill activations from command palettes (both global overlay and inline).
  // The overlay dispatches a document-level custom event; the inline palette calls
  // handleCommandExecute which also dispatches the same event — so this single listener
  // handles both paths.
  useEffect(() => {
    const handler = (e: Event) => {
      const { text, name, type } = (e as CustomEvent<{ text: string; name?: string; type?: 'skill' | 'command' }>).detail;
      if (!text) return;
      const id = `palette-${crypto.randomUUID()}`;
      setPendingSkills((prev) => [...prev, { id, name: name ?? 'Command', description: '', type: type ?? 'skill' }]);
      setSkillBodies((prev) => new Map(prev).set(id, text));
    };
    document.addEventListener('vienna:activate-skill-text', handler);
    return () => document.removeEventListener('vienna:activate-skill-text', handler);
  }, []);

  // Share the active chat store and permission callbacks with drawer panels
  const chatCallbacks = useMemo(
    () => ({ approvePermission, denyPermission }),
    [approvePermission, denyPermission]
  );
  useEffect(() => {
    setActiveChatContext(store, chatCallbacks);
    return () => setActiveChatContext(null, null);
  }, [store, chatCallbacks, setActiveChatContext]);

  // Focus the chat input whenever the active workstream changes (or replay finishes)
  useEffect(() => {
    if (!workstreamId || isReplaying) return;
    const raf = requestAnimationFrame(() => {
      document.querySelector<HTMLElement>('[role="textbox"]')?.focus();
    });
    return () => cancelAnimationFrame(raf);
  }, [workstreamId, isReplaying]);

  // ── Directory data + IPC (hoisted for handleSend bash mode + global search) ──
  const { data: dirsData } = useQuery(GET_DIRECTORIES_WITH_BRANCH_INFO, {
    variables: { workstreamId: workstreamId! },
    skip: !workstreamId,
  });

  // Wrap sendMessage to match unified ChatInput onSend signature
  // (message, contentBlocks?, imageAttachmentMeta?) => Promise<void>
  // Prepends activated skill bodies as one-shot prompt injections
  // Also handles bash mode: messages starting with "! " are executed as shell commands
  const handleSend = useCallback(
    async (
      message: string,
      contentBlocks?: Array<{ type: string; source?: { type: string; media_type: string; data: string } }>,
      imageAttachmentMeta?: Array<{ name: string; mimeType: string; size: number; previewUrl: string }>,
    ) => {
      // ── Bash mode: "! " prefix executes a shell command ─────────────────
      // Require "! " (bang + space) to avoid false positives like "!important"
      if (message.startsWith('! ') || message === '!') {
        const command = message.slice(1).trim();
        if (!command) return;

        const dirs = dirsData?.directoriesWithBranchInfo;
        const firstDir = dirs?.[0];
        const cwd = firstDir?.effectivePath ?? firstDir?.path;
        if (!cwd) {
          toast.error('No working directory available for shell commands');
          return;
        }

        // Execute the command in the worktree directory
        const ipc = getApi(api);
        const result = await ipc.shell.execute({ command, cwd });

        // Build structured text for Claude (XML tags for clean parsing)
        // Wrap command+output in CDATA to prevent XML injection from command output
        const safeCwd = cwd.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const output = [result.stdout, result.stderr].filter(Boolean).join('\n').trimEnd();
        const exitInfo = result.exitCode === null ? 'timed out' : `exit code ${result.exitCode}`;
        const textForClaude = `<shell-execution cwd="${safeCwd}">\n<![CDATA[\n$ ${command}\n${output}\n]]>\n(${exitInfo})\n</shell-execution>`;

        const displayText = `! ${command}`;

        await sendMessage(textForClaude, undefined, undefined, {
          displayText,
          shellExecution: {
            command,
            cwd,
            stdout: result.stdout,
            stderr: result.stderr,
            exitCode: result.exitCode,
            durationMs: result.durationMs,
          },
        });
        return;
      }

      let finalMessage = message;
      let skillActivations: Array<{ id: string; name: string; body?: string }> | undefined;

      // Inject skill bodies as one-shot prompt prefixes
      if (skillBodies.size > 0) {
        skillActivations = pendingSkills.map((s) => ({
          id: s.id,
          name: s.name,
          body: skillBodies.get(s.id),
        }));

        const injections = Array.from(skillBodies.entries())
          .map(([id, body]) => {
            const safeId = id.replace(/[<>"&]/g, '');
            return `<skill-activated name="${safeId}">\n${body}\n</skill-activated>`;
          })
          .join('\n\n');
        finalMessage = `${injections}\n\n${message}`;

        // Clear pending skills after injection (one-shot)
        setPendingSkills([]);
        setSkillBodies(new Map());
      }

      // Pass clean message as displayText so the user bubble doesn't show skill XML.
      // Skill activations are rendered as content blocks within the user message.
      await sendMessage(finalMessage, contentBlocks, imageAttachmentMeta, {
        ...(message !== finalMessage ? { displayText: message } : {}),
        ...(skillActivations ? { skillActivations } : {}),
      });
    },
    [sendMessage, skillBodies, pendingSkills, dirsData]
  );

  // Open plan review in the drawer
  const handleOpenPlanReview = useCallback(
    (toolUseId: string, requestId: string) => {
      openFull(planReviewContent(toolUseId, requestId));
    },
    [openFull],
  );

  // Fork workstream at a specific message
  const handleFork = useCallback(
    (messageId: string, providerUuid: string) => {
      if (!workstreamId || !onShowForkForm) return;
      const ws = workstreams.find((w) => w.id === workstreamId);
      onShowForkForm({
        messageId,
        providerUuid,
        workstreamId,
        workstreamTitle: ws?.title ?? 'Workstream',
      });
    },
    [workstreamId, workstreams, onShowForkForm],
  );

  // Stable tool renderer that uses the global registry + passes permission callbacks
  const toolRenderer = useCallback(
    (toolUse: ToolUse, messageId: string, isFromHistory?: boolean) =>
      renderTool(toolUse, messageId, isFromHistory, approvePermission, denyPermission, revokeRule, handleOpenPlanReview),
    [approvePermission, denyPermission, revokeRule, handleOpenPlanReview]
  );

  // Memoize accessories so they don't re-create on every ChatView render
  // (e.g., when isReplaying flips during agent restart)
  const leadingAccessories = useMemo(
    () => workstreamId ? (
      <>
        <BranchPicker workstreamId={workstreamId} />
        <PermissionIndicator workstreamId={workstreamId} />
        {projectId && <TagMenu workstreamId={workstreamId} projectId={projectId} />}
      </>
    ) : null,
    [workstreamId, projectId],
  );
  const [todoExpanded, setTodoExpanded] = useState(false);
  const toggleTodo = useCallback(() => setTodoExpanded((p) => !p), []);
  const closeTodo = useCallback(() => setTodoExpanded(false), []);

  // Listen for global keyboard shortcut (CMD+SHIFT+T) to toggle todo panel
  useEffect(() => {
    const handler = () => toggleTodo();
    document.addEventListener('vienna:toggle-todo-panel', handler);
    return () => document.removeEventListener('vienna:toggle-todo-panel', handler);
  }, [toggleTodo]);

  const footer = useMemo(
    () => workstreamId ? (
      <div className="flex items-center h-6">
        <BranchStatusBar workstreamId={workstreamId} className="flex-1 min-w-0" />
        <TodoIndicator expanded={todoExpanded} onToggle={toggleTodo} />
        <TokenUsageSummary />
      </div>
    ) : null,
    [workstreamId, todoExpanded, toggleTodo],
  );

  const todoPanel = useMemo(
    () => <TodoPanel expanded={todoExpanded} onAutoClose={closeTodo} />,
    [todoExpanded, closeTodo],
  );

  // Open a help doc in the drawer (defined before handleCommandExecute which references it)
  const handleHelpDocClick = useCallback(
    (docId: string) => {
      const doc = getHelpDoc(docId);
      if (doc) openTab(helpDocTab(docId, doc.label, doc.content));
    },
    [openTab],
  );

  // Handle command execution from inline / palette.
  // Commands that map to CLI slash commands (skills, claude-cmd, any-cmd
  // fallback) are sent directly to the agent as messages.
  // Everything else (navigation, flows, settings) goes through executeCommand.
  const handleCommandExecute = useCallback(
    (command: Command) => {
      commandProvider.markRecent(command);

      // Help doc commands — open the doc in a drawer tab
      if (command.id.startsWith('help:doc:')) {
        const docId = command.id.slice('help:doc:'.length);
        handleHelpDocClick(docId);
        return;
      }

      // Commands that should be sent to the agent as slash commands
      const prefixes = ['any-cmd:', 'skill:', 'claude-cmd:'] as const;
      const match = prefixes.find((p) => command.id.startsWith(p));
      if (match) {
        const name = command.id.slice(match.length);
        void sendMessage('/' + name);
        return;
      }

      // Everything else: execute via the command registry (navigate, flows, etc.)
      void executeCommand(command.id).then((action) => {
        if (action?.type === 'navigate' && action.path) {
          navigate(action.path);
        }
      });
    },
    [commandProvider, executeCommand, handleHelpDocClick, navigate, sendMessage]
  );

  // Fallback factory for any-command escape hatch
  const fallbackCommand = useCallback((q: string): Command | undefined => {
    const trimmed = q.trim();
    if (!trimmed) return undefined;
    return {
      id: `any-cmd:${trimmed}`,
      category: 'claude',
      title: 'CLI Command',
      description: `Execute /${trimmed}`,
      icon: <TerminalIcon size={16} style={{ color: 'var(--text-ai)' }} />,
    };
  }, []);

  // Open an entity drawer tab when a chip/card is clicked in chat.
  // EntityDrawerRouter dispatches to the correct drawer by entity type
  // (e.g. local_file → Monaco editor, workstream → WorkstreamDrawer).
  const handleEntityClick = useCallback(
    (uri: string, entity: ParsedEntityURI) => {
      const label = getEntityDisplayLabel(entity);
      openTab({
        id: `entity:${uri}`,
        label,
        initialContent: entityDrawerContent(uri, entity.entityType),
        initialTitle: label,
        closable: true,
      });
    },
    [openTab],
  );

  // Open entity drawer when an entity is selected from the Cmd+P browse bar.
  // Uses the canonical URI provided by defineEntity.createURI via GraphQL.
  const handleEntityBrowse = useCallback(
    (entity: PaletteEntity) => {
      // local_file entities from recents may lack a URI (saved before the URI fix).
      // Reconstruct it from entity.id (the absolute file path).
      const uri = entity.uri ?? (
        entity.type === 'local_file'
          ? buildEntityURI('local_file', entity.id, entity.title)
          : undefined
      );
      if (!uri) return;
      const label = entity.title;
      openTab({
        id: `entity:${uri}`,
        label,
        initialContent: entityDrawerContent(uri, entity.type),
        initialTitle: label,
        closable: true,
      });
    },
    [openTab],
  );

  // Open entity drawer when an entity chip in the input area is clicked.
  // Same routing as chat bubble clicks — EntityDrawerRouter handles dispatch.
  const handleEntityChipClick = useCallback(
    (uri: string, entityType: string, _entityId: string) => {
      const parsed = parseEntityURI(uri);
      const label = parsed ? getEntityDisplayLabel(parsed) : entityType.replace(/_/g, ' ');
      openTab({
        id: `entity:${uri}`,
        label,
        initialContent: entityDrawerContent(uri, entityType),
        initialTitle: label,
        closable: true,
      });
    },
    [openTab],
  );

  // Open the file change review panel as a full-width drawer
  const handleFileChangeReview = useCallback(() => {
    openFull(fileChangeReviewContent());
  }, [openFull]);

  // Open a file in the editor drawer
  const handleOpenFileInEditor = useCallback(
    (filePath: string) => openTab(fileEditorTab(filePath)),
    [openTab],
  );

  // ── Global search (Cmd+Shift+F) ────────────────────────────────────────
  const handleGlobalSearch = useCallback(
    async (query: string, opts?: { includeIgnored?: boolean; caseSensitive?: boolean }) => {
      const dirs = dirsData?.directoriesWithBranchInfo?.map(
        (d: { effectivePath?: string | null; path: string }) => d.effectivePath ?? d.path,
      ) ?? [];
      searchLogger.debug('handleGlobalSearch called', {
        query,
        dirCount: dirs.length,
      });
      if (dirs.length === 0) {
        searchLogger.warn('No directories available for search');
        return { results: [], totalMatches: 0, truncated: false };
      }
      try {
        const result = await getApi(api).files.searchContent({
          query,
          directories: dirs as string[],
          ...(opts?.includeIgnored && { includeIgnored: true }),
          ...(opts?.caseSensitive && { caseSensitive: true }),
        });
        searchLogger.debug('searchContent IPC returned', {
          resultCount: result.results.length,
          totalMatches: result.totalMatches,
        });
        return result;
      } catch (err) {
        searchLogger.error('searchContent IPC failed', {
          query,
          error: err instanceof Error ? err.message : String(err),
        });
        throw err;
      }
    },
    [dirsData],
  );

  const handleGlobalSearchSelect = useCallback(
    (filePath: string, lineNumber: number) => {
      openTab(fileEditorTab(filePath, { line: lineNumber }));
    },
    [openTab],
  );

  // Open paste content in a drawer tab (editable — from input area chips)
  const handleInputPasteOpen = useCallback(
    (pasteId: string, content: string, preview: string, onSave: (newContent: string) => void) => {
      const label = preview.slice(0, 30) || 'Pasted text';
      openTab({
        id: `paste:${pasteId}`,
        label,
        initialContent: pasteContent(pasteId, content, preview, false, onSave),
        closable: true,
      });
    },
    [openTab],
  );

  // ── Verification bar ───────────────────────────────────────────────────────
  const activeWorkstream = useMemo(
    () => workstreamId ? workstreams.find((w) => w.id === workstreamId) : null,
    [workstreamId, workstreams],
  );
  const isNeedsReview = activeWorkstream?.status === 'needs_review';

  const [updateWorkstreamMut] = useMutation(UPDATE_WORKSTREAM);

  const verification = useMemo<VerificationCallbacks | null>(() => {
    if (!isNeedsReview || !workstreamId) return null;

    const customActions: ResolvedVerificationAction[] = verificationActionConfigs
      .filter((action) => {
        // Only include builtins that have a handler wired up
        if (action.type === 'builtin') return action.builtinId === 'workstream:archive';
        return true;
      })
      .map((action) => ({
        id: action.id,
        label: action.label,
        onExecute: () => {
          if (action.type === 'builtin' && action.builtinId === 'workstream:archive') {
            archiveWorkstream(workstreamId);
          } else if (action.type === 'prompt' && action.prompt) {
            void sendMessage(action.prompt);
          }
        },
      }));

    return {
      onBackToWorkstream: () => {
        updateWorkstreamMut({
          variables: { id: workstreamId, input: { status: 'active' } },
        });
      },
      onArchive: () => archiveWorkstream(workstreamId),
      customActions,
      onOpenCustomize: () => {
        openTab({
          id: 'verification-actions-config',
          label: 'Verification Actions',
          initialContent: verificationActionsConfigContent(),
          initialTitle: 'Verification Actions',
          closable: true,
        });
      },
    };
  }, [isNeedsReview, workstreamId, verificationActionConfigs, archiveWorkstream, sendMessage, updateWorkstreamMut, openTab]);

  // Open paste content in a drawer tab (read-only — from message history chips)
  const handleHistoryPasteOpen = useCallback(
    (paste: ParsedPasteMarkup) => {
      const label = paste.preview.slice(0, 30) || 'Pasted text';
      openTab({
        id: `paste:${paste.id}`,
        label,
        initialContent: pasteContent(paste.id, paste.content, paste.preview, true),
        closable: true,
      });
    },
    [openTab],
  );

  // ── Pending message queue for empty-state → workstream creation ─────
  // When a user sends a message from the empty state (no workstream), we create
  // a workstream first, then send the message once the chat is ready.
  const pendingMessageRef = useRef<{
    message: string;
    contentBlocks?: Array<{ type: string; source?: { type: string; media_type: string; data: string } }>;
    imageAttachmentMeta?: Array<{ name: string; mimeType: string; size: number; previewUrl: string }>;
  } | null>(null);

  // TODO: The empty-state send path bypasses handleSend, so bash mode ("! " prefix)
  // and skill body injection won't work on the very first message. This is acceptable
  // for v1 since first messages are unlikely to use those features.
  useEffect(() => {
    if (workstreamId && pendingMessageRef.current && sendMessage) {
      const { message, contentBlocks, imageAttachmentMeta } = pendingMessageRef.current;
      pendingMessageRef.current = null;
      sendMessage(message, contentBlocks, imageAttachmentMeta);
    }
  }, [workstreamId, sendMessage]);

  const handleEmptyStateSend = useCallback(
    async (value: InputValue, attachments: Attachment[]) => {
      const plainText = transformInputValueToPlainText(value);
      if (!plainText.trim()) return;

      // Derive title from first few words
      const words = plainText.trim().split(/\s+/);
      const title = words.slice(0, 6).join(' ').slice(0, 50) || 'New Workstream';

      // Build content blocks for image attachments so they aren't lost
      const contentBlocks = buildContentBlocks(plainText, attachments);
      const imageAttachmentMeta = contentBlocks
        ? attachments
            .filter((a) => a.mimeType.startsWith('image/') && a.previewUrl)
            .map((a) => ({ name: a.name, mimeType: a.mimeType, size: a.size, previewUrl: a.previewUrl! }))
        : undefined;

      // Queue the message to be sent after workstream creation
      pendingMessageRef.current = {
        message: plainText,
        contentBlocks: contentBlocks ?? undefined,
        imageAttachmentMeta,
      };

      await createWorkstream(title);
    },
    [createWorkstream],
  );

  if (!workstreamId) {
    return (
      <div data-slot="chat" className="flex h-full flex-col bg-surface-elevated text-foreground">
        <div className="flex flex-1 flex-col overflow-y-auto">
          <ChatEmptyState />
        </div>
        <div className="pt-2 pb-4 mx-auto w-full max-w-[720px] px-4">
          <ChatInputUnified
            onSubmit={handleEmptyStateSend}
            entityProvider={entityProvider}
            entityTabs={entityTabs}
            commandProvider={commandProvider}
            commandTabs={COMMAND_TABS}
            flowRegistry={flowRegistry}
            onCommandExecute={handleCommandExecute}
          />
          {/* Match the footer spacing of the normal chat input (h-6 + mt-2) */}
          <div className="mt-2 h-6" />
        </div>
        {activeActionForm && (
          <div className="pt-2 pb-4 mx-auto w-full max-w-[720px] px-4">
            <ActionFormBar
              definition={activeActionForm}
              onSubmit={(answers) => onActionFormSubmit?.(activeActionForm.id, answers)}
              onDismiss={onActionFormDismiss ?? (() => {})}
              disabledStepIds={actionFormDisabledSteps}
              onPreferencesChange={onActionFormPreferencesChange}
              onHelpClick={handleHelpDocClick}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <>
    <EntityClickProvider onEntityClick={handleEntityClick}>
      <EntityWidgetProvider renderer={resolvedEntityWidgetRenderer}>
        <TagStatusProvider lookup={tagStatusLookup} onNavigateToWorkstream={setActiveWorkstream}>
        <PasteEditorProvider onPasteOpen={handleHistoryPasteOpen}>
          <OpenFileProvider value={handleOpenFileInEditor}>
            <ChatProvider key={workstreamId} store={store}>
              <ChatWithInterrupt
                onSend={handleSend}
                onApprove={approvePermission}
                onDeny={denyPermission}
                onOpenPlanReview={handleOpenPlanReview}
                toolRenderer={toolRenderer}
                onLoadMore={loadMore}
                onFork={handleFork}
                disabled={isReplaying}
                isLoading={isReplaying}
                chatId={workstreamId ?? undefined}
                draftKey={`workstream-draft-${workstreamId}`}
                emptyState={<ChatEmptyState />}
                leadingAccessory={leadingAccessories}
                footer={footer}
                todoPanel={todoPanel}
                onRewind={rewindConversation}
                onInterrupt={interrupt}
                entityProvider={entityProvider}
                entityTabs={entityTabs}
                commandProvider={commandProvider}
                commandTabs={COMMAND_TABS}
                flowRegistry={flowRegistry}
                fallbackCommand={fallbackCommand}
                onCommandExecute={handleCommandExecute}
                onEntityBrowse={handleEntityBrowse}
                onEntityChipClick={handleEntityChipClick}
                onFileChangeReview={handleFileChangeReview}
                onGlobalSearch={handleGlobalSearch}
                onGlobalSearchSelect={handleGlobalSearchSelect}
                onPasteOpen={handleInputPasteOpen}
                skills={skillMenuItems}
                pendingSkills={pendingSkills}
                onSkillSelect={handleSkillSelect}
                onBrowseSkills={handleBrowseSkills}
                onSkillRemove={handleSkillRemove}
                onClearPendingSkills={handleClearPendingSkills}
                verification={verification}
                activeActionForm={activeActionForm}
                onActionFormSubmit={onActionFormSubmit}
                onActionFormDismiss={onActionFormDismiss}
                actionFormDisabledSteps={actionFormDisabledSteps}
                onActionFormPreferencesChange={onActionFormPreferencesChange}
                onActionFormHelpClick={handleHelpDocClick}
                voiceRecording={voice.isRecording}
                voiceTranscribing={voice.isTranscribing}
                voiceDownloading={voice.isDownloading}
                onVoiceStart={voice.startRecording}
                onVoiceStop={voice.stopRecording}
                voiceShortcutHint={voiceShortcutHint}
                initialMessageHistory={messageHistory}
                onMessageHistoryNearEnd={handleMessageHistoryNearEnd}
                autoFocus
              />
            </ChatProvider>
          </OpenFileProvider>
        </PasteEditorProvider>
        </TagStatusProvider>
      </EntityWidgetProvider>
    </EntityClickProvider>
    {voice.needsModelDownload && (
      <WhisperModelDialog
        open={voice.showDownloadDialog}
        onOpenChange={voice.setShowDownloadDialog}
        downloading={voice.isDownloading}
        downloadProgress={voice.downloadProgress}
        downloadError={voice.downloadError}
        onDownload={voice.startDownload}
        downloadSize={voice.needsModelDownload.downloadSize}
        missingModels={voice.needsModelDownload.missing}
      />
    )}
    </>
  );
});

/** Thin wrapper that wires double-escape interrupt into Chat. Must be inside ChatProvider. */
function ChatWithInterrupt({
  onInterrupt,
  isLoading,
  ...chatProps
}: React.ComponentProps<typeof Chat> & { onInterrupt: () => void }) {
  const isAgentBusy = useChatAgentBusy();
  const { showHint } = useDoubleEscapeInterrupt({
    enabled: isAgentBusy,
    onInterrupt,
  });

  const { scrollTarget, consumeScrollTarget } = useWorkstreamActions();
  // Hold the target across renders until replay finishes
  const pendingScrollRef = useRef<string | null>(null);

  // Capture scroll target as soon as it's set
  useEffect(() => {
    if (!scrollTarget) return;
    const targetId = consumeScrollTarget();
    if (targetId) {
      pendingScrollRef.current = targetId;
    }
  }, [scrollTarget, consumeScrollTarget]);

  // Scroll once replay is done (isLoading flips to false)
  useEffect(() => {
    const targetId = pendingScrollRef.current;
    if (!targetId || isLoading) return;
    pendingScrollRef.current = null;

    const scrollAndHighlight = (el: Element) => {
      // Disable the message list's auto-scroll-to-bottom by simulating a
      // wheel-up event. The MessageList sets isAutoScrollEnabled = false
      // when it detects deltaY < 0, preventing its ResizeObserver from
      // fighting our scroll position.
      const messageList = document.querySelector('[data-slot="message-list"]');
      if (messageList) {
        messageList.dispatchEvent(new WheelEvent('wheel', { deltaY: -1, bubbles: true }));
      }
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-primary/50', 'rounded-lg');
      setTimeout(() => el.classList.remove('ring-2', 'ring-primary/50', 'rounded-lg'), 2000);
    };

    // Small delay to let the final auto-scroll-to-bottom settle after replay ends
    const timer = setTimeout(() => {
      const el = document.querySelector(`[data-message-id="${CSS.escape(targetId)}"]`);
      if (el) scrollAndHighlight(el);
    }, 150);

    return () => clearTimeout(timer);
  }, [isLoading]);

  return (
    <>
      <Chat {...chatProps} isLoading={isLoading} />
      <InterruptHint visible={showHint} />
    </>
  );
}
