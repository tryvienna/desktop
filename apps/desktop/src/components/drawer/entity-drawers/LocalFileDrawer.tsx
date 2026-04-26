/**
 * LocalFileDrawer — Entity drawer for local_file entities.
 *
 * Renders the Monaco editor inside the entity drawer system,
 * so local file entities open the same tabbed editor as the file palette.
 *
 * @ai-context
 * - Extracts file path from the entity URI path segments
 * - Reuses EditorDrawerPanel internals (Monaco, file I/O, LSP)
 * - Lazy-loaded via EntityDrawerRouter like all entity drawers
 */

import { Suspense, lazy } from 'react';
import { parseEntityURI } from '@vienna/chat-ui';
import { fileEditorContent } from '../content';

const LazyEditorDrawerPanel = lazy(() =>
  import('../EditorDrawerPanel').then((m) => ({ default: m.EditorDrawerPanel }))
);

export function LocalFileDrawer({ uri }: { uri: string }) {
  const parsed = parseEntityURI(uri);
  // pathSegments splits by "/" and filters empty strings, losing the leading "/"
  // from absolute paths. Restore it for proper file system access.
  const joined = parsed?.pathSegments.join('/') ?? '';
  const filePath = joined && !joined.startsWith('/') ? `/${joined}` : joined;

  if (!filePath) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-neutral-500">
        Invalid file path
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center text-sm text-neutral-500">
          Loading editor...
        </div>
      }
    >
      <LazyEditorDrawerPanel content={fileEditorContent(filePath)} />
    </Suspense>
  );
}
