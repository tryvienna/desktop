/**
 * LSP IPC Handlers — Main-process implementation.
 *
 * Delegates all methods to LspManager.
 * Only import this from the main process.
 */

import type { ApiHandlers } from '@vienna/ipc';
import type { LspManager } from '../../main/lsp/LspManager';
import type { lspApi } from './contract';

/** Convert readonly LSP WorkspaceEdit to mutable form expected by IPC contract. */
type DeepMutable<T> = T extends ReadonlyArray<infer U>
  ? Array<DeepMutable<U>>
  : T extends object
    ? { -readonly [K in keyof T]: DeepMutable<T[K]> }
    : T;

export function createLspHandlers(lspManager: LspManager): ApiHandlers<typeof lspApi> {
  return {
    lsp: {
      openDocument: async ({ uri, languageId, text }) => lspManager.openDocument(uri, languageId, text),

      closeDocument: async ({ uri }) => lspManager.closeDocument(uri),

      changeDocument: async ({ uri, text }) => lspManager.changeDocument(uri, text),

      saveDocument: async ({ uri, text }) => lspManager.saveDocument(uri, text),

      getHover: async ({ uri, line, character }) => lspManager.getHover(uri, line, character),

      getDefinition: async ({ uri, line, character }) => lspManager.getDefinition(uri, line, character),

      getReferences: async ({ uri, line, character }) => lspManager.getReferences(uri, line, character),

      getCompletions: async ({ uri, line, character }) => lspManager.getCompletions(uri, line, character),

      getSignatureHelp: async ({ uri, line, character }) => lspManager.getSignatureHelp(uri, line, character),

      getCodeActions: async ({ uri, range, context }) =>
        lspManager.getCodeActions(uri, range, { diagnostics: context.diagnostics }),

      prepareRename: async ({ uri, line, character }) => lspManager.prepareRename(uri, line, character),

      rename: async ({ uri, line, character, newName }) => {
        const result = await lspManager.rename(uri, line, character, newName);
        // LSP types use readonly arrays; IPC contract expects mutable. The data is identical.
        return result as DeepMutable<typeof result>;
      },

      getDocumentSymbols: async ({ uri }) => lspManager.getDocumentSymbols(uri),

      getStatus: async () => ({ servers: lspManager.getStatus() }),

      isServerReady: async ({ projectRoot }) => ({ ready: lspManager.isServerReady(projectRoot) }),

      getProjectRoot: async ({ filePath }) => ({ projectRoot: await lspManager.detectProjectRoot(filePath) }),
    },
  };
}
