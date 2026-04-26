/**
 * ChatInputUnified — Full-featured chat input with palettes, attachments, and history
 *
 * @ai-context
 * - Single component combining file attachments, entity/command palettes, history nav
 * - @ trigger opens EntityPalette, / trigger opens CommandPalette (both optional)
 * - Entity chip insertion via palette selection with mention autocomplete
 * - File attachments via + menu with drag-and-drop support
 * - Builder mode toggle, voice input button, rotating placeholder
 * - Message history navigation with up/down arrow keys
 * - Paste chip support with inline editor modal
 * - data-slot="chat-input-unified"
 *
 * @example
 * <ChatInputUnified onSubmit={handleSubmit} entityProvider={provider} />
 */

import React, {
  memo,
  useCallback,
  forwardRef,
  useImperativeHandle,
  useState,
  useRef,
  useEffect,
} from 'react';

import { createRendererLogger } from '@vienna/logger/renderer';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp, Download, Loader2, Mic } from 'lucide-react';
import { cn } from '@tryvienna/ui';

import {
  buildPasteMarkup,
  PASTE_PREVIEW_LENGTH,
  setSessionPasteContent,
  getSessionPasteContent,
} from '../../utils/paste-markup';
import { useContentEditable } from '../../hooks/use-content-editable';
import { useMentionAutocomplete } from '../../hooks/use-mention-autocomplete';
import { useAttachments } from '../../hooks/use-attachments';
import { useMessageHistory } from '../../hooks/use-message-history';
import { useRotatingPlaceholder } from '../../hooks/use-rotating-placeholder';
import { AttachmentPreview } from './components/attachment-preview';
import { createEntityURI } from './components/entity-chip';
import { AttachmentMenu } from './components/attachment-menu';
import { EntityPalette } from '../palette/entity-palette';
import { CommandPaletteWithFlows } from '../palette/command-palette-with-flows';
import type { InputValue, InputConfig, Entity as InputEntity, Attachment } from '../../types/input';
import type {
  Entity as PaletteEntity,
  Command,
  EntityPaletteDataProvider,
  CommandPaletteDataProvider,
  PaletteTab,
  PaletteHandle,
} from '../palette/types';
import type { SkillMenuItem } from './components/attachment-menu';
import type { FlowDefinition } from '../palette/types';

const logger = createRendererLogger();

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ChatInputUnifiedProps {
  /** Configuration */
  config?: InputConfig & {
    /** Maximum number of attachments */
    maxAttachments?: number;
    /** Maximum file size in bytes */
    maxFileSize?: number;
    /** Allowed MIME types */
    allowedMimeTypes?: string[];
  };
  /** Initial value to populate on mount (used to restore drafts) */
  initialValue?: InputValue | null;
  /** Callback when value changes */
  onChange?: (value: InputValue) => void;
  /** Callback when user submits */
  onSubmit?: (value: InputValue, attachments: Attachment[]) => void;
  /** Callback when attachments change */
  onAttachmentsChange?: (attachments: Attachment[]) => void;
  /** Callback when skill is selected from + menu */
  onSkillSelect?: (skillId: string) => void;
  /** Skills to display in the attachment menu */
  skills?: SkillMenuItem[];
  /** Callback when user clicks "Browse skills..." in menu */
  onBrowseSkills?: () => void;
  /** Whether input is disabled */
  disabled?: boolean;
  /** Whether input is submitting */
  isSubmitting?: boolean;
  /** Additional className */
  className?: string;
  /** Show submit button */
  showSubmitButton?: boolean;
  /** Submit button label */
  submitButtonLabel?: string;

  // --- Builder Mode ---

  /** Whether builder mode is enabled */
  builderMode?: boolean;
  /** Callback when builder mode is toggled */
  onBuilderModeChange?: (enabled: boolean) => void;

  // --- Voice Input (Optional) ---

  /** Whether voice input is currently recording */
  voiceRecording?: boolean;
  /** Whether voice input is currently transcribing */
  voiceTranscribing?: boolean;
  /** Whether voice models are downloading in the background */
  voiceDownloading?: boolean;
  /** Called when user clicks the mic button to start recording */
  onVoiceStart?: () => void;
  /** Called when user clicks the mic button to stop recording */
  onVoiceStop?: () => void;
  /** Shortcut hint ReactNode rendered in mic button tooltip (e.g. ShortcutBadge) */
  voiceShortcutHint?: React.ReactNode;

  // --- Palette Integration (Optional) ---

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
  /** Called when an entity chip in the input is clicked */
  onEntityChipClick?: (uri: string, entityType: string, entityId: string) => void;
  /** Icon hints from entity registry, mapping type to Lucide icon name */
  iconHints?: Record<string, string>;
  /** Flow registry for multi-step commands */
  flowRegistry?: Record<string, FlowDefinition>;
  /** Factory for a fallback command shown when the user is searching */
  fallbackCommand?: (query: string) => Command | undefined;

  // --- Paste Editor (Optional) ---

  /**
   * Optional callback to open paste content externally (e.g., in a drawer).
   * If provided, clicking a paste chip calls this instead of showing an inline modal.
   * Receives the pasteId and current content so the handler can open the drawer
   * and write back changes via onPasteSave.
   */
  onPasteOpen?: (
    pasteId: string,
    content: string,
    preview: string,
    onSave: (newContent: string) => void
  ) => void;

  // --- Message History (Optional) ---

  /**
   * Pre-loaded message history from an external source (e.g. database),
   * newest first. Seeds the up-arrow history on mount and resets it when
   * the array changes (e.g. workstream switch).
   */
  initialMessageHistory?: string[];
  /**
   * Called when the user navigates close to the oldest loaded message
   * in the up-arrow history. Use this to preemptively fetch more messages.
   */
  onMessageHistoryNearEnd?: () => void;

  // --- Accessory Slots ---

  /** Optional content rendered in the bottom controls row (e.g., branch picker) */
  leadingAccessory?: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Handle API
// ---------------------------------------------------------------------------

export interface ChatInputUnifiedHandle {
  /** Focus the input */
  focus: () => void;
  /** Clear the input */
  clear: () => void;
  /** Set value programmatically */
  setValue: (value: string | InputValue) => void;
  /** Get current value */
  getValue: () => InputValue;
  /** Insert plain text at cursor position */
  insertText: (text: string) => void;
  /** Insert entity chip */
  insertEntity: (entity: InputEntity) => void;
  /** Get attachments */
  getAttachments: () => Attachment[];
  /** Clear attachments */
  clearAttachments: () => void;
  /** Open entity browse palette (CMD+P) */
  openEntityBrowse: () => void;
  /** Open workstream browse palette (CMD+G) */
  openWorkstreamBrowse: () => void;
  /** Open command palette (CMD+Shift+P) */
  openCommandPalette: () => void;
  /** Append older messages to the input's up-arrow history (for pagination) */
  appendOlderMessages: (messages: string[]) => void;
}

// ---------------------------------------------------------------------------
// Animation Variants
// ---------------------------------------------------------------------------

const paletteVariants = {
  hidden: {
    opacity: 0,
    transition: { duration: 0.1 },
  },
  visible: {
    opacity: 1,
    transition: { duration: 0.1 },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.1 },
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const ChatInputUnified = memo(
  forwardRef<ChatInputUnifiedHandle, ChatInputUnifiedProps>(function ChatInputUnified(
    {
      config = {},
      initialValue,
      onChange,
      onSubmit,
      onAttachmentsChange,
      onSkillSelect,
      skills,
      onBrowseSkills,
      disabled = false,
      isSubmitting = false,
      className,
      showSubmitButton = true,
      submitButtonLabel = 'Send',
      builderMode: _builderMode = false,
      onBuilderModeChange: _onBuilderModeChange,
      voiceRecording = false,
      voiceTranscribing = false,
      voiceDownloading = false,
      onVoiceStart,
      onVoiceStop,
      voiceShortcutHint,
      entityProvider,
      commandProvider,
      entityTabs = [],
      commandTabs = [],
      onEntitySelect,
      onCommandExecute,
      onEntityChipClick,
      iconHints,
      flowRegistry,
      fallbackCommand,
      onPasteOpen,
      initialMessageHistory,
      onMessageHistoryNearEnd,
      leadingAccessory,
    },
    forwardedRef
  ) {
    const {
      minHeight = 60,
      maxHeight = 200,
      showCharacterCount = false,
      maxLength,
      placeholder,
      autoFocus = false,
      maxAttachments = 10,
      maxFileSize = 10 * 1024 * 1024,
      allowedMimeTypes,
      enableRotatingPlaceholder = false,
      placeholderTexts,
      placeholderInterval,
      placeholderFadeDuration,
      unfocusedPlaceholder,
    } = config;

    const isDisabled = disabled || isSubmitting;

    // --- Refs ---

    const containerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const entityPaletteRef = useRef<PaletteHandle | null>(null);
    const commandPaletteRef = useRef<PaletteHandle | null>(null);

    // --- Paste Modal State ---

    const [pasteModalState, setPasteModalState] = useState<{
      pasteId: string;
      readOnly: boolean;
    } | null>(null);

    // --- Focus State ---

    const [isFocused, setIsFocused] = useState(false);

    // --- Palette State ---

    const [activePalette, setActivePalette] = useState<'entity' | 'command' | null>(null);
    const [paletteQuery, setPaletteQuery] = useState('');
    // Ref so the value is synchronously available at mount time.
    const initialCommandIdRef = useRef<string | undefined>(undefined);
    // Incremented each time we open the palette with an initialCommandId, forcing
    // CommandPaletteWithFlows to remount with a fresh key so lazy useState initializers re-run.
    const commandPaletteKeyRef = useRef(0);
    // Tracks the @ position when entity palette was explicitly dismissed via Escape,
    // so trigger detection doesn't immediately reopen it. Cleared when @ is removed.
    const entityDismissedAtRef = useRef<number | null>(null);

    // Workstream browse mode: CMD+G opens command palette directly in workstream:browse flow
    // Prevents trigger detection from immediately closing the palette (no "/" in input)
    const workstreamBrowseModeRef = useRef(false);

    // Command palette mode: CMD+Shift+P opens command palette with save/restore
    // Saved input is restored when palette is closed (Escape) or command is executed
    const commandPaletteModeRef = useRef(false);
    const savedInputBeforeCommandRef = useRef<typeof value | null>(null);

    // Tracks whether a flow was executed via slash command (e.g. "/pin").
    // When set, palette close should clear the slash text from the input.
    const flowExecutedViaSlashRef = useRef(false);

    // --- Attachments ---

    const {
      attachments,
      addFiles,
      removeAttachment,
      clearAttachments,
      isAtMaxLimit,
      error: attachmentError,
    } = useAttachments({
      maxAttachments,
      maxFileSize,
      allowedMimeTypes,
      onChange: onAttachmentsChange,
    });

    // --- ContentEditable ---

    const {
      ref: contentEditableRef,
      value,
      isEmpty,
      characterCount,
      clear: clearInput,
      softClear: softClearInput,
      setValue,
      focus,
      insertText: _insertText,
      handleInput: baseHandleInput,
      handleKeyDown: baseHandleKeyDown,
      handlePaste,
      pasteMapRef,
      isPastingRef,
    } = useContentEditable({
      onChange,
      disabled,
      autoFocus,
      onSubmit: undefined, // We handle submit ourselves
      onFilePaste: addFiles,
      // Always open the modal state; if onPasteOpen is set, the effect below
      // intercepts and calls the external handler instead.
      onPasteChipClick: (pasteId) => setPasteModalState({ pasteId, readOnly: false }),
    });

    // --- Mention Autocomplete (for entity chip insertion) ---

    const { insertEntity } = useMentionAutocomplete({
      elementRef: contentEditableRef,
      enabled: !disabled,
      onEntityClick: onEntityChipClick,
    });

    // --- Message History ---

    const { addToHistory, navigatePrevious, navigateNext, appendOlderMessages } = useMessageHistory({
      maxHistorySize: 50,
      onRestore: (message) => {
        setValue(message);
      },
      getCurrentValue: () => {
        const text = typeof value === 'string' ? value : value.plainText || '';
        return text;
      },
      initialHistory: initialMessageHistory,
      onNearEnd: onMessageHistoryNearEnd,
    });

    // --- Rotating Placeholder ---

    const { placeholder: rotatingPlaceholder, isTransitioning } = useRotatingPlaceholder({
      enabled: enableRotatingPlaceholder,
      hints: placeholderTexts,
      interval: placeholderInterval,
      fadeDuration: placeholderFadeDuration,
      hasMessages: false,
    });

    const focusedPlaceholder = placeholder ?? rotatingPlaceholder;
    const targetPlaceholder = !isFocused && unfocusedPlaceholder ? unfocusedPlaceholder : focusedPlaceholder;

    // Fade out → swap text → fade in when the desired placeholder changes
    const [displayPlaceholder, setDisplayPlaceholder] = useState(targetPlaceholder);
    const [isPlaceholderFading, setIsPlaceholderFading] = useState(false);
    const placeholderFadeTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    useEffect(() => {
      if (displayPlaceholder === targetPlaceholder) return;
      setIsPlaceholderFading(true);
      placeholderFadeTimerRef.current = setTimeout(() => {
        setDisplayPlaceholder(targetPlaceholder);
        setIsPlaceholderFading(false);
      }, 150);
      return () => clearTimeout(placeholderFadeTimerRef.current);
    }, [targetPlaceholder]);

    // --- Expose Handle API ---

    useImperativeHandle(
      forwardedRef,
      () => ({
        focus,
        clear: () => {
          clearInput();
          clearAttachments();
        },
        setValue,
        getValue: () => value,
        insertText: _insertText,
        insertEntity,
        getAttachments: () => attachments,
        clearAttachments,
        openEntityBrowse: () => {
          // No-op: entity browsing is now handled at the chat-input.tsx orchestrator level
          // via EntityBrowseBar (AnimatePresence morph). Kept for API compatibility.
        },
        openWorkstreamBrowse: () => {
          workstreamBrowseModeRef.current = true;
          initialCommandIdRef.current = 'workstream:browse';
          commandPaletteKeyRef.current += 1;
          setActivePalette('command');
          setPaletteQuery('');
        },
        openCommandPalette: () => {
          savedInputBeforeCommandRef.current = value;
          commandPaletteModeRef.current = true;
          setValue('/');
          setActivePalette('command');
          setPaletteQuery('');
          focus();
        },
        appendOlderMessages,
      }),
      [focus, clearInput, clearAttachments, setValue, value, insertEntity, attachments, appendOlderMessages]
    );

    // --- Restore Draft on Mount ---

    useEffect(() => {
      if (initialValue && (initialValue.plainText.trim() || initialValue.entities.length > 0)) {
        setValue(initialValue);
      }
      // Intentionally only runs on mount — initialValue is a snapshot
    }, []);

    // --- Palette Entity to Input Entity Conversion ---

    const convertPaletteEntityToInputEntity = useCallback(
      (paletteEntity: PaletteEntity): InputEntity => {
        const inputEntity: InputEntity = {
          id: paletteEntity.id,
          type: paletteEntity.type,
          label: paletteEntity.title,
          metadata: paletteEntity.metadata as Record<string, unknown>,
        };
        inputEntity.uri = createEntityURI(inputEntity);
        return inputEntity;
      },
      []
    );

    // --- Palette Trigger Detection ---

    /**
     * Find a real @ trigger that's not inside an entity URI like [@vienna//...]
     * Returns the index of the @ or -1 if not found
     */
    const findRealAtTrigger = useCallback((text: string): number => {
      let pos = text.length;
      while ((pos = text.lastIndexOf('@', pos - 1)) !== -1) {
        // Check if this @ is inside brackets [...] (entity URI)
        const beforeAt = text.slice(0, pos);
        const afterAt = text.slice(pos);

        const lastOpenBracket = beforeAt.lastIndexOf('[');
        const firstCloseBracket = afterAt.indexOf(']');

        if (lastOpenBracket !== -1 && firstCloseBracket !== -1) {
          // Check if there's no ] between [ and @ (meaning @ is inside [...])
          const textAfterBracket = beforeAt.slice(lastOpenBracket + 1);
          if (!textAfterBracket.includes(']')) {
            // This @ is inside an entity URI, skip it
            continue;
          }
        }

        // Found a real @ trigger
        return pos;
      }
      return -1;
    }, []);

    useEffect(() => {
      // Only detect triggers if at least one provider is available
      if (!entityProvider && !commandProvider) return;

      const text = typeof value === 'string' ? value : value.plainText || '';

      // --- Entity palette is open: update query or close ---
      if (activePalette === 'entity') {
        if (entityProvider) {
          const atIndex = findRealAtTrigger(text);
          if (atIndex !== -1 && entityDismissedAtRef.current !== atIndex) {
            const afterAt = text.slice(atIndex + 1);
            const bracketIndex = afterAt.indexOf('[');
            const query = bracketIndex !== -1 ? afterAt.slice(0, bracketIndex) : afterAt;
            setPaletteQuery(query);
          } else {
            setActivePalette(null);
            setPaletteQuery('');
            if (atIndex === -1) entityDismissedAtRef.current = null;
          }
        }
        return;
      }

      // --- Command palette is open: update query or close ---
      if (activePalette === 'command') {
        if (commandProvider && text.startsWith('/')) {
          setPaletteQuery(text.slice(1));
        } else if (!workstreamBrowseModeRef.current) {
          // Restore saved input if opened via Cmd+Shift+P
          if (commandPaletteModeRef.current) {
            commandPaletteModeRef.current = false;
            const saved = savedInputBeforeCommandRef.current;
            savedInputBeforeCommandRef.current = null;
            if (saved !== null) {
              setValue(saved);
            }
          }
          setActivePalette(null);
          setPaletteQuery('');
        }
        return;
      }

      // --- Palette is NOT open ---
      // Opening is handled by handleInput (only fires on user typing, not paste).
      // Just clear entityDismissedAtRef when @ is removed from text.
      if (entityProvider && findRealAtTrigger(text) === -1) {
        entityDismissedAtRef.current = null;
      }
    }, [value, isEmpty, activePalette, entityProvider, commandProvider, findRealAtTrigger]);

    // --- Entity Selection Handler ---

    const handleEntitySelect = useCallback(
      (paletteEntity: PaletteEntity) => {
        logger.debug('Entity selected from palette', {
          entityId: paletteEntity.id,
          entityType: paletteEntity.type,
          entityTitle: paletteEntity.title,
        });

        const inputEntity = convertPaletteEntityToInputEntity(paletteEntity);
        insertEntity(inputEntity);
        onEntitySelect?.(paletteEntity);

        setActivePalette(null);
        setPaletteQuery('');
        focus();
      },
      [
        insertEntity,
        onEntitySelect,
        focus,
        convertPaletteEntityToInputEntity,
      ]
    );

    // --- Command Execution Handler ---

    const handleCommandExecute = useCallback(
      (command: Command) => {
        logger.debug('Command executed from palette', {
          commandId: command.id,
          title: command.title,
          category: command.category,
        });

        onCommandExecute?.(command);

        // Don't close palette if command has a flow — the flow
        // screen will render inside the palette container.
        // NOTE: For flow commands, CommandPaletteWithFlows intercepts
        // and does NOT call onExecute, so this block is unreachable
        // for flows. Flow slash cleanup is handled via onFlowStateChange.
        if (command.hasFlow && flowRegistry?.[command.id]) return;

        // Restore saved input if opened via Cmd+Shift+P
        if (commandPaletteModeRef.current) {
          commandPaletteModeRef.current = false;
          const saved = savedInputBeforeCommandRef.current;
          savedInputBeforeCommandRef.current = null;
          if (saved !== null) {
            setValue(saved);
          } else {
            clearInput();
          }
        } else {
          // Opened via slash trigger — clear the /query text
          clearInput();
        }

        workstreamBrowseModeRef.current = false;
        initialCommandIdRef.current = undefined;
        setActivePalette(null);
        setPaletteQuery('');
        focus();
      },
      [onCommandExecute, focus, flowRegistry, setValue, clearInput]
    );

    // --- Palette Close Handler ---

    const handleFlowStateChange = useCallback(
      (isFlowActive: boolean) => {
        // When a flow activates in slash mode, mark it so we clear input on close
        if (isFlowActive && !commandPaletteModeRef.current && !workstreamBrowseModeRef.current) {
          flowExecutedViaSlashRef.current = true;
        }
      },
      []
    );

    const handlePaletteClose = useCallback(() => {
      if (workstreamBrowseModeRef.current) {
        // Workstream browse mode: no input text to clear
        workstreamBrowseModeRef.current = false;
        initialCommandIdRef.current = undefined;
        setActivePalette(null);
        setPaletteQuery('');
        focus();
        return;
      }

      // Command palette mode (Cmd+Shift+P): restore saved input
      if (commandPaletteModeRef.current) {
        commandPaletteModeRef.current = false;
        const saved = savedInputBeforeCommandRef.current;
        savedInputBeforeCommandRef.current = null;
        if (saved !== null) {
          setValue(saved);
        } else {
          clearInput();
        }
        initialCommandIdRef.current = undefined;
        setActivePalette(null);
        setPaletteQuery('');
        focus();
        return;
      }

      // When a flow was executed via slash command (e.g. "/pin"), clear the input
      if (flowExecutedViaSlashRef.current) {
        flowExecutedViaSlashRef.current = false;
        clearInput();
        initialCommandIdRef.current = undefined;
        setActivePalette(null);
        setPaletteQuery('');
        focus();
        return;
      }

      // When closing the command palette via natural "/" typing, leave the text
      // as-is — user may be typing something that contains "/" (e.g., "/hello").
      // Trigger detection won't reopen the palette since it only fires on user input events.
      if (activePalette === 'entity') {
        // Remember the @ position so trigger detection doesn't reopen the palette.
        const text = typeof value === 'string' ? value : value.plainText || '';
        entityDismissedAtRef.current = findRealAtTrigger(text);
      }
      initialCommandIdRef.current = undefined;
      setActivePalette(null);
      setPaletteQuery('');
      focus();
    }, [activePalette, clearInput, setValue, focus, value, findRealAtTrigger]);

    // --- Paste Editor Save Handler ---

    // Core save logic — updates the ref map and DOM chip.
    const handlePasteEditorSaveById = useCallback(
      (pasteId: string, newContent: string) => {
        // Update both the component-scoped ref map and the session-scoped store
        pasteMapRef.current.set(pasteId, newContent);
        setSessionPasteContent(pasteId, newContent);

        // Update the DOM chip's displayed stats and preview
        if (contentEditableRef.current) {
          const chip = contentEditableRef.current.querySelector(
            `[data-paste-id="${pasteId}"]`
          ) as HTMLElement | null;
          if (chip) {
            const newLines = newContent.split('\n').length;
            chip.setAttribute('data-paste-chars', String(newContent.length));
            chip.setAttribute('data-paste-lines', String(newLines));
            const previewSpan = chip.querySelector('.paste-chip-preview') as HTMLElement | null;
            if (previewSpan) {
              const newPreviewFull = newContent.trimStart().slice(0, 40).replace(/\n/g, ' ');
              const newPreview =
                newContent.trimStart().length > 40 ? newPreviewFull + '\u2026' : newPreviewFull;
              previewSpan.textContent = newPreview;
            }
            const statsSpan = chip.querySelector('.paste-chip-stats') as HTMLElement | null;
            if (statsSpan) {
              statsSpan.textContent = `${newContent.length.toLocaleString()} chars \u00b7 ${newLines} lines`;
            }
          }
        }
      },
      [pasteMapRef, contentEditableRef]
    );

    // When an external onPasteOpen is provided, intercept the modal state and
    // open the drawer instead of the inline modal.
    useEffect(() => {
      if (!pasteModalState || !onPasteOpen) return;
      const { pasteId } = pasteModalState;
      const content = pasteMapRef.current.get(pasteId) ?? getSessionPasteContent(pasteId) ?? '';
      const preview = content.trimStart().slice(0, 40).replace(/\n/g, ' ');
      // Clear modal state immediately (the drawer handles its own lifecycle)
      setPasteModalState(null);
      onPasteOpen(pasteId, content, preview, (newContent) => {
        handlePasteEditorSaveById(pasteId, newContent);
      });
    }, [pasteModalState, onPasteOpen, pasteMapRef, handlePasteEditorSaveById]);

    // --- Submit Handler ---

    const handleSubmit = useCallback(() => {
      if (isDisabled || (isEmpty && attachments.length === 0)) return;

      // Serialize paste chips: replace lightweight [paste://id] placeholders
      // with full [paste://id?preview=b64&content=b64] markup for history storage.
      let serializedPlainText = value.plainText;
      for (const [pasteId, content] of pasteMapRef.current.entries()) {
        const placeholder = `[paste://${pasteId}]`;
        if (serializedPlainText.includes(placeholder)) {
          const preview = content.trimStart().slice(0, PASTE_PREVIEW_LENGTH).replace(/\n/g, ' ');
          const fullMarkup = buildPasteMarkup({
            id: pasteId,
            text: content,
            charCount: content.length,
            lineCount: content.split('\n').length,
            preview,
          });
          serializedPlainText = serializedPlainText.replace(placeholder, fullMarkup);
        }
      }

      const submittedValue = { ...value, plainText: serializedPlainText };

      if (serializedPlainText && serializedPlainText.trim()) {
        addToHistory(serializedPlainText);
      }

      onSubmit?.(submittedValue, attachments);
      pasteMapRef.current.clear();
      clearInput();
      clearAttachments();
      focus();
    }, [
      isDisabled,
      isEmpty,
      attachments,
      value,
      pasteMapRef,
      onSubmit,
      clearInput,
      clearAttachments,
      addToHistory,
      focus,
    ]);

    // --- Input Handler ---

    const handleInput = useCallback(
      (e: React.FormEvent<HTMLDivElement>) => {
        baseHandleInput(e);

        // Open palettes only on user-typed trigger characters.
        const inputEvent = e.nativeEvent as InputEvent;
        if (!inputEvent.data || activePalette !== null) return;
        if (isPastingRef.current) return;
        if (inputEvent.inputType && inputEvent.inputType !== 'insertText') return;

        if (inputEvent.data === '@' && entityProvider) {
          const element = contentEditableRef.current;
          if (element) {
            const text = element.innerText || '';
            const atIndex = findRealAtTrigger(text);
            if (atIndex !== -1 && entityDismissedAtRef.current !== atIndex) {
              setActivePalette('entity');
              setPaletteQuery('');
            }
          }
        } else if (inputEvent.data === '/' && commandProvider) {
          const element = contentEditableRef.current;
          if (element && element.innerText.startsWith('/')) {
            setActivePalette('command');
            setPaletteQuery('');
          }
        }
      },
      [
        baseHandleInput,
        activePalette,
        entityProvider,
        commandProvider,
        contentEditableRef,
        findRealAtTrigger,
        isPastingRef,
      ]
    );

    // --- Keydown Handler ---

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLDivElement>) => {
        // Forward to active palette first
        if (activePalette === 'entity' && entityPaletteRef.current) {
          const handled = entityPaletteRef.current.handleKeyDown(e);
          if (handled) {
            e.preventDefault();
            return;
          }
        }

        if (activePalette === 'command' && commandPaletteRef.current) {
          const handled = commandPaletteRef.current.handleKeyDown(e);
          if (handled) {
            e.preventDefault();
            return;
          }
        }

        // Message history navigation (when palette not active)
        // Only navigate history when cursor is on the first/last line of the input,
        // so arrow keys work normally for multi-line editing.
        if (activePalette === null) {
          if (e.key === 'ArrowUp' && !e.shiftKey) {
            const sel = window.getSelection();
            if (sel && sel.rangeCount > 0 && contentEditableRef.current) {
              const range = sel.getRangeAt(0);
              const caretRect = range.getClientRects()[0] ?? range.startContainer.parentElement?.getBoundingClientRect();
              const containerRect = contentEditableRef.current.getBoundingClientRect();
              // Cursor is on the first line if its top is within 5px of the container top
              const isOnFirstLine = !caretRect || caretRect.top - containerRect.top < 5;
              if (isOnFirstLine) {
                const prevMessage = navigatePrevious();
                if (prevMessage !== null) {
                  e.preventDefault();
                  setValue(prevMessage);
                  return;
                }
              }
            }
          }

          if (e.key === 'ArrowDown' && !e.shiftKey) {
            const sel = window.getSelection();
            if (sel && sel.rangeCount > 0 && contentEditableRef.current) {
              const range = sel.getRangeAt(0);
              const caretRect = range.getClientRects()[0] ?? range.startContainer.parentElement?.getBoundingClientRect();
              const containerRect = contentEditableRef.current.getBoundingClientRect();
              // Cursor is on the last line if its bottom is within 5px of the container bottom
              const isOnLastLine = !caretRect || containerRect.bottom - caretRect.bottom < 5;
              if (isOnLastLine) {
                const nextMessage = navigateNext();
                if (nextMessage !== null) {
                  e.preventDefault();
                  setValue(nextMessage);
                  return;
                }
              }
            }
          }
        }

        // Enter to submit (when palette not active)
        if (e.key === 'Enter' && !e.shiftKey && activePalette === null) {
          e.preventDefault();
          handleSubmit();
          return;
        }

        // Escape to clear (when palette not active) — uses softClear so CMD+Z can restore
        if (e.key === 'Escape' && activePalette === null) {
          e.preventDefault();
          softClearInput();
          return;
        }

        baseHandleKeyDown(e);
      },
      [
        activePalette,
        navigatePrevious,
        navigateNext,
        setValue,
        handleSubmit,
        softClearInput,
        baseHandleKeyDown,
      ]
    );

    // --- File Selection Handler ---

    const handleFileSelect = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
          addFiles(e.target.files);
          e.target.value = '';
        }
      },
      [addFiles]
    );

    const handleAttachClick = useCallback(() => {
      fileInputRef.current?.click();
    }, []);

    // --- Skill Selection Handler ---

    const handleSkillSelect = useCallback(
      (skillId: string) => {
        onSkillSelect?.(skillId);
      },
      [onSkillSelect]
    );

    // --- Validation ---

    const isOverMaxLength = maxLength !== undefined && characterCount > maxLength;
    const canSubmit = !isDisabled && (!isEmpty || attachments.length > 0) && !isOverMaxLength;

    // --- Render ---

    return (
      <div
        ref={containerRef}
        className={cn('flex flex-col gap-3 relative', className)}
        data-slot="chat-input-unified"
        data-disabled={isDisabled}
        data-submitting={isSubmitting}
      >
        {/* Palettes Container (floating above input) */}
        {(entityProvider || commandProvider) && (
          <div className="absolute bottom-full left-0 right-0 mb-2 z-[1000]">
            <AnimatePresence mode="wait">
              {activePalette === 'entity' && entityProvider && (
                <motion.div
                  key="entity-palette"
                  variants={paletteVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="relative flex z-[1000]"
                >
                  <EntityPalette
                    ref={entityPaletteRef}
                    isOpen={true}
                    onClose={handlePaletteClose}
                    onSelect={handleEntitySelect}
                    dataProvider={entityProvider}
                    query={paletteQuery}
                    tabs={entityTabs}
                    iconHints={iconHints}
                  />
                </motion.div>
              )}

              {activePalette === 'command' && commandProvider && (
                <motion.div
                  key={`command-palette-${commandPaletteKeyRef.current}`}
                  variants={paletteVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="relative flex z-[1000]"
                >
                  <CommandPaletteWithFlows
                    ref={commandPaletteRef}
                    isOpen={true}
                    onClose={handlePaletteClose}
                    onExecute={handleCommandExecute}
                    dataProvider={commandProvider}
                    query={paletteQuery}
                    tabs={commandTabs}
                    flowRegistry={flowRegistry}
                    fallbackCommand={fallbackCommand}
                    initialCommandId={initialCommandIdRef.current}
                    onFlowStateChange={handleFlowStateChange}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Attachment Previews */}
        {attachments.length > 0 && (
          <div className="flex flex-col gap-2">
            {attachments.map((attachment) => (
              <AttachmentPreview
                key={attachment.id}
                attachment={attachment}
                onRemove={(a) => removeAttachment(a.id)}
                size="sm"
              />
            ))}
          </div>
        )}

        {/* Attachment Error */}
        {attachmentError && (
          <div
            className="px-3 py-2 bg-error/10 text-error border border-error/20 rounded-lg text-[13px]"
            role="alert"
            aria-live="polite"
          >
            {attachmentError}
          </div>
        )}

        {/* Input Container */}
        <div
          className={cn(
            'flex flex-col p-3',
            'bg-surface-page border border-border-default rounded-xl',
            'transition-colors focus-within:border-ai'
          )}
        >
          {/* Text Input Area */}
          <div className="flex-1 relative overflow-hidden mb-3 min-h-6">
            {isEmpty && displayPlaceholder && (
              <div
                className="absolute top-0 left-0 text-muted-foreground pointer-events-none text-[14px] leading-[1.5] select-none transition-opacity duration-150"
                style={{ opacity: isTransitioning || isPlaceholderFading ? 0 : 1 }}
                aria-hidden="true"
              >
                {displayPlaceholder}
              </div>
            )}
            <div
              ref={contentEditableRef}
              contentEditable={!disabled}
              onInput={handleInput}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              className={cn(
                'w-full text-[14px] leading-[1.5] font-inherit',
                'overflow-y-auto outline-none bg-transparent text-foreground',
                'whitespace-pre-wrap break-words',
                '[&_.entity-chip]:inline-flex [&_.entity-chip]:items-center [&_.entity-chip]:align-baseline',
                '[&_.entity-chip-inline]:inline-flex [&_.entity-chip-inline]:items-center [&_.entity-chip-inline]:align-baseline',
                '[&_.entity-chip-inline]:px-1.5 [&_.entity-chip-inline]:mx-0.5 [&_.entity-chip-inline]:rounded',
                '[&_.entity-chip-inline]:text-[13px] [&_.entity-chip-inline]:font-medium [&_.entity-chip-inline]:select-none',
                '[&_.paste-chip-inline]:inline-flex [&_.paste-chip-inline]:items-center [&_.paste-chip-inline]:align-baseline',
                '[&_.paste-chip-inline:hover]:brightness-[1.2]',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
              style={{
                minHeight: `${minHeight - 60}px`,
                maxHeight: `${maxHeight - 60}px`,
              }}
              data-testid="chat-message-input"
              data-chat-input-textbox
              role="textbox"
              aria-label="Message input (Shift+Enter for new line)"
              aria-multiline="true"
              aria-disabled={disabled}
            />
          </div>

          {/* Bottom Controls Row */}
          <div className="flex items-center justify-between gap-2 h-8 shrink-0">
            {/* Left: + button and builder mode */}
            <div className="flex items-center gap-1 -ml-1">
              <AttachmentMenu
                onAttachFile={handleAttachClick}
                onSelectSkill={handleSkillSelect}
                onBrowseSkills={onBrowseSkills}
                skills={skills}
                disabled={isDisabled || isAtMaxLimit}
                className="[&>button]:!w-8 [&>button]:!h-8 [&>button]:!p-0 [&>button]:!m-0 [&>button]:!min-w-[32px]"
              />
              {onVoiceStart && (
                <div className="relative group/mic">
                  <motion.button
                    type="button"
                    onClick={voiceRecording ? onVoiceStop : onVoiceStart}
                    className={cn(
                      'flex items-center justify-center w-8 h-8 p-0 border-none rounded-lg cursor-pointer',
                      'transition-all duration-150 select-none',
                      voiceRecording
                        ? 'bg-error text-white'
                        : voiceDownloading
                          ? 'bg-transparent text-accent'
                          : 'bg-transparent text-muted-foreground hover:enabled:bg-surface-hover hover:enabled:text-foreground-secondary',
                      'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                    aria-label={
                      voiceRecording
                        ? 'Click to stop recording'
                        : voiceTranscribing
                          ? 'Transcribing...'
                          : voiceDownloading
                            ? 'Downloading voice models...'
                            : 'Voice input'
                    }
                    disabled={isDisabled || voiceTranscribing}
                    // Animation-specific: framer-motion boxShadow keyframes require raw rgba values
                    animate={
                      voiceRecording
                        ? {
                            boxShadow: [
                              '0 0 0 0 rgba(239,68,68,0.4)',
                              '0 0 0 6px rgba(239,68,68,0)',
                              '0 0 0 0 rgba(239,68,68,0.4)',
                            ],
                          }
                        : voiceDownloading
                          ? {
                              boxShadow: [
                                '0 0 0 0 rgba(99,102,241,0.3)',
                                '0 0 0 5px rgba(99,102,241,0)',
                                '0 0 0 0 rgba(99,102,241,0.3)',
                              ],
                            }
                          : { boxShadow: '0 0 0 0 rgba(239,68,68,0)' }
                    }
                    transition={
                      voiceRecording
                        ? { duration: 1, ease: 'easeInOut', repeat: Infinity }
                        : voiceDownloading
                          ? { duration: 2, ease: 'easeInOut', repeat: Infinity }
                          : { duration: 0.15 }
                    }
                  >
                    {voiceTranscribing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" aria-label="Transcribing..." />
                    ) : voiceDownloading ? (
                      <Download className="w-4 h-4" />
                    ) : (
                      <Mic className="w-4 h-4" />
                    )}
                  </motion.button>
                  {/* Shortcut hint — pure CSS hover, no Tooltip component (avoids arrow/dark-bg issues) */}
                  {voiceShortcutHint && !voiceRecording && !voiceTranscribing && !voiceDownloading && (
                    <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover/mic:opacity-100 transition-opacity duration-150">
                      {voiceShortcutHint}
                    </div>
                  )}
                </div>
              )}
              {leadingAccessory}
            </div>

            {/* Right: submit button */}
            <div className="flex items-center gap-1">
              {showSubmitButton && (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className={cn(
                    'shrink-0 flex items-center justify-center w-8 h-8 p-0',
                    'bg-surface-hover text-foreground-secondary border-none rounded-lg cursor-pointer',
                    'transition-[background-color,opacity] duration-150',
                    'hover:enabled:bg-surface-active',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                  aria-label="Send message"
                  title={submitButtonLabel}
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" aria-label="Submitting..." />
                  ) : (
                    <ArrowUp className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Character Counter */}
        {showCharacterCount && (
          <div
            className={cn('ml-3 text-xs text-muted-foreground', isOverMaxLength && 'text-error')}
          >
            {characterCount}
            {maxLength !== undefined && ` / ${maxLength}`}
          </div>
        )}

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={allowedMimeTypes?.join(',')}
          onChange={handleFileSelect}
          className="hidden"
          aria-label="File input"
        />


      </div>
    );
  })
);
