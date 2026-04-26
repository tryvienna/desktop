/**
 * AgentProvider — The Provider Interface
 *
 * Defines the behavioral contract that every AI provider must implement.
 * Data types use Zod schemas; the interface itself uses TypeScript
 * (Zod can't express methods/callbacks).
 *
 * @module agent-core/provider
 */

import { z } from 'zod';
import type { AgentEvent } from './events';
import type { UserMessage } from './messages';
import { MCPServerConfigSchema } from './messages';

// ─────────────────────────────────────────────────────────────────────────────
// Provider State
// ─────────────────────────────────────────────────────────────────────────────

export const ProviderStateSchema = z.enum([
  'idle',
  'starting',
  'running',
  'stopping',
  'stopped',
  'crashed',
]);
export type ProviderState = z.infer<typeof ProviderStateSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Session Configuration
// ─────────────────────────────────────────────────────────────────────────────

export const SessionConfigSchema = z.object({
  /** Resume an existing provider session (e.g., Claude's --resume flag) */
  sessionId: z.string().optional(),
  /** Model to use (provider-specific identifier) */
  model: z.string().optional(),
  /** Working directory for the agent */
  cwd: z.string(),
  /** Additional directories the agent can access */
  directories: z.array(z.string()),
  /** System prompt prepended to the conversation */
  systemPrompt: z.string().optional(),
  /** System prompt appended after the main prompt */
  appendSystemPrompt: z.string().optional(),
  /** MCP server configurations */
  mcpServers: z.record(MCPServerConfigSchema).optional(),
  /** Extra environment variables for the provider process */
  env: z.record(z.string()).optional(),
  /** Inactivity timeout in milliseconds */
  timeout: z.number().optional(),
});
export type SessionConfig = z.infer<typeof SessionConfigSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Permission Response (from user → provider)
// ─────────────────────────────────────────────────────────────────────────────

export const PermissionResponseSchema = z.object({
  behavior: z.enum(['allow', 'deny']),
  scope: z.enum(['once', 'session', 'permanent']),
  /** Directories to add to the allowed list */
  directories: z.array(z.string()).optional(),
  /** Modified tool input (e.g., user edited a command before approving) */
  updatedInput: z.record(z.unknown()).optional(),
  /** Feedback message (e.g., user comments when denying a plan) */
  message: z.string().optional(),
});
export type PermissionResponse = z.infer<typeof PermissionResponseSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Provider Info (for listing available providers)
// ─────────────────────────────────────────────────────────────────────────────

export const ProviderInfoSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  available: z.boolean(),
  version: z.string().optional(),
  error: z.string().optional(),
});
export type ProviderInfo = z.infer<typeof ProviderInfoSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Availability Check Result
// ─────────────────────────────────────────────────────────────────────────────

export const AvailabilityResultSchema = z.object({
  available: z.boolean(),
  version: z.string().optional(),
  error: z.string().optional(),
});
export type AvailabilityResult = z.infer<typeof AvailabilityResultSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// AgentProvider Interface (behavioral — can't be a Zod schema)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The contract every AI provider must implement.
 *
 * Lifecycle: idle → starting → running ⇄ stopping → stopped
 *                                      → crashed
 */
export interface AgentProvider {
  /** Unique provider identifier (e.g., 'claude-code', 'codex-cli') */
  readonly id: string;

  /** Human-readable name (e.g., 'Claude Code', 'Codex CLI') */
  readonly displayName: string;

  /** Current lifecycle state */
  readonly state: ProviderState;

  /** Start the provider with the given session configuration */
  start(config: SessionConfig): Promise<void>;

  /** Gracefully stop the provider */
  stop(): Promise<void>;

  /** Check if the provider's CLI/SDK is available on this system */
  checkAvailability(): Promise<AvailabilityResult>;

  /** Send a user message to the running provider */
  sendMessage(message: UserMessage): void;

  /** Respond to a tool permission request */
  respondPermission(requestId: string, response: PermissionResponse): void;

  /** Interrupt the current generation */
  interrupt(): void;

  /** Subscribe to AgentEvents. Returns an unsubscribe function. */
  onEvent(callback: (event: AgentEvent) => void): () => void;

  /** Subscribe to raw debug output (stderr). Returns an unsubscribe function. */
  onDebug(callback: (data: string) => void): () => void;

  /** Check if the provider process is healthy */
  isHealthy(): boolean;
}
