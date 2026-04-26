/**
 * LSP Queries — GraphQL query fields for LSP server status.
 *
 * @module graphql/domains/lsp/queries
 */

import { builder } from '../../schema/builder';
import { LspServerStatusRef } from './types';

builder.queryFields((t) => ({
  lspServers: t.field({
    type: [LspServerStatusRef],
    description: 'List all active LSP server instances and their status',
    resolve: (_root, _args, ctx) => ctx.lspStatus?.getStatus() ?? [],
  }),
}));
