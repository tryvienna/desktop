/**
 * ChatInput — Production orchestration wrapper for the chat input area
 *
 * @ai-context
 * - Wraps ChatInputUnified and the 3 action bars (Permission, Question, Verification)
 * - AnimatePresence morphs between bars and text input seamlessly
 * - Standalone palette overlay for shortcuts during permission/question states
 * - Supports entity (@), command (/) palettes via optional providers
 * - Draft persistence via localStorage with draftKey prop
 * - NanoContext and skill attachments rendered above input
 * - data-slot="chat-input"
 *
 * @example
 * <ChatInput onSend={handleSend} isStreaming={false} pendingApproval={approval} />
 */

import React, { memo, useCallback, useRef, useState, useEffect } from 'react';

import { createRendererLogger } from '@vienna/logger/renderer';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@tryvienna/ui';
import { ChatInputUnified } from './chat-input-unified';
import type { ChatInputUnifiedHandle } from './chat-input-unified';
import { PermissionActionBar } from './permission-action-bar';
import { FileChangeActionBar } from './file-change-action-bar';
import { VerificationActionBar } from './verification-action-bar';
import type { ResolvedVerificationAction } from './verification-action-bar';
import { QuestionActionBar } from './question-action-bar';
import type { AskUserQuestionItem } from './question-action-bar';
import { EntityPalette } from '../palette/entity-palette';
import { CommandPaletteWithFlows } from '../palette/command-palette-with-flows';
import { EntityBrowseBar } from './entity-browse-bar';
import { CommandBrowseBar } from './command-browse-bar';
import { GlobalSearchBrowseBar } from './global-search-browse-bar';
import type { ContentSearchResult, ContentSearchOpts } from './global-search-browse-bar';
import type { PaletteHandle } from '../palette/types';
import type {
  Entity as PaletteEntity,
  Command,
  EntityPaletteDataProvider,
  CommandPaletteDataProvider,
  PaletteTab,
  FlowDefinition,
} from '../palette/types';
import type { PendingApproval } from '../../hooks/use-all-pending-approvals';
import { useDraftPersistence } from '../../hooks/use-draft-persistence';
import { NanoContextPreviewList, useNanoContextOptional } from '../../nano-context';
import { SkillPreviewList } from './components/skill-preview-list';
import type { SkillPreviewItem } from './components/skill-preview-list';
import type { SkillMenuItem } from './components/attachment-menu';
import { transformInputValueToPlainText } from './utils/transform-input-value';
import { buildContentBlocks } from './utils/build-content-blocks';
import type { ContentBlock } from './utils/build-content-blocks';
import { decodePasteMarkupToPlainText, stripPasteMarkup } from '../../utils/paste-markup';
import { SPRINGS } from '../../tokens';
import type { InputValue, Attachment } from '../../types/input';
import { ActionFormBar } from '../../action-form/action-form-bar';
import type { ActionFormDefinition } from '../../action-form/define-action-form';

const logger = createRendererLogger();

// ─────────────────────────────────────────────────────────────────────────────
// Local Types
// ─────────────────────────────────────────────────────────────────────────────

export interface VerificationCallbacks {
  onBackToWorkstream: () => void;
  onArchive?: () => void;
  customActions?: ResolvedVerificationAction[];
  onOpenCustomize?: () => void;
}

export interface PendingQuestion {
  toolId: string;
  questions: AskUserQuestionItem[];
}

export interface ImageAttachmentMeta {
  name: string;
  mimeType: string;
  size: number;
  previewUrl: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

export interface ChatInputProps {
  // ─── Message submission ───────────────────────────────────────────────────

  /** Called when the user submits a message. The message string preserves paste markup for chip rendering in the user message bubble. The backend decodes markup before sending to AI. */
  onSend: (
    message: string,
    contentBlocks?: ContentBlock[],
    imageAttachmentMeta?: ImageAttachmentMeta[],
  ) => Promise<void>;
  /** Whether the assistant is currently streaming a response */
  isStreaming?: boolean;
  /** Whether the input is disabled */
  disabled?: boolean;

  // ─── Permission bar ───────────────────────────────────────────────────────

  /** Current pending tool approval (if any) */
  pendingApproval?: PendingApproval | null;
  /** Position of the current approval in the queue */
  approvalPosition?: { current: number; total: number };
  /** Called when user approves a pending tool request */
  onApprove?: (requestId: string, policy: 'once' | 'session' | 'permanent', updatedInput?: Record<string, unknown>) => void;
  /** Called when user denies a pending tool request */
  onDeny?: (requestId: string, message?: string) => void;
  /** Called when user wants to open the plan review drawer */
  onOpenPlanReview?: (toolUseId: string, requestId: string) => void;

  // ─── File change bar ─────────────────────────────────────────────────────

  /** Pending file change state — when present, renders FileChangeActionBar */
  fileChangeState?: {
    pendingCount: number;
    currentFilePath?: string;
    currentRequestId?: string;
  } | null;
  /** Approve all pending file changes at once */
  onFileChangeApproveAll?: () => void;
  /** Approve all pending + auto-approve future Edit/Write for session */
  onFileChangeApproveAllForSession?: () => void;
  /** Called when Review button is clicked in the file change bar */
  onFileChangeReview?: () => void;

  // ─── Question bar ─────────────────────────────────────────────────────────

  /** Current pending question from the assistant (if any) */
  pendingQuestion?: PendingQuestion | null;
  /** Called when user answers a pending question. Chat component wires this to onApprove with updatedInput. */
  onAnswerQuestion?: (answers: Record<string, string>) => void;

  // ─── Action Form bar ─────────────────────────────────────────────────────

  /** Active action form definition — when present, renders the ActionFormBar */
  activeActionForm?: ActionFormDefinition | null;
  /** Called when the action form is submitted */
  onActionFormSubmit?: (formId: string, answers: Record<string, string>) => void;
  /** Called when the action form is dismissed */
  onActionFormDismiss?: () => void;
  /** Step IDs disabled by user preferences (per form) */
  actionFormDisabledSteps?: string[];
  /** Called when user modifies action form step preferences */
  onActionFormPreferencesChange?: (disabledStepIds: string[]) => void;
  /** Called when user clicks the [?] help icon on an action form step */
  onActionFormHelpClick?: (docId: string) => void;

  // ─── Verification bar ─────────────────────────────────────────────────────

  /** Verification callbacks — when present, renders the VerificationActionBar */
  verification?: VerificationCallbacks | null;

  // ─── Palette Integration (Optional) ───────────────────────────────────────

  /** Entity palette data provider (enables @ trigger) */
  entityProvider?: EntityPaletteDataProvider;
  /** Command palette data provider (enables / trigger) */
  commandProvider?: CommandPaletteDataProvider;
  /** Entity palette tabs */
  entityTabs?: PaletteTab[];
  /** Command palette tabs */
  commandTabs?: PaletteTab[];
  /** Called when entity is selected from palette */
  onEntitySelect?: (entity: PaletteEntity) => void;
  /** Called when command is executed from palette */
  onCommandExecute?: (command: Command) => void;
  /** Called when entity is selected in browse mode (CMD+P) — opens drawer instead of inserting chip */
  onEntityBrowse?: (entity: PaletteEntity) => void;
  /** Called when an entity chip in the input is clicked */
  onEntityChipClick?: (uri: string, entityType: string, entityId: string) => void;
  /** Icon hints from entity registry, mapping type to Lucide icon name */
  iconHints?: Record<string, string>;
  /** Flow registry for multi-step commands */
  flowRegistry?: Record<string, FlowDefinition>;
  /** Factory for a fallback command shown when the user is searching */
  fallbackCommand?: (query: string) => Command | undefined;

  // ─── Skills Integration (Optional) ────────────────────────────────────────

  /** Skills to display in the attachment menu */
  skills?: SkillMenuItem[];
  /** Callback when skill is selected from + menu */
  onSkillSelect?: (skillId: string) => void;
  /** Callback when user clicks "Browse skills..." in menu */
  onBrowseSkills?: () => void;
  /** Skills attached via the + menu (displayed as cards above input) */
  pendingSkills?: SkillPreviewItem[];
  /** Callback when a pending skill is removed */
  onSkillRemove?: (skillId: string) => void;
  /** Callback when a pending skill's edit button is clicked */
  onSkillEdit?: (skillId: string) => void;
  /** Callback to clear all pending skills */
  onClearPendingSkills?: () => void;

  // ─── Builder Mode ─────────────────────────────────────────────────────────

  /** Whether builder mode is enabled */
  builderMode?: boolean;
  /** Callback when builder mode is toggled */
  onBuilderModeChange?: (enabled: boolean) => void;

  // ─── Voice Input (Optional) ───────────────────────────────────────────────

  /** Whether voice input is currently recording */
  voiceRecording?: boolean;
  /** Whether voice input is currently transcribing */
  voiceTranscribing?: boolean;
  /** Whether voice models are downloading in the background */
  voiceDownloading?: boolean;
  /** Called when user presses the mic button */
  onVoiceStart?: () => void;
  /** Called when user releases the mic button */
  onVoiceStop?: () => void;
  /** Shortcut hint ReactNode rendered in mic button tooltip */
  voiceShortcutHint?: React.ReactNode;

  // ─── Draft Persistence ────────────────────────────────────────────────────

  /** localStorage key for per-workstream draft persistence */
  draftKey?: string;

  // ─── Paste Editor ─────────────────────────────────────────────────────────

  /** Optional callback to open paste content externally (e.g., in a drawer) */
  onPasteOpen?: (
    pasteId: string,
    content: string,
    preview: string,
    onSave: (newContent: string) => void
  ) => void;

  // ─── Global Search (Cmd+Shift+F) ────────────────────────────────────────

  /** Callback to search file contents across directories */
  onGlobalSearch?: (query: string, opts?: ContentSearchOpts) => Promise<ContentSearchResult>;
  /** Called when a search result is selected (file + line) */
  onGlobalSearchSelect?: (filePath: string, lineNumber: number) => void;

  // ─── Message History ──────────────────────────────────────────────────────

  /**
   * Pre-loaded message history from an external source (e.g. database),
   * newest first. Seeds the up-arrow history on mount and resets it when
   * the workstream changes.
   */
  initialMessageHistory?: string[];
  /**
   * Called when the user navigates close to the oldest loaded message
   * in the up-arrow history. Use this to preemptively fetch more messages.
   */
  onMessageHistoryNearEnd?: () => void;

  // ─── Accessory Slots ─────────────────────────────────────────────────────

  /** Optional content rendered in the bottom controls row (e.g., branch picker) */
  leadingAccessory?: React.ReactNode;
  /** Optional content rendered below the input container (e.g., branch status bar) */
  footer?: React.ReactNode;
  /** Optional panel rendered above the input (e.g., todo progress panel) */
  todoPanel?: React.ReactNode;

  // ─── Config ───────────────────────────────────────────────────────────────

  /** Placeholder text */
  placeholder?: string;
  /** Auto-focus on mount */
  autoFocus?: boolean;
  /** Optional className */
  className?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export const ChatInput = memo(function ChatInput({
  onSend,
  isStreaming: _isStreaming = false,
  disabled = false,
  pendingApproval,
  approvalPosition,
  onApprove,
  onDeny,
  onOpenPlanReview,
  fileChangeState,
  onFileChangeApproveAll,
  onFileChangeApproveAllForSession,
  onFileChangeReview,
  pendingQuestion,
  onAnswerQuestion,
  activeActionForm,
  onActionFormSubmit,
  onActionFormDismiss,
  actionFormDisabledSteps,
  onActionFormPreferencesChange,
  onActionFormHelpClick,
  verification,
  entityProvider,
  commandProvider,
  entityTabs,
  commandTabs,
  onEntitySelect,
  onCommandExecute,
  onEntityBrowse,
  onEntityChipClick,
  iconHints,
  flowRegistry,
  fallbackCommand,
  skills,
  onSkillSelect,
  onBrowseSkills,
  pendingSkills,
  onSkillRemove,
  onSkillEdit,
  onClearPendingSkills,
  builderMode,
  onBuilderModeChange,
  voiceRecording,
  voiceTranscribing,
  voiceDownloading,
  onVoiceStart,
  onVoiceStop,
  voiceShortcutHint,
  draftKey,
  onPasteOpen,
  onGlobalSearch,
  onGlobalSearchSelect,
  initialMessageHistory,
  onMessageHistoryNearEnd,
  leadingAccessory,
  footer,
  todoPanel,
  placeholder,
  autoFocus = false,
  className,
}: ChatInputProps) {
  const inputRef = useRef<ChatInputUnifiedHandle>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [placeholderHint, setPlaceholderHint] = useState<string | null>(null);

  const isMac = ((navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ?? navigator.platform ?? '').toLowerCase().includes('mac');
  const focusShortcutHint = isMac ? 'Press ⌘J to focus' : 'Press Ctrl+J to focus';

  // ─── NanoContext ─────────────────────────────────────────────────────────
  const nanoContext = useNanoContextOptional();

  // Register focus callback so selection capture can focus the input without DOM coupling
  useEffect(() => {
    if (!nanoContext) return;
    nanoContext.registerFocusInput(() => {
      inputRef.current?.focus();
    });
  }, [nanoContext]);

  // ─── Standalone Palette (shown during permission/question state) ──────────
  // When the normal textbox is replaced by a permission/question bar, shortcuts
  // that would normally open palettes (CMD+P, CMD+G, CMD+Shift+P) need a way
  // to still work. We render the palette as a standalone overlay above the bar.
  const [standalonePalette, setStandalonePalette] = useState<'entity' | 'command' | null>(null);
  const [standaloneCommandId, setStandaloneCommandId] = useState<string | undefined>(undefined);
  const standaloneCommandPaletteKeyRef = useRef(0);
  const standaloneEntityPaletteRef = useRef<PaletteHandle>(null);
  const standaloneCommandPaletteRef = useRef<PaletteHandle>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ─── Browse Modes (Cmd+P entity, Cmd+Shift+P command, Cmd+Shift+F search) ──
  const [isEntityBrowsing, setIsEntityBrowsing] = useState(false);
  const [isCommandBrowsing, setIsCommandBrowsing] = useState(false);
  const [isGlobalSearching, setIsGlobalSearching] = useState(false);

  // Determine if we're in a special state (not the normal text input)
  const hasPendingApproval = !!pendingApproval;
  const hasPendingQuestion = !!pendingQuestion;
  const hasActionForm = !!activeActionForm;
  const hasFileChanges = !!fileChangeState && fileChangeState.pendingCount > 0;
  const isInSpecialState = !!verification || hasPendingQuestion || hasPendingApproval || hasFileChanges || hasActionForm;

  // Close standalone palette when the special state is dismissed
  useEffect(() => {
    if (!isInSpecialState) {
      setStandalonePalette(null);
      setStandaloneCommandId(undefined);
    }
  }, [isInSpecialState]);

  // Container-level event listeners -- handle vienna:entity-browse, vienna:workstream-browse,
  // vienna:command-palette events dispatched by layout shortcut callbacks.
  // In normal state: delegate to ChatInputUnified handle methods.
  // In special state: open standalone palette overlay.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleEntityBrowse = () => {
      if (!entityProvider) return;
      // Save draft if we have a live input (not during action bar states)
      if (inputRef.current && !isInSpecialState) {
        draftRef.current = {
          plainText: inputRef.current.getValue()?.plainText ?? '',
          entities: [],
          attachments: [],
          html: '',
        };
      }
      // Always morph into EntityBrowseBar — works from any state
      setIsEntityBrowsing(true);
    };

    const handleWorkstreamBrowse = () => {
      if (!commandProvider) return;
      if (inputRef.current && !isInSpecialState) {
        inputRef.current.openWorkstreamBrowse();
      } else {
        standaloneCommandPaletteKeyRef.current += 1;
        setStandaloneCommandId('workstream:browse');
        setStandalonePalette('command');
      }
    };

    const handleCommandPalette = () => {
      if (!commandProvider) return;
      // Save draft if we have a live input (not during action bar states)
      if (inputRef.current && !isInSpecialState) {
        draftRef.current = {
          plainText: inputRef.current.getValue()?.plainText ?? '',
          entities: [],
          attachments: [],
          html: '',
        };
      }
      // Always morph into CommandBrowseBar — works from any state
      setIsCommandBrowsing(true);
    };

    const handleGlobalSearch = () => {
      if (!onGlobalSearch) return;
      if (inputRef.current && !isInSpecialState) {
        draftRef.current = {
          plainText: inputRef.current.getValue()?.plainText ?? '',
          entities: [],
          attachments: [],
          html: '',
        };
      }
      setIsGlobalSearching(true);
    };

    container.addEventListener('vienna:entity-browse', handleEntityBrowse);
    container.addEventListener('vienna:workstream-browse', handleWorkstreamBrowse);
    container.addEventListener('vienna:command-palette', handleCommandPalette);
    container.addEventListener('vienna:global-search', handleGlobalSearch);
    return () => {
      container.removeEventListener('vienna:entity-browse', handleEntityBrowse);
      container.removeEventListener('vienna:workstream-browse', handleWorkstreamBrowse);
      container.removeEventListener('vienna:command-palette', handleCommandPalette);
      container.removeEventListener('vienna:global-search', handleGlobalSearch);
    };
  }, [entityProvider, commandProvider, onGlobalSearch, isInSpecialState]);

  const handleEntityBrowseClose = useCallback(() => {
    setIsEntityBrowsing(false);
    // Draft is restored via initialValue on the ChatInputUnified remount
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, []);

  const handleEntityBrowseSelect = useCallback(
    (entity: PaletteEntity) => {
      setIsEntityBrowsing(false);
      onEntityBrowse?.(entity);
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    },
    [onEntityBrowse]
  );

  const handleCommandBrowseClose = useCallback(() => {
    setIsCommandBrowsing(false);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, []);

  const handleGlobalSearchClose = useCallback(() => {
    setIsGlobalSearching(false);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, []);

  const handleGlobalSearchSelect = useCallback(
    (filePath: string, lineNumber: number) => {
      setIsGlobalSearching(false);
      onGlobalSearchSelect?.(filePath, lineNumber);
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    },
    [onGlobalSearchSelect],
  );

  const handleCommandBrowseExecute = useCallback(
    (command: Command) => {
      setIsCommandBrowsing(false);
      onCommandExecute?.(command);
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    },
    [onCommandExecute]
  );

  const handleStandalonePaletteClose = useCallback(() => {
    setStandalonePalette(null);
    setStandaloneCommandId(undefined);
  }, []);

  const handleStandaloneEntitySelect = useCallback(
    (entity: PaletteEntity) => {
      setStandalonePalette(null);
      setStandaloneCommandId(undefined);
      onEntityBrowse?.(entity);
    },
    [onEntityBrowse]
  );

  const handleStandaloneCommandExecute = useCallback(
    (command: Command) => {
      setStandalonePalette(null);
      setStandaloneCommandId(undefined);
      onCommandExecute?.(command);
    },
    [onCommandExecute]
  );

  // Forward keyboard events to the standalone palette when it's open.
  useEffect(() => {
    if (!standalonePalette) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore modifier-only shortcuts so global keybindings still work
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      let handled = false;
      if (standalonePalette === 'entity' && standaloneEntityPaletteRef.current) {
        handled = standaloneEntityPaletteRef.current.handleKeyDown(
          e as unknown as React.KeyboardEvent
        );
      } else if (standalonePalette === 'command' && standaloneCommandPaletteRef.current) {
        handled = standaloneCommandPaletteRef.current.handleKeyDown(
          e as unknown as React.KeyboardEvent
        );
      }
      if (handled) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [standalonePalette]);

  // ─── Draft persistence ──────────────────────────────────────────────────────
  // Preserve draft text across permission/question bar transitions.
  const draftRef = useRef<InputValue | null>(null);
  const [draftPlainText, setDraftPlainText] = useState('');

  // Read persisted draft synchronously on mount so we can pass it as initialValue
  // to ChatInputUnified without a flash of empty -> populated.
  const persistedDraftRef = useRef<InputValue | null>(
    draftKey
      ? (() => {
          try {
            const saved = localStorage.getItem(draftKey);
            if (saved && saved.trim()) {
              return { plainText: saved, entities: [], attachments: [], html: saved };
            }
          } catch {
            // ignore
          }
          return null;
        })()
      : null
  );

  const { clearDraft } = useDraftPersistence({
    draftKey: draftKey ?? '__unused__',
    value: draftPlainText,
    enabled: !!draftKey,
  });

  // ─── Swap draft when draftKey changes (workstream switch) ────────────────
  const prevDraftKeyRef = useRef(draftKey);
  useEffect(() => {
    if (prevDraftKeyRef.current === draftKey) return;
    const oldKey = prevDraftKeyRef.current;
    prevDraftKeyRef.current = draftKey;

    // Flush current in-memory draft to the OLD key's localStorage
    if (oldKey && draftRef.current) {
      const text = stripPasteMarkup(draftRef.current.plainText);
      try {
        if (text.trim()) localStorage.setItem(oldKey, text);
        else localStorage.removeItem(oldKey);
      } catch { /* noop */ }
    }

    // Load the NEW key's draft from localStorage and push into the input
    let newDraft = '';
    if (draftKey) {
      try {
        newDraft = localStorage.getItem(draftKey) ?? '';
      } catch { /* noop */ }
    }

    if (newDraft.trim()) {
      const iv: InputValue = { plainText: newDraft, entities: [], attachments: [], html: newDraft };
      draftRef.current = iv;
      setDraftPlainText(newDraft);
      inputRef.current?.setValue(iv);
    } else {
      draftRef.current = null;
      setDraftPlainText('');
      inputRef.current?.setValue('');
    }
  }, [draftKey]);

  // ─── Focus Management ─────────────────────────────────────────────────────

  // Listen for draft injection events (e.g. from empty state suggestion pills)
  useEffect(() => {
    const handleSetDraft = (e: Event) => {
      const text = (e as CustomEvent<string>).detail;
      if (text && inputRef.current) {
        inputRef.current.setValue(text);
        inputRef.current.focus();
      }
    };
    window.addEventListener('vienna:set-draft', handleSetDraft);
    return () => window.removeEventListener('vienna:set-draft', handleSetDraft);
  }, []);

  // Listen for text insertion events (e.g. from voice transcription)
  useEffect(() => {
    const handleInsertText = (e: Event) => {
      const text = (e as CustomEvent<string>).detail;
      if (text && inputRef.current) {
        inputRef.current.insertText(text);
        inputRef.current.focus();
      }
    };
    window.addEventListener('drift:insert-text', handleInsertText);
    return () => window.removeEventListener('drift:insert-text', handleInsertText);
  }, []);

  // Listen for placeholder hint events (e.g. hovering quick action options)
  useEffect(() => {
    const handleHint = (e: Event) => {
      setPlaceholderHint((e as CustomEvent<string | null>).detail);
    };
    window.addEventListener('vienna:set-placeholder-hint', handleHint);
    return () => window.removeEventListener('vienna:set-placeholder-hint', handleHint);
  }, []);

  // Don't include isSubmitting or isStreaming -- user should be able to type
  // and send their next message while the previous one is streaming/sending.
  const isDisabled = disabled ?? false;

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleInputChange = useCallback((value: InputValue) => {
    draftRef.current = value;
    // Strip paste markup before saving to localStorage (paste blobs are ephemeral)
    setDraftPlainText(stripPasteMarkup(value.plainText));
  }, []);

  const handleSubmit = useCallback(
    async (value: InputValue, attachments: Attachment[]) => {
      // value.plainText may contain [paste://id?...] markup from ChatInputUnified.
      // Preserve markup in the message so the chat store can render paste chips.
      // The backend (useWorkstreamChat) decodes markup before sending to the AI.
      const plainTextMessage = transformInputValueToPlainText({
        ...value,
        attachments,
      });

      // Allow submission with contexts even if text is empty
      const hasContexts = nanoContext && nanoContext.pendingContexts.length > 0;
      if (!plainTextMessage.trim() && !hasContexts) {
        return;
      }

      // Prepend NanoContext XML if contexts are pending
      const finalMessage = hasContexts
        ? nanoContext.buildMessageWithContexts(plainTextMessage)
        : plainTextMessage;

      // Build structured content blocks for image attachments.
      // Decode paste markup for content blocks (AI needs plain text, not markup).
      const textOnlyDecoded = transformInputValueToPlainText({
        ...value,
        plainText: decodePasteMarkupToPlainText(value.plainText),
        attachments: [],
      });
      const textForBlocksDecoded = hasContexts
        ? nanoContext.buildMessageWithContexts(textOnlyDecoded)
        : textOnlyDecoded;
      const contentBlocks = buildContentBlocks(textForBlocksDecoded, attachments);

      if (contentBlocks) {
        logger.debug('Submitting message with image content blocks', {
          attachmentCount: attachments.length,
          contentBlockCount: contentBlocks.length,
          contentBlockTypes: contentBlocks.map((b) => b.type),
        });
      }

      // Extract image attachment metadata for the store (visual display in message area)
      const imageAttachmentMeta = contentBlocks
        ? attachments
            .filter((a) => a.mimeType.startsWith('image/') && a.previewUrl)
            .map((a) => ({
              name: a.name,
              mimeType: a.mimeType,
              size: a.size,
              previewUrl: a.previewUrl!,
            }))
        : undefined;

      setIsSubmitting(true);
      draftRef.current = null;
      setDraftPlainText('');
      clearDraft();
      try {
        await onSend(finalMessage, contentBlocks ?? undefined, imageAttachmentMeta);
        // Consume contexts after successful send
        if (hasContexts) {
          nanoContext.consumeContexts();
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [onSend, nanoContext, clearDraft]
  );

  const handleSkillSelect = useCallback(
    (skillId: string) => {
      logger.debug('Skill selected from + menu', { skillId });
      onSkillSelect?.(skillId);
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    },
    [onSkillSelect]
  );

  const handlePermissionApprove = useCallback(
    (requestId: string, policy: 'once' | 'session' | 'permanent') => {
      onApprove?.(requestId, policy);
    },
    [onApprove]
  );

  const handlePermissionDeny = useCallback(
    (requestId: string) => {
      onDeny?.(requestId);
    },
    [onDeny]
  );

  // ─── File change bar handlers ────────────────────────────────────────────
  const handleFileChangeApprove = useCallback(() => {
    if (fileChangeState?.currentRequestId) {
      onApprove?.(fileChangeState.currentRequestId, 'once');
    }
  }, [fileChangeState?.currentRequestId, onApprove]);


  const handleFileChangeDeny = useCallback(() => {
    if (fileChangeState?.currentRequestId) {
      onDeny?.(fileChangeState.currentRequestId);
    }
  }, [fileChangeState?.currentRequestId, onDeny]);


  const handleQuestionSubmit = useCallback(
    (answers: Record<string, string>) => {
      if (pendingQuestion && onAnswerQuestion) {
        onAnswerQuestion(answers);
      }
    },
    [pendingQuestion, onAnswerQuestion]
  );

  const handleActionFormSubmit = useCallback(
    (answers: Record<string, string>) => {
      if (activeActionForm && onActionFormSubmit) {
        onActionFormSubmit(activeActionForm.id, answers);
      }
    },
    [activeActionForm, onActionFormSubmit]
  );

  const handleActionFormDismiss = useCallback(() => {
    onActionFormDismiss?.();
  }, [onActionFormDismiss]);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      ref={containerRef}
      data-slot="chat-input"
      data-chat-input
      className={cn('pt-2 pb-4 mx-auto w-full max-w-[720px] px-4', className)}
    >
      {/* NanoContext preview cards above input */}
      {nanoContext && nanoContext.pendingContexts.length > 0 && (
        <NanoContextPreviewList
          contexts={nanoContext.pendingContexts}
          onRemove={nanoContext.removeContext}
          onUpdateContent={nanoContext.updateContextContent}
          onClearAll={nanoContext.clearContexts}
        />
      )}

      {/* Pending skill cards above input */}
      {pendingSkills &&
        pendingSkills.length > 0 &&
        onSkillRemove &&
        onClearPendingSkills && (
          <SkillPreviewList
            skills={pendingSkills}
            onRemove={onSkillRemove}
            onEdit={onSkillEdit}
            onClearAll={onClearPendingSkills}
          />
        )}

      {/* Todo panel above input */}
      {todoPanel}

      {/* Standalone palette overlay -- floats above input, shown when shortcuts fire during permission/question state */}
      <div className="relative">
        <AnimatePresence>
          {standalonePalette === 'entity' && entityProvider && (
            <motion.div
              key="standalone-entity-palette"
              className="absolute bottom-full left-0 right-0 mb-2 z-[1000]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
            >
              <EntityPalette
                ref={standaloneEntityPaletteRef}
                isOpen={true}
                onClose={handleStandalonePaletteClose}
                onSelect={handleStandaloneEntitySelect}
                dataProvider={entityProvider}
                query=""
                tabs={entityTabs}
                iconHints={iconHints}
              />
            </motion.div>
          )}
          {standalonePalette === 'command' && commandProvider && (
            <motion.div
              key={`standalone-command-palette-${standaloneCommandPaletteKeyRef.current}`}
              className="absolute bottom-full left-0 right-0 mb-2 z-[1000]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
            >
              <CommandPaletteWithFlows
                ref={standaloneCommandPaletteRef}
                isOpen={true}
                onClose={handleStandalonePaletteClose}
                onExecute={handleStandaloneCommandExecute}
                dataProvider={commandProvider}
                query=""
                tabs={commandTabs}
                flowRegistry={flowRegistry}
                initialCommandId={standaloneCommandId}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main input area: morphs between action bars and text input */}
      <AnimatePresence mode="wait">
        {isEntityBrowsing && entityProvider ? (
          <motion.div
            key="entity-browse-bar"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
          >
            <EntityBrowseBar
              dataProvider={entityProvider}
              tabs={entityTabs ?? []}
              onSelect={handleEntityBrowseSelect}
              onClose={handleEntityBrowseClose}
              iconHints={iconHints}
            />
          </motion.div>
        ) : isCommandBrowsing && commandProvider ? (
          <motion.div
            key="command-browse-bar"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
          >
            <CommandBrowseBar
              dataProvider={commandProvider}
              tabs={commandTabs ?? []}
              onExecute={handleCommandBrowseExecute}
              onClose={handleCommandBrowseClose}
              flowRegistry={flowRegistry}
            />
          </motion.div>
        ) : isGlobalSearching && onGlobalSearch ? (
          <motion.div
            key="global-search-browse-bar"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
          >
            <GlobalSearchBrowseBar
              onSearch={onGlobalSearch}
              onSelect={handleGlobalSearchSelect}
              onClose={handleGlobalSearchClose}
            />
          </motion.div>
        ) : hasActionForm && activeActionForm ? (
          <motion.div
            key="action-form-bar"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={SPRINGS.GENTLE}
          >
            <ActionFormBar
              definition={activeActionForm}
              onSubmit={handleActionFormSubmit}
              onDismiss={handleActionFormDismiss}
              disabledStepIds={actionFormDisabledSteps}
              onPreferencesChange={onActionFormPreferencesChange}
              onHelpClick={onActionFormHelpClick}
            />
          </motion.div>
        ) : verification ? (
          <motion.div
            key="verification-bar"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
          >
            <VerificationActionBar
              onBackToWorkstream={verification.onBackToWorkstream}
              onArchive={verification.onArchive ?? (() => {})}
              customActions={verification.customActions}
              onOpenCustomize={verification.onOpenCustomize}
            />
          </motion.div>
        ) : hasPendingQuestion && pendingQuestion ? (
          <motion.div
            key="question-bar"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
          >
            <QuestionActionBar
              toolId={pendingQuestion.toolId}
              questions={pendingQuestion.questions}
              onSubmit={handleQuestionSubmit}
            />
          </motion.div>
        ) : hasFileChanges && fileChangeState ? (
          <motion.div
            key="file-change-bar"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
          >
            <FileChangeActionBar
              pendingCount={fileChangeState.pendingCount}
              currentFilePath={fileChangeState.currentFilePath}
              currentRequestId={fileChangeState.currentRequestId}
              onApprove={handleFileChangeApprove}
              onApproveAll={onFileChangeApproveAll ?? (() => {})}
              onApproveAllForSession={onFileChangeApproveAllForSession ?? (() => {})}
              onDeny={handleFileChangeDeny}
              onReview={onFileChangeReview ?? (() => {})}
            />
          </motion.div>
        ) : hasPendingApproval && pendingApproval ? (
          <motion.div
            key="permission-bar"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
          >
            <PermissionActionBar
              current={pendingApproval}
              currentPosition={approvalPosition?.current ?? 1}
              totalCount={approvalPosition?.total ?? 1}
              onApprove={handlePermissionApprove}
              onDeny={handlePermissionDeny}
              onOpenPlanReview={onOpenPlanReview}
            />
          </motion.div>
        ) : (
          <motion.div
            key="chat-input"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
          >
            <ChatInputUnified
              ref={inputRef}
              onChange={handleInputChange}
              initialValue={draftRef.current ?? persistedDraftRef.current}
              config={{
                placeholder: placeholderHint ?? placeholder,
                autoFocus,
                showCharacterCount: false,
                maxAttachments: 5,
                maxFileSize: 10 * 1024 * 1024,
                enableRotatingPlaceholder: true,
                placeholderInterval: 5000,
                placeholderFadeDuration: 200,
                placeholderTexts: [
                  'Type @ to mention workstreams, projects, or documents',
                  'Type / to use commands and skills',
                  'Attach files by dragging or using the + button',
                ],
                unfocusedPlaceholder: focusShortcutHint,
              }}
              onSubmit={handleSubmit}
              onSkillSelect={handleSkillSelect}
              skills={skills}
              onBrowseSkills={onBrowseSkills}
              disabled={isDisabled}
              isSubmitting={isSubmitting}
              builderMode={builderMode}
              onBuilderModeChange={onBuilderModeChange}
              voiceRecording={voiceRecording}
              voiceTranscribing={voiceTranscribing}
              voiceDownloading={voiceDownloading}
              onVoiceStart={onVoiceStart}
              onVoiceStop={onVoiceStop}
              voiceShortcutHint={voiceShortcutHint}
              entityProvider={entityProvider}
              commandProvider={commandProvider}
              entityTabs={entityTabs}
              commandTabs={commandTabs}
              onEntitySelect={onEntitySelect}
              onCommandExecute={onCommandExecute}
              onEntityChipClick={onEntityChipClick}
              iconHints={iconHints}
              flowRegistry={flowRegistry}
              fallbackCommand={fallbackCommand}
              onPasteOpen={onPasteOpen}
              initialMessageHistory={initialMessageHistory}
              onMessageHistoryNearEnd={onMessageHistoryNearEnd}
              leadingAccessory={leadingAccessory}
            />
          </motion.div>
        )}
      </AnimatePresence>
      {footer && <div className="mt-2">{footer}</div>}
    </div>
  );
});
