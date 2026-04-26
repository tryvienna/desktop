/**
 * Paste Markup Utilities
 *
 * Handles encoding/decoding of large paste blob markup embedded in message text.
 * Format: [paste://id?preview=b64&content=b64&chars=N&lines=N]
 *
 * @module chat-ui/utils/paste-markup
 */

// ─────────────────────────────────────────────────────────────────────────────
// Session-scoped paste content store
// ─────────────────────────────────────────────────────────────────────────────

const _sessionPasteStore = new Map<string, string>();

/** Persist paste content for the duration of the JS session. */
export function setSessionPasteContent(pasteId: string, content: string): void {
  _sessionPasteStore.set(pasteId, content);
}

/** Retrieve paste content from the session store. */
export function getSessionPasteContent(pasteId: string): string | undefined {
  return _sessionPasteStore.get(pasteId);
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

export const PASTE_CHAR_THRESHOLD = 500;
export const PASTE_LINE_THRESHOLD = 10;
export const PASTE_PREVIEW_LENGTH = 60;

const MAX_CONTENT_BYTES = 100 * 1024;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface PasteBlob {
  id: string;
  text: string;
  charCount: number;
  lineCount: number;
  preview: string;
}

export interface ParsedPasteMarkup {
  id: string;
  preview: string;
  content: string;
  charCount: number;
  lineCount: number;
}

export type PasteTextSegment =
  | { type: 'text'; content: string }
  | { type: 'paste'; paste: ParsedPasteMarkup; raw: string };

// ─────────────────────────────────────────────────────────────────────────────
// Encoding / Decoding
// ─────────────────────────────────────────────────────────────────────────────

/** Encode text to base64, handling Unicode correctly. */
export function encodePasteContent(text: string): string {
  if (typeof btoa === 'function') {
    return btoa(String.fromCodePoint(...new TextEncoder().encode(text)));
  }
  return Buffer.from(text, 'utf-8').toString('base64');
}

/** Decode base64 paste content. */
export function decodePasteContent(b64: string): string {
  try {
    if (typeof atob === 'function') {
      const binary = atob(b64);
      const bytes = Uint8Array.from(binary, (c) => c.codePointAt(0)!);
      return new TextDecoder().decode(bytes);
    }
    return Buffer.from(b64, 'base64').toString('utf-8');
  } catch {
    return '';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Markup Building
// ─────────────────────────────────────────────────────────────────────────────

/** Build the full paste markup string from a PasteBlob. */
export function buildPasteMarkup(blob: PasteBlob): string {
  const previewB64 = encodePasteContent(blob.preview);
  let contentToEncode = blob.text;
  const encoded = new TextEncoder().encode(blob.text);
  if (encoded.byteLength > MAX_CONTENT_BYTES) {
    const truncated = new TextDecoder().decode(encoded.slice(0, MAX_CONTENT_BYTES));
    contentToEncode = truncated + '\n\n[Content truncated — full text was sent to AI]';
  }
  const contentB64 = encodePasteContent(contentToEncode);
  return `[paste://${blob.id}?preview=${previewB64}&content=${contentB64}&chars=${blob.charCount}&lines=${blob.lineCount}]`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Parsing
// ─────────────────────────────────────────────────────────────────────────────

const PASTE_URI_PATTERN = /\[paste:\/\/([a-zA-Z0-9_-]+)\?([^\]]*)\]/g;

/** Check if text contains any paste markup. */
export function containsPasteMarkup(text: string): boolean {
  PASTE_URI_PATTERN.lastIndex = 0;
  return PASTE_URI_PATTERN.test(text);
}

/** Parse text into segments of plain text and paste blobs. */
export function parsePasteMarkup(text: string): PasteTextSegment[] {
  const segments: PasteTextSegment[] = [];
  let lastIndex = 0;

  PASTE_URI_PATTERN.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = PASTE_URI_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }
    const id = match[1];
    const params = new URLSearchParams(match[2]);
    segments.push({
      type: 'paste',
      paste: {
        id,
        preview: decodePasteContent(params.get('preview') ?? ''),
        content: decodePasteContent(params.get('content') ?? ''),
        charCount: parseInt(params.get('chars') ?? '0', 10),
        lineCount: parseInt(params.get('lines') ?? '0', 10),
      },
      raw: match[0],
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', content: text.slice(lastIndex) });
  }
  return segments;
}

/** Strip paste markup from text. */
export function stripPasteMarkup(text: string): string {
  PASTE_URI_PATTERN.lastIndex = 0;
  return text.replace(PASTE_URI_PATTERN, '');
}

/** Replace paste markup with decoded plain text content. */
export function decodePasteMarkupToPlainText(text: string): string {
  PASTE_URI_PATTERN.lastIndex = 0;
  return text.replace(PASTE_URI_PATTERN, (_match, _id, queryString) => {
    const params = new URLSearchParams(queryString);
    return decodePasteContent(params.get('content') ?? '');
  });
}
