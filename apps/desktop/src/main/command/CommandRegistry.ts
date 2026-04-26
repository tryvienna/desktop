/**
 * CommandRegistry — Main process command catalog and execution router.
 *
 * @ai-context
 * Pure class with dependency injection (no singletons, no Electron imports).
 * Manages the command catalog and routes execution to registered handlers.
 *
 * Commands are registered via `register()` (static catalog at startup,
 * dynamic commands from agent init). Execution handlers are registered
 * separately via `registerHandler()` to keep definition and execution decoupled.
 *
 * Emits GraphQL cache invalidation events so the renderer
 * refetches the command catalog when it changes.
 *
 * @module main/command/CommandRegistry
 */

import type { CommandDefinition, CommandResultAction } from '../../command/schemas';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/** Handler function for a command. Returns a result action for the renderer. */
export type CommandHandler = (
  args?: Record<string, unknown>
) => Promise<CommandResultAction>;

/** Listener for catalog change events. */
export type CatalogUpdatedListener = () => void;

/** Minimal logger interface (subset of MainLogger). */
export interface CommandRegistryLogger {
  info(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
  error(msg: string, meta?: Record<string, unknown>): void;
}

/** Emitter for GraphQL cache invalidation when the catalog changes. */
export interface CommandRegistryEmitter {
  onInvalidate(payload: { typename: string; id?: string }): void;
}

export interface CommandRegistryOptions {
  logger: CommandRegistryLogger;
  emitter?: CommandRegistryEmitter;
}

// ═══════════════════════════════════════════════════════════════════════════════
// REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

export class CommandRegistry {
  private commands = new Map<string, CommandDefinition>();
  private handlers = new Map<string, CommandHandler>();
  private listeners: CatalogUpdatedListener[] = [];
  private readonly logger: CommandRegistryLogger;
  private readonly emitter?: CommandRegistryEmitter;

  constructor(options: CommandRegistryOptions) {
    this.logger = options.logger;
    this.emitter = options.emitter;
  }

  // ─── Catalog Management ────────────────────────────────────────────────

  /** Register one or more commands. Overwrites existing commands with the same ID. */
  register(commands: CommandDefinition[]): void {
    for (const cmd of commands) {
      this.commands.set(cmd.id, cmd);
    }
    this.notifyCatalogUpdated();
  }

  /** Remove all commands whose ID starts with `prefix`. */
  unregister(prefix: string): void {
    let removed = 0;
    for (const id of this.commands.keys()) {
      if (id.startsWith(prefix)) {
        this.commands.delete(id);
        this.handlers.delete(id);
        removed++;
      }
    }
    if (removed > 0) {
      this.notifyCatalogUpdated();
    }
  }

  /** Get the full catalog, optionally filtered by category. */
  getCatalog(categoryFilter?: string): CommandDefinition[] {
    const all = Array.from(this.commands.values());
    if (!categoryFilter) return all;
    return all.filter((c) => c.category === categoryFilter);
  }

  /** Get a single command by ID. */
  getCommand(id: string): CommandDefinition | undefined {
    return this.commands.get(id);
  }

  // ─── Handler Registration ──────────────────────────────────────────────

  /** Register an execution handler for a command ID. */
  registerHandler(commandId: string, handler: CommandHandler): void {
    this.handlers.set(commandId, handler);
  }

  /** Register handlers for multiple commands at once. */
  registerHandlers(handlers: Record<string, CommandHandler>): void {
    for (const [id, handler] of Object.entries(handlers)) {
      this.handlers.set(id, handler);
    }
  }

  // ─── Execution ─────────────────────────────────────────────────────────

  /** Execute a command by ID. Returns the result action for the renderer. */
  async execute(
    commandId: string,
    args?: Record<string, unknown>
  ): Promise<{ success: boolean; error?: string; action?: CommandResultAction }> {
    const command = this.commands.get(commandId);
    if (!command) {
      this.logger.warn('Command not found', { commandId });
      return { success: false, error: `Unknown command: ${commandId}` };
    }

    if (command.disabled) {
      return {
        success: false,
        error: command.disabledReason ?? `Command is disabled: ${commandId}`,
      };
    }

    const handler = this.handlers.get(commandId);
    if (!handler) {
      // Commands without handlers are renderer-only (palette handles them via flows)
      this.logger.info('No handler for command (renderer-only)', { commandId });
      return { success: true, action: { type: 'none' } };
    }

    try {
      const action = await handler(args);
      return { success: true, action };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error('Command execution failed', { commandId, error: message });
      return { success: false, error: message };
    }
  }

  // ─── Events ────────────────────────────────────────────────────────────

  /** Subscribe to catalog update events. Returns unsubscribe function. */
  onCatalogUpdated(listener: CatalogUpdatedListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyCatalogUpdated(): void {
    // Notify local listeners
    for (const listener of this.listeners) {
      listener();
    }
    // Invalidate GraphQL cache so renderer refetches active command queries
    this.emitter?.onInvalidate({ typename: 'Command' });
  }
}
