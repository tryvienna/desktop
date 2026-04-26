/**
 * LSP IPC Contract — Methods + Events
 *
 * Defines the type-safe boundary between renderer and main process
 * for Language Server Protocol operations. All schemas are Zod-based
 * and validated automatically by the IPC framework.
 *
 * Safe to import from ANY process (main, preload, renderer, tests).
 */

import { z } from 'zod';
import { defineApi, defineEvents, method, event } from '@vienna/ipc';

// ─────────────────────────────────────────────────────────────────────────────
// Shared LSP Schemas
// ─────────────────────────────────────────────────────────────────────────────

const LspPositionSchema = z.object({
  line: z.number().describe('Zero-based line number'),
  character: z.number().describe('Zero-based character offset'),
});

const LspRangeSchema = z.object({
  start: LspPositionSchema,
  end: LspPositionSchema,
});

const LspLocationSchema = z.object({
  uri: z.string(),
  range: LspRangeSchema,
});

const LspDiagnosticSchema = z.object({
  range: LspRangeSchema,
  severity: z.number().optional().describe('1=Error, 2=Warning, 3=Info, 4=Hint'),
  code: z.union([z.number(), z.string()]).optional(),
  source: z.string().optional(),
  message: z.string(),
});

const LspTextEditSchema = z.object({
  range: LspRangeSchema,
  newText: z.string(),
});

const LspWorkspaceEditSchema = z.object({
  changes: z.record(z.array(LspTextEditSchema)).optional(),
  documentChanges: z
    .array(
      z.object({
        textDocument: z.object({
          uri: z.string(),
          version: z.number().nullable().optional(),
        }),
        edits: z.array(LspTextEditSchema),
      }),
    )
    .optional(),
});

const LspServerStatusSchema = z.object({
  projectId: z.string(),
  state: z.string(),
  openDocuments: z.number(),
});

// ─────────────────────────────────────────────────────────────────────────────
// API Methods (renderer → main, request/response)
// ─────────────────────────────────────────────────────────────────────────────

export const lspApi = defineApi({
  lsp: {
    /** Open a document with the LSP server */
    openDocument: method({
      input: z.object({
        uri: z.string().describe('Document URI (file:// protocol)'),
        languageId: z.string().describe('Language identifier'),
        text: z.string().describe('Initial document content'),
      }),
      output: z.object({ opened: z.boolean() }),
    }),

    /** Close a document with the LSP server */
    closeDocument: method({
      input: z.object({ uri: z.string() }),
      output: z.object({ success: z.boolean() }),
    }),

    /** Notify the LSP server of a document content change */
    changeDocument: method({
      input: z.object({
        uri: z.string(),
        text: z.string().describe('Full updated content'),
      }),
      output: z.object({ success: z.boolean() }),
    }),

    /** Notify the LSP server that a document was saved */
    saveDocument: method({
      input: z.object({
        uri: z.string(),
        text: z.string().optional().describe('Optional content for save notification'),
      }),
      output: z.object({ success: z.boolean() }),
    }),

    /** Get hover information at a position */
    getHover: method({
      input: z.object({ uri: z.string(), line: z.number(), character: z.number() }),
      output: z
        .object({
          contents: z.unknown().nullable(),
          range: LspRangeSchema.optional(),
        })
        .nullable(),
    }),

    /** Go to definition at a position */
    getDefinition: method({
      input: z.object({ uri: z.string(), line: z.number(), character: z.number() }),
      output: z.unknown().nullable(),
    }),

    /** Find all references at a position */
    getReferences: method({
      input: z.object({ uri: z.string(), line: z.number(), character: z.number() }),
      output: z.array(LspLocationSchema).nullable(),
    }),

    /** Get completions at a position */
    getCompletions: method({
      input: z.object({ uri: z.string(), line: z.number(), character: z.number() }),
      output: z.unknown().nullable(),
    }),

    /** Get signature help at a position */
    getSignatureHelp: method({
      input: z.object({ uri: z.string(), line: z.number(), character: z.number() }),
      output: z.unknown().nullable(),
    }),

    /** Get code actions for a range */
    getCodeActions: method({
      input: z.object({
        uri: z.string(),
        range: LspRangeSchema,
        context: z.object({ diagnostics: z.array(LspDiagnosticSchema) }),
      }),
      output: z.unknown().nullable(),
    }),

    /** Check if a symbol can be renamed */
    prepareRename: method({
      input: z.object({ uri: z.string(), line: z.number(), character: z.number() }),
      output: z.unknown().nullable(),
    }),

    /** Rename a symbol at a position */
    rename: method({
      input: z.object({
        uri: z.string(),
        line: z.number(),
        character: z.number(),
        newName: z.string(),
      }),
      output: LspWorkspaceEditSchema.nullable(),
    }),

    /** Get document symbols (outline) */
    getDocumentSymbols: method({
      input: z.object({ uri: z.string() }),
      output: z.unknown().nullable(),
    }),

    /** Get status of all LSP servers */
    getStatus: method({
      input: z.object({}),
      output: z.object({ servers: z.array(LspServerStatusSchema) }),
    }),

    /** Check if LSP server is ready for a project */
    isServerReady: method({
      input: z.object({ projectRoot: z.string() }),
      output: z.object({ ready: z.boolean() }),
    }),

    /** Detect project root for a file path */
    getProjectRoot: method({
      input: z.object({ filePath: z.string() }),
      output: z.object({ projectRoot: z.string().nullable() }),
    }),
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Events (main → renderer, streaming)
// ─────────────────────────────────────────────────────────────────────────────

export const lspEvents = defineEvents({
  lsp: {
    /** Diagnostics published for a document */
    onDiagnostics: event({
      payload: z.object({
        uri: z.string(),
        diagnostics: z.array(LspDiagnosticSchema),
      }),
    }),

    /** LSP server is ready for a project */
    onServerReady: event({
      payload: z.object({ projectRoot: z.string() }),
    }),

    /** LSP server stopped for a project */
    onServerStopped: event({
      payload: z.object({
        projectRoot: z.string(),
        reason: z.string().optional(),
      }),
    }),
  },
});
