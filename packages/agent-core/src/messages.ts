/**
 * Message & Content Types
 *
 * Zod schemas for user-facing message content blocks. These are used by the
 * chat UI to render messages and by the IPC layer to pass user input.
 *
 * Separate from events.ts because these represent the *rendered* message
 * model, not the streaming event protocol.
 *
 * @module agent-core/messages
 */

import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// Content Blocks (for user messages sent to providers)
// ─────────────────────────────────────────────────────────────────────────────

export const TextContentBlockSchema = z.object({
  type: z.literal('text'),
  text: z.string(),
});
export type TextContentBlock = z.infer<typeof TextContentBlockSchema>;

export const ImageContentBlockSchema = z.object({
  type: z.literal('image'),
  mimeType: z.string(),
  /** Base64-encoded image data */
  data: z.string(),
  name: z.string().optional(),
});
export type ImageContentBlock = z.infer<typeof ImageContentBlockSchema>;

export const ContentBlockSchema = z.discriminatedUnion('type', [
  TextContentBlockSchema,
  ImageContentBlockSchema,
]);
export type ContentBlock = z.infer<typeof ContentBlockSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// User Message (sent from renderer to provider via SessionManager)
// ─────────────────────────────────────────────────────────────────────────────

export const UserMessageSchema = z.object({
  text: z.string(),
  contentBlocks: z.array(ContentBlockSchema).optional(),
});
export type UserMessage = z.infer<typeof UserMessageSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// MCP Server Configuration
// ─────────────────────────────────────────────────────────────────────────────

export const MCPServerConfigSchema = z.object({
  command: z.string(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string()).optional(),
});
export type MCPServerConfig = z.infer<typeof MCPServerConfigSchema>;
