/**
 * Inbox Action IPC Contract — Coroutine-style action handlers with form prompts.
 *
 * Flow:
 *   1. Renderer calls inboxAction.execute(actionId, payload)
 *   2. Main starts handler, handler may call ctx.prompt(formSpec)
 *   3. Main emits inboxAction.onPrompt → renderer shows action form bar
 *   4. User fills form → renderer calls inboxAction.respond(sessionId, answers)
 *   5. Main resumes handler with answers
 *   6. Handler completes → main emits inboxAction.onComplete
 *   7. Or handler shows a result screen → main emits inboxAction.onResult
 */

import { z } from 'zod';
import { defineApi, defineEvents, method, event } from '@vienna/ipc';

// ── Form schemas ──────────────────────────────────────────────────────────

const FormOptionSchema = z.object({
  value: z.string(),
  label: z.string(),
  description: z.string().optional(),
});

const FormStepSchema = z.object({
  id: z.string(),
  type: z.enum(['text', 'select', 'confirm']),
  header: z.string(),
  question: z.string(),
  placeholder: z.string().optional(),
  defaultValue: z.string().optional(),
  required: z.boolean().optional(),
  skippable: z.boolean().optional(),
  options: z.array(FormOptionSchema).optional(),
  confirmLabel: z.string().optional(),
  denyLabel: z.string().optional(),
});

const FormSpecSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  icon: z.string().optional(),
  steps: z.array(FormStepSchema),
});

export type InboxActionFormSpec = z.infer<typeof FormSpecSchema>;
export type InboxActionFormStep = z.infer<typeof FormStepSchema>;

// ── Result screen schemas ─────────────────────────────────────────────────

const ResultActionSchema = z.object({
  /** Unique ID for this action button. */
  id: z.string(),
  /** Button label. */
  label: z.string(),
  /** Visual style. */
  variant: z.enum(['primary', 'secondary', 'ghost']).optional(),
});

const ResultSpecSchema = z.object({
  /** 'success' shows animated checkmark, 'error' shows animated X. */
  status: z.enum(['success', 'error']),
  /** Large heading text (e.g., "Task TASK-42 created successfully!"). */
  title: z.string(),
  /** Optional secondary description text. */
  description: z.string().optional(),
  /** Action buttons shown below the message. Empty = auto-dismiss after delay. */
  actions: z.array(ResultActionSchema).optional(),
});

export type InboxActionResultSpec = z.infer<typeof ResultSpecSchema>;
export type InboxActionResultAction = z.infer<typeof ResultActionSchema>;

// ── API (renderer → main) ─────────────────────────────────────────────────

export const inboxActionApi = defineApi({
  inboxAction: {
    execute: method({
      input: z.object({ actionId: z.string(), payload: z.unknown() }),
      output: z.object({ sessionId: z.string() }),
    }),
    respond: method({
      input: z.object({ sessionId: z.string(), answers: z.record(z.string()) }),
      output: z.object({ success: z.boolean() }),
    }),
    cancel: method({
      input: z.object({ sessionId: z.string() }),
      output: z.object({ success: z.boolean() }),
    }),
    /** User clicked an action button on the result screen. */
    respondResult: method({
      input: z.object({ sessionId: z.string(), actionId: z.string() }),
      output: z.object({ success: z.boolean() }),
    }),
  },
});

// ── Events (main → renderer) ──────────────────────────────────────────────

export const inboxActionEvents = defineEvents({
  inboxAction: {
    onPrompt: event({
      payload: z.object({ sessionId: z.string(), form: FormSpecSchema }),
    }),
    /** Handler wants to show a result screen (success/error with actions). */
    onResult: event({
      payload: z.object({ sessionId: z.string(), result: ResultSpecSchema }),
    }),
    onComplete: event({
      payload: z.object({ sessionId: z.string() }),
    }),
    onError: event({
      payload: z.object({ sessionId: z.string(), error: z.string() }),
    }),
  },
});
