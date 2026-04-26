/**
 * Session Types
 *
 * Zod schemas for session state and metadata. Sessions represent a
 * 1:1 binding between a user conversation and a provider instance.
 *
 * @module agent-core/session
 */

import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// Session Status
// ─────────────────────────────────────────────────────────────────────────────

export const SessionStatusSchema = z.enum(['active', 'completed', 'crashed']);
export type SessionStatus = z.infer<typeof SessionStatusSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Session Record (as stored in SQLite)
// ─────────────────────────────────────────────────────────────────────────────

export const SessionRecordSchema = z.object({
  id: z.string(),
  providerId: z.string(),
  model: z.string().nullable(),
  cwd: z.string(),
  /** Provider's internal session ID (for resume) */
  providerSessionId: z.string().nullable(),
  /** Workstream this session belongs to (null for standalone sessions) */
  workstreamId: z.string().nullable(),
  status: SessionStatusSchema,
  createdAt: z.number(),
  lastActivityAt: z.number(),
  totalInputTokens: z.number(),
  totalOutputTokens: z.number(),
  /** Total cost in cents (integer math avoids floating point) */
  totalCostCents: z.number(),
});
export type SessionRecord = z.infer<typeof SessionRecordSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Event Record (as stored in SQLite — wraps an AgentEvent with metadata)
// ─────────────────────────────────────────────────────────────────────────────

export const EventRecordSchema = z.object({
  id: z.number(),
  sessionId: z.string(),
  eventType: z.string(),
  /** JSON-serialized AgentEvent */
  payload: z.string(),
  createdAt: z.number(),
});
export type EventRecord = z.infer<typeof EventRecordSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Session Directory
// ─────────────────────────────────────────────────────────────────────────────

export const SessionDirectorySchema = z.object({
  sessionId: z.string(),
  path: z.string(),
});
export type SessionDirectory = z.infer<typeof SessionDirectorySchema>;
