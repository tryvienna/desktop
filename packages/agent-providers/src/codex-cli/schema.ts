/**
 * Codex CLI Protocol Schema — Zod validation for Codex CLI NDJSON
 *
 * Codex CLI (OpenAI) uses a different protocol than Claude Code.
 * Messages are NDJSON lines with these types:
 * - system: Session initialization
 * - message: Streaming text/tool content
 * - tool_call: Tool invocation
 * - tool_result: Tool execution result
 * - error: Error event
 * - done: Turn completion
 *
 * @module agent-providers/codex-cli/schema
 */

import { z } from 'zod';

// ─── Codex NDJSON message types ───────────────────────────────────────────

const CodexSystemMessageSchema = z.object({
  type: z.literal('system'),
  session_id: z.string().optional(),
  model: z.string().optional(),
  tools: z.array(z.string()).optional(),
  cwd: z.string().optional(),
});

const CodexTextDeltaSchema = z.object({
  type: z.literal('message'),
  role: z.enum(['assistant', 'system']),
  content: z.string(),
  done: z.boolean().optional(),
});

const CodexToolCallSchema = z.object({
  type: z.literal('tool_call'),
  id: z.string(),
  name: z.string(),
  arguments: z.string(), // JSON string of tool arguments
});

const CodexToolResultSchema = z.object({
  type: z.literal('tool_result'),
  tool_call_id: z.string(),
  output: z.string().optional(),
  error: z.string().optional(),
});

const CodexErrorSchema = z.object({
  type: z.literal('error'),
  message: z.string(),
  code: z.string().optional(),
});

const CodexDoneSchema = z.object({
  type: z.literal('done'),
  usage: z
    .object({
      input_tokens: z.number().optional(),
      output_tokens: z.number().optional(),
      total_tokens: z.number().optional(),
    })
    .optional(),
});

export const CodexInboundMessageSchema = z.discriminatedUnion('type', [
  CodexSystemMessageSchema,
  CodexTextDeltaSchema,
  CodexToolCallSchema,
  CodexToolResultSchema,
  CodexErrorSchema,
  CodexDoneSchema,
]);

export type CodexInboundMessage = z.infer<typeof CodexInboundMessageSchema>;
