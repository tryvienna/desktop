/**
 * LSP GraphQL Types — Pothos object types for LSP server status.
 *
 * @module graphql/domains/lsp/types
 */

import { builder } from '../../schema/builder';

// ---------------------------------------------------------------------------
// Backing model types (no package dep — defined inline)
// ---------------------------------------------------------------------------

interface LspServerStatusModel {
  projectRoot: string;
  state: string;
  openDocuments: number;
}

// ---------------------------------------------------------------------------
// Object types
// ---------------------------------------------------------------------------

export const LspServerStatusRef = builder.objectRef<LspServerStatusModel>('LspServerStatus');

builder.objectType(LspServerStatusRef, {
  description: 'Status of an active LSP server instance',
  fields: (t) => ({
    projectRoot: t.exposeString('projectRoot', {
      description: 'The project root directory this server manages',
    }),
    state: t.exposeString('state', {
      description: 'Server lifecycle state (stopped, starting, ready, error)',
    }),
    openDocuments: t.exposeInt('openDocuments', {
      description: 'Number of documents currently open in this server',
    }),
  }),
});
