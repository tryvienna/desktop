/**
 * Gemini CLI Protocol Schema — Zod validation for Gemini CLI NDJSON
 *
 * Gemini CLI (Google) uses a different protocol.
 * Messages follow a similar streaming pattern.
 *
 * @module agent-providers/gemini-cli/schema
 */

import { z } from 'zod';

const GeminiInitMessageSchema = z.object({
  type: z.literal('init'),
  session_id: z.string().optional(),
  model: z.string().optional(),
  tools: z.array(z.string()).optional(),
});

const GeminiContentDeltaSchema = z.object({
  type: z.literal('content_delta'),
  text: z.string(),
  role: z.enum(['model', 'system']).optional(),
});

const GeminiContentDoneSchema = z.object({
  type: z.literal('content_done'),
  text: z.string(),
});

const GeminiFunctionCallSchema = z.object({
  type: z.literal('function_call'),
  id: z.string(),
  name: z.string(),
  args: z.record(z.unknown()),
});

const GeminiFunctionResponseSchema = z.object({
  type: z.literal('function_response'),
  id: z.string(),
  output: z.string().optional(),
  error: z.string().optional(),
});

const GeminiErrorSchema = z.object({
  type: z.literal('error'),
  message: z.string(),
  code: z.string().optional(),
});

const GeminiTurnCompleteSchema = z.object({
  type: z.literal('turn_complete'),
  usage: z
    .object({
      prompt_tokens: z.number().optional(),
      completion_tokens: z.number().optional(),
    })
    .optional(),
});

export const GeminiInboundMessageSchema = z.discriminatedUnion('type', [
  GeminiInitMessageSchema,
  GeminiContentDeltaSchema,
  GeminiContentDoneSchema,
  GeminiFunctionCallSchema,
  GeminiFunctionResponseSchema,
  GeminiErrorSchema,
  GeminiTurnCompleteSchema,
]);

export type GeminiInboundMessage = z.infer<typeof GeminiInboundMessageSchema>;
