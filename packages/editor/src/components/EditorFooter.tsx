/**
 * EditorFooter — Status bar showing file metadata.
 *
 * Displays file path, encoding, and language at the bottom
 * of the editor panel.
 *
 * @module editor/components/EditorFooter
 */

export interface EditorFooterProps {
  /** The file path to display. */
  filePath: string;
  /** The detected language name. */
  language: string;
  /** Current cursor line number (1-based). */
  line?: number;
  /** Current cursor column (1-based). */
  column?: number;
}

export function EditorFooter(props: EditorFooterProps) {
  const { filePath, language, line, column } = props;

  return (
    <div
      className="flex items-center justify-between border-t border-neutral-700 px-3 py-1 text-xs text-neutral-500"
      data-slot="editor-footer"
    >
      <span className="truncate">{filePath}</span>
      <div className="flex items-center gap-3 shrink-0">
        {line != null && column != null && (
          <span>Ln {line}, Col {column}</span>
        )}
        <span>UTF-8</span>
        <span>{language}</span>
      </div>
    </div>
  );
}
