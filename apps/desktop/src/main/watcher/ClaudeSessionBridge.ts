/**
 * ClaudeSessionBridge — Bridges ClaudeSessionWatcher events into the plugin event system.
 *
 * Responsibilities:
 * 1. Registers all claude-session events as core plugin events (using Zod schemas)
 * 2. Starts the ClaudeSessionWatcher
 * 3. Forwards every watcher event to pluginSystem.emitCoreEvent()
 *
 * This is the single integration point between the standalone @vienna/claude-session
 * package and Vienna's plugin event system.
 */

import {
  ClaudeSessionWatcher,
  SESSION_EVENT_SCHEMAS,
  type ClaudeSessionWatcherOptions,
  type SessionEventName,
} from '@vienna/claude-session';
import { defineEvent, type PluginSystem, type PluginLogger } from '@tryvienna/sdk';

/** Event name prefix for claude-session events in the plugin system. */
const EVENT_PREFIX = 'claude-code';

/** Maps session event names to fully-qualified core event names. */
function qualifiedName(eventName: SessionEventName): string {
  return `core.${EVENT_PREFIX}.${eventName}`;
}

/** Human-readable descriptions for each event. */
const EVENT_DESCRIPTIONS: Record<SessionEventName, string> = {
  'session.started': 'A Claude Code CLI session started (first user message detected)',
  'turn.started': 'A user sent a prompt in a Claude Code CLI session',
  'turn.completed': 'Claude finished responding in a CLI session (end_turn)',
  'tool.used': 'Claude called one or more tools in a CLI session',
  'tool.result': 'A tool returned its result in a CLI session',
  'plan.accepted': 'A user accepted a plan in a Claude Code CLI session',
  'pr.created': 'A PR was created in a Claude Code CLI session',
};

export interface ClaudeSessionBridgeOptions {
  pluginSystem: PluginSystem;
  logger: PluginLogger;
  /** Override watch path for testing. Defaults to ~/.claude/projects. */
  watchPath?: string;
  /** Debounce interval in ms. Default: 200. */
  debounceMs?: number;
}

export class ClaudeSessionBridge {
  private readonly watcher: ClaudeSessionWatcher;
  private readonly pluginSystem: PluginSystem;
  private readonly logger: PluginLogger;

  constructor(options: ClaudeSessionBridgeOptions) {
    this.pluginSystem = options.pluginSystem;
    this.logger = options.logger;

    // Register all session events as core plugin events
    const eventNames = Object.keys(SESSION_EVENT_SCHEMAS) as SessionEventName[];
    for (const name of eventNames) {
      const schema = SESSION_EVENT_SCHEMAS[name];
      const qualified = `${EVENT_PREFIX}.${name}`;

      this.pluginSystem.registerCoreEvent(
        defineEvent({
          name: qualified,
          description: EVENT_DESCRIPTIONS[name],
          schema,
        }),
      );
    }

    this.logger.info('Registered claude-session events', {
      count: eventNames.length,
      events: eventNames.map((n) => qualifiedName(n)),
    });

    // Create watcher
    const watcherOptions: ClaudeSessionWatcherOptions = {
      watchPath: options.watchPath,
      debounceMs: options.debounceMs,
      onError: (err) => {
        this.logger.error('ClaudeSessionWatcher error', {
          error: err instanceof Error ? err.message : String(err),
        });
      },
      onLog: (msg, data) => {
        this.logger.debug(`[claude-session] ${msg}`, data);
      },
    };

    this.watcher = new ClaudeSessionWatcher(watcherOptions);

    // Bridge: forward every watcher event to the plugin system
    this.watcher.events.onAny((eventName, payload) => {
      const qualified = qualifiedName(eventName as SessionEventName);
      try {
        this.pluginSystem.emitCoreEvent(qualified, payload);
      } catch (err) {
        this.logger.error(`Failed to emit ${qualified}`, {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    });
  }

  /** Start watching Claude Code session files. */
  async start(): Promise<void> {
    await this.watcher.start();
    this.logger.info('ClaudeSessionBridge started', {
      trackedSessions: this.watcher.trackedSessionCount,
    });
  }

  /** Stop watching and clean up. */
  async stop(): Promise<void> {
    await this.watcher.stop();
    this.logger.info('ClaudeSessionBridge stopped');
  }

  /** Whether the bridge is actively watching. */
  get isRunning(): boolean {
    return this.watcher.isRunning;
  }
}
