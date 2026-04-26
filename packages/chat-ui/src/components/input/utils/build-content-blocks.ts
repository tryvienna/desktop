/**
 * Build structured content blocks from text and attachments.
 *
 * Converts image attachments (which have previewUrl data URLs) into
 * base64 image content blocks that the Claude API can understand.
 * Non-image attachments are appended as text metadata (existing behavior).
 */

import type { Attachment } from '../../../types/input';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface TextContentBlock {
  type: 'text';
  text: string;
}

export interface ImageContentBlock {
  type: 'image';
  source: {
    type: 'base64';
    media_type: string;
    data: string;
  };
}

export type ContentBlock = TextContentBlock | ImageContentBlock;

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extract base64 data and media type from a data URL.
 *
 * @example
 * extractBase64FromDataUrl('data:image/png;base64,iVBOR...')
 * // → { mediaType: 'image/png', data: 'iVBOR...' }
 */
export function extractBase64FromDataUrl(
  dataUrl: string
): { mediaType: string; data: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return { mediaType: match[1], data: match[2] };
}

/**
 * Build content blocks from plain text and attachments.
 *
 * - Images with a `previewUrl` (data URL) are converted to base64 image blocks.
 * - Non-image attachments are appended as text metadata lines.
 * - Returns `null` when there are no image attachments (caller should use the plain text path).
 */
export function buildContentBlocks(text: string, attachments: Attachment[]): ContentBlock[] | null {
  const imageAttachments = attachments.filter(
    (a) => a.mimeType.startsWith('image/') && a.previewUrl
  );
  const nonImageAttachments = attachments.filter(
    (a) => !a.mimeType.startsWith('image/') || !a.previewUrl
  );

  // No image attachments → caller should use the plain text path
  if (imageAttachments.length === 0) return null;

  const blocks: ContentBlock[] = [];

  // Text block (with non-image attachment metadata appended if any)
  let textContent = text;
  if (nonImageAttachments.length > 0) {
    textContent = textContent.trim();
    textContent +=
      '\n\nAttachments:\n' +
      nonImageAttachments
        .map((a) => {
          const path = a.path || a.name;
          const sizeMB = (a.size / (1024 * 1024)).toFixed(1);
          return `- ${path} (${a.mimeType}, ${sizeMB} MB)`;
        })
        .join('\n');
  }

  if (textContent.trim()) {
    blocks.push({ type: 'text', text: textContent });
  }

  // Image blocks
  for (const img of imageAttachments) {
    const extracted = extractBase64FromDataUrl(img.previewUrl!);
    if (extracted) {
      blocks.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: extracted.mediaType,
          data: extracted.data,
        },
      });
    }
  }

  return blocks.length > 0 ? blocks : null;
}
