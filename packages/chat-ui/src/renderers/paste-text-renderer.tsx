/**
 * PasteTextRenderer — Renders text with [paste://id?...] markup as inline chips
 *
 * @ai-context
 * - Parses paste:// markup into clickable inline chips
 * - Click delegates to PasteEditorProvider handler to open paste in a drawer
 * - Registered at priority 15 (before entity text)
 * - data-slot="paste-text-renderer"
 *
 * @example
 * <PasteTextRenderer content={{ type: 'text', text: 'See [paste://abc?...]' }} messageId="m1" isStreaming={false} />
 */

import React, { memo, useMemo, useCallback, useContext, createContext } from 'react';

import type { TextBlock } from '../types/messages';
import type { RendererProps, RendererDefinition } from './registry';
import {
  parsePasteMarkup,
  containsPasteMarkup,
  type ParsedPasteMarkup,
} from '../utils/paste-markup';

// ─── Paste Editor Context ────────────────────────────────────────────────────

type PasteOpenHandler = (paste: ParsedPasteMarkup) => void;

const PasteEditorContext = createContext<PasteOpenHandler | undefined>(undefined);

/**
 * Provider for handling paste chip clicks. The host app provides a handler
 * that opens the paste content in a drawer.
 */
export function PasteEditorProvider({
  onPasteOpen,
  children,
}: {
  onPasteOpen: PasteOpenHandler;
  children: React.ReactNode;
}) {
  return <PasteEditorContext.Provider value={onPasteOpen}>{children}</PasteEditorContext.Provider>;
}

// ─── Paste Chip Classes (cyan/teal via design tokens) ────────────────────────

// ─── Inline Paste Chip ───────────────────────────────────────────────────────

const InlinePasteChip = memo(function InlinePasteChip({ paste }: { paste: ParsedPasteMarkup }) {
  const onPasteOpen = useContext(PasteEditorContext);

  const truncatedPreview =
    paste.preview.length > 40 ? paste.preview.slice(0, 40) + '…' : paste.preview;

  const handleClick = useCallback(() => {
    onPasteOpen?.(paste);
  }, [onPasteOpen, paste]);

  return (
    <span
      className="paste-chip inline-flex items-center gap-[5px] px-2 py-0.5 rounded text-[0.88em] font-inherit align-baseline mx-0.5 select-none whitespace-nowrap cursor-pointer leading-[1.4] bg-brand-500/12 text-brand border border-brand-500/30"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      title="Click to view pasted content"
      aria-label={`Pasted text: ${paste.charCount.toLocaleString()} characters, ${paste.lineCount} lines`}
    >
      <span style={{ fontSize: '0.85em', lineHeight: 1, flexShrink: 0 }}>📋</span>
      <span
        style={{
          maxWidth: '180px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {truncatedPreview}
      </span>
      <span style={{ opacity: 0.65, fontSize: '0.85em', flexShrink: 0 }}>
        {paste.charCount.toLocaleString()} chars · {paste.lineCount} lines
      </span>
    </span>
  );
});

// ─── Main Component ──────────────────────────────────────────────────────────

export const PasteTextRenderer = memo(function PasteTextRenderer({
  content,
  isStreaming,
}: RendererProps<TextBlock>) {
  const segments = useMemo(() => parsePasteMarkup(content.text), [content.text]);

  return (
    <div data-slot="paste-text-renderer" data-renderer="paste-text" data-streaming={isStreaming}>
      {segments.map((segment, index) => {
        if (segment.type === 'text') {
          return (
            <span key={index} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {segment.content}
            </span>
          );
        }

        return <InlinePasteChip key={index} paste={segment.paste} />;
      })}
    </div>
  );
});

// ─── Registration ────────────────────────────────────────────────────────────

export const pasteTextRendererDefinition: RendererDefinition<TextBlock> = {
  id: 'paste-text',
  match: (content): content is TextBlock =>
    content.type === 'text' && containsPasteMarkup((content as TextBlock).text),
  component: PasteTextRenderer,
  priority: 15,
};
