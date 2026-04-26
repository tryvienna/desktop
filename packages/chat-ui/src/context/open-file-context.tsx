/**
 * OpenFileContext — Optional callback for opening files in the host app's editor
 *
 * @ai-context
 * - Provided by the host app (desktop) to enable "open in editor" from chat-ui components
 * - Returns null when no host provides the callback (e.g. in storybook or web)
 */

import { createContext, useContext } from 'react';

type OpenFileCallback = (filePath: string) => void;

const OpenFileCtx = createContext<OpenFileCallback | null>(null);

export const OpenFileProvider = OpenFileCtx.Provider;

/** Access the open-file-in-editor callback. Returns null if not provided by the host app. */
export function useOpenFile(): OpenFileCallback | null {
  return useContext(OpenFileCtx);
}
