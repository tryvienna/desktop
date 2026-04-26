/**
 * MCP Socket Server Types
 *
 * Protocol types for the NDJSON communication between the MCP server process
 * (@vienna/mcp-entities, spawned by Claude CLI) and the Electron main process.
 *
 * Protocol:
 *   Request:  {"id":"uuid","method":"entity.search","params":{...}}\n
 *   Response: {"id":"uuid","result":{...}}\n
 *             {"id":"uuid","error":{"code":"...","message":"..."}}\n
 */

import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// Request / Response
// ─────────────────────────────────────────────────────────────────────────────

export const MCPRequestSchema = z.object({
  id: z.string(),
  method: z.string(),
  params: z.record(z.unknown()).optional(),
});

export type MCPRequest = z.infer<typeof MCPRequestSchema>;

export interface MCPResponse {
  id: string;
  result?: unknown;
  error?: { code: string; message: string };
}

// ─────────────────────────────────────────────────────────────────────────────
// Error Codes
// ─────────────────────────────────────────────────────────────────────────────

export const MCPErrorCode = {
  INVALID_REQUEST: 'INVALID_REQUEST',
  METHOD_NOT_FOUND: 'METHOD_NOT_FOUND',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────────────────────

/** A handler receives validated params and returns a result (or throws). */
export type MCPHandler = (params: Record<string, unknown>) => Promise<unknown>;
