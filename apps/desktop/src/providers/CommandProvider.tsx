/**
 * CommandProvider — React context for command palette data.
 *
 * @ai-context
 * Loads the command catalog via GraphQL (useQuery), executes commands via
 * GraphQL mutation (useMutation). Apollo's cache-and-network fetch policy
 * keeps data fresh; graphql.onInvalidate events (fired by CommandRegistry)
 * trigger automatic refetches via the existing App.tsx invalidation handler.
 *
 * Renderer-side handlers: Components register local handlers via
 * `useRegisterCommandHandler()` for commands that need renderer-side logic
 * (e.g., creating workstreams, toggling sidebar). Both the palette and
 * keyboard shortcuts run through `executeCommand()`, which calls the
 * renderer handler first, then the GraphQL mutation for result actions.
 *
 * Search runs client-side with Fuse.js (createCommandSearch) for zero-latency
 * results — no round-trip per keystroke.
 *
 * Recents are persisted in localStorage (max 10).
 *
 * @module providers/CommandProvider
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import { createRendererLogger } from '@vienna/logger/renderer';
import { useQuery, useMutation } from '@vienna/graphql/client';
import { GET_COMMANDS, EXECUTE_COMMAND, RESCAN_CLAUDE_COMMANDS } from '@vienna/graphql/client';
import { createCommandSearch } from '@vienna/chat-ui';
import type { Command, CommandCategory, CommandPaletteDataProvider } from '@vienna/chat-ui';
import { useKeybindings } from './KeybindingsProvider';
import { getAllHelpDocs } from '../in-app-docs';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const logger = createRendererLogger();

const RECENTS_KEY = 'vienna:command-palette:recents';
const MAX_RECENTS = 10;

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/** Renderer-side command handler. Runs before/instead of the main-process handler. */
export type RendererCommandHandler = () => void | Promise<void>;

/** Result action from command execution (mirrors GraphQL CommandResultAction). */
export interface CommandResultActionData {
  type: string;
  path?: string | null;
  message?: string | null;
  variant?: string | null;
  text?: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTEXT
// ═══════════════════════════════════════════════════════════════════════════════

interface CommandContextValue {
  /** Data provider for CommandPalette / CommandPaletteWithFlows. */
  dataProvider: CommandPaletteDataProvider;
  /** Full command catalog (for deriving flow-eligible commands, etc.). */
  commands: Command[];
  /** Whether the command palette overlay is open. */
  isOpen: boolean;
  /** Open the command palette. */
  open: () => void;
  /** Close the command palette. */
  close: () => void;
  /** Toggle the command palette. */
  toggle: () => void;
  /** Open the palette directly into a command's flow (e.g., 'workstream:browse'). */
  openWithCommand: (commandId: string) => void;
  /** The initial command ID to activate when the palette opens. Cleared after use. */
  initialCommandId: string | undefined;
  /**
   * Execute a command by ID. Runs renderer handler if registered,
   * then calls GraphQL mutation. Returns the result action (if any).
   */
  executeCommand: (commandId: string) => Promise<CommandResultActionData | undefined>;
  /** Register a renderer-side handler for a command. Returns unregister function. */
  registerHandler: (commandId: string, handler: RendererCommandHandler) => () => void;
}

const CommandContext = createContext<CommandContextValue | null>(null);

// ═══════════════════════════════════════════════════════════════════════════════
// RECENTS (localStorage)
// ═══════════════════════════════════════════════════════════════════════════════

function loadRecents(): string[] {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === 'string');
  } catch {
    return [];
  }
}

function saveRecents(ids: string[]): void {
  try {
    localStorage.setItem(RECENTS_KEY, JSON.stringify(ids));
  } catch {
    // Ignore storage quota errors
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMMAND CONVERSION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Convert a nullable GraphQL command to the Command type expected by chat-ui.
 * Returns undefined if required fields are missing.
 */
function toCommand(
  def: {
    id?: string | null;
    category?: string | null;
    title?: string | null;
    description?: string | null;
    keywords?: string[] | null;
    disabled?: boolean | null;
    disabledReason?: string | null;
    hasFlow?: boolean | null;
    body?: string | null;
  },
  getShortcut: (id: string) => { modifiers: Array<'cmd' | 'ctrl' | 'alt' | 'shift'>; key: string } | undefined
): Command | undefined {
  if (!def.id || !def.title || !def.category) return undefined;
  return {
    id: def.id,
    category: def.category as CommandCategory,
    title: def.title,
    description: def.description ?? undefined,
    keywords: def.keywords ?? undefined,
    disabled: def.disabled ?? undefined,
    disabledReason: def.disabledReason ?? undefined,
    hasFlow: def.hasFlow ?? undefined,
    body: def.body ?? undefined,
    shortcut: getShortcut(def.id),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROVIDER
// ═══════════════════════════════════════════════════════════════════════════════

export function CommandProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [initialCommandId, setInitialCommandId] = useState<string | undefined>();
  const { getShortcut } = useKeybindings();

  // Stable ref for getShortcut to avoid recreating the data provider
  const getShortcutRef = useRef(getShortcut);
  getShortcutRef.current = getShortcut;

  // Search instance ref (recreated when catalog changes)
  const searchRef = useRef<{ search(query: string): Command[]; update(commands: Command[]): void } | null>(null);

  // Renderer-side command handlers (registered by child components)
  const rendererHandlersRef = useRef(new Map<string, RendererCommandHandler>());

  // ─── GraphQL: fetch catalog ─────────────────────────────────────────
  const { data: catalogData } = useQuery(GET_COMMANDS);
  const catalog = catalogData?.commands ?? [];

  // ─── GraphQL: execute mutation ──────────────────────────────────────
  const [executeCommandMut] = useMutation(EXECUTE_COMMAND);

  // ─── GraphQL: rescan Claude commands (fire-and-forget on palette open)
  const [rescanClaudeCommandsMut] = useMutation(RESCAN_CLAUDE_COMMANDS);

  // Rebuild search index when catalog changes
  const commands = useMemo(() => {
    const mapped = catalog
      .map((c) => toCommand(c, getShortcutRef.current))
      .filter((c): c is Command => c !== undefined);

    // Inject help doc commands (auto-generated from docs-site manifest)
    for (const [path, doc] of getAllHelpDocs()) {
      mapped.push({
        id: `help:doc:${path}`,
        category: 'help',
        title: doc.label,
        description: doc.description,
        keywords: ['help', 'docs', 'documentation', ...path.split('/').filter(Boolean)],
      });
    }

    searchRef.current = createCommandSearch(mapped);
    return mapped;
  }, [catalog]);

  // ─── Renderer Handler Registry ──────────────────────────────────────

  const registerHandler = useCallback(
    (commandId: string, handler: RendererCommandHandler): (() => void) => {
      rendererHandlersRef.current.set(commandId, handler);
      return () => {
        rendererHandlersRef.current.delete(commandId);
      };
    },
    []
  );

  // ─── Unified Command Execution ──────────────────────────────────────

  const executeCommand = useCallback(
    async (commandId: string): Promise<CommandResultActionData | undefined> => {
      // 1. Run renderer-side handler if registered
      const rendererHandler = rendererHandlersRef.current.get(commandId);
      if (rendererHandler) {
        await rendererHandler();
      }

      // 2. Also call GraphQL mutation (for result actions from main process)
      try {
        const { data } = await executeCommandMut({
          variables: { commandId },
        });
        const result = data?.executeCommand;
        if (result && !result.success && result.error) {
          logger.error('[CommandProvider] Command failed', { error: result.error });
        }
        const action = result?.action;
        if (!action?.type) return undefined;
        return {
          type: action.type,
          path: action.path,
          message: action.message,
          variant: action.variant,
          text: action.text,
        };
      } catch (err) {
        logger.error('[CommandProvider] Execute mutation failed', { error: err instanceof Error ? err.message : String(err) });
        return undefined;
      }
    },
    [executeCommandMut]
  );

  // ─── Data Provider ───────────────────────────────────────────────────

  const dataProvider = useMemo<CommandPaletteDataProvider>(() => {
    return {
      getCommands: async (categoryFilter?: string) => {
        if (!categoryFilter) return commands;
        return commands.filter((c) => c.category === categoryFilter);
      },

      search: async (query: string, categoryFilter?: string, signal?: AbortSignal) => {
        if (signal?.aborted) return [];

        // Rebuild search if needed (catalog may have updated)
        if (!searchRef.current) {
          searchRef.current = createCommandSearch(commands);
        }

        let results = searchRef.current.search(query);
        if (categoryFilter) {
          results = results.filter((c: Command) => c.category === categoryFilter);
        }
        return results;
      },

      getRecents: async (limit = MAX_RECENTS) => {
        const recentIds = loadRecents();
        const commandMap = new Map(commands.map((c) => [c.id, c]));

        return recentIds
          .map((id) => commandMap.get(id))
          .filter((c): c is Command => c !== undefined)
          .slice(0, limit);
      },

      execute: async (command: Command) => {
        await executeCommand(command.id);
      },

      markRecent: (command: Command) => {
        const ids = loadRecents().filter((id) => id !== command.id);
        ids.unshift(command.id);
        saveRecents(ids.slice(0, MAX_RECENTS));
      },
    };
  }, [commands, executeCommand]);

  // ─── Open/Close ──────────────────────────────────────────────────────

  const open = useCallback(() => {
    setIsOpen(true);
    // Fire-and-forget: rescan Claude commands from .claude/commands/ directories
    rescanClaudeCommandsMut().catch(() => {
      // Silently ignore — stale commands are fine, palette should open instantly
    });
  }, [rescanClaudeCommandsMut]);
  const close = useCallback(() => {
    setIsOpen(false);
    setInitialCommandId(undefined);
  }, []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);
  const openWithCommand = useCallback((commandId: string) => {
    setInitialCommandId(commandId);
    setIsOpen(true);
    rescanClaudeCommandsMut().catch(() => {});
  }, [rescanClaudeCommandsMut]);

  const value = useMemo<CommandContextValue>(
    () => ({ dataProvider, commands, isOpen, open, close, toggle, openWithCommand, initialCommandId, executeCommand, registerHandler }),
    [dataProvider, commands, isOpen, open, close, toggle, openWithCommand, initialCommandId, executeCommand, registerHandler]
  );

  return (
    <CommandContext.Provider value={value}>
      {children}
    </CommandContext.Provider>
  );
}

/** Use command palette context. Must be within CommandProvider. */
export function useCommandPalette(): CommandContextValue {
  const context = useContext(CommandContext);
  if (!context) {
    throw new Error('useCommandPalette must be used within a CommandProvider');
  }
  return context;
}

/**
 * Register a renderer-side handler for a command.
 * The handler runs when the command is executed from the palette or keyboard shortcut.
 */
export function useRegisterCommandHandler(commandId: string, handler: RendererCommandHandler): void {
  const { registerHandler } = useCommandPalette();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    return registerHandler(commandId, () => handlerRef.current());
  }, [commandId, registerHandler]);
}
