/**
 * Entity URI Utilities
 *
 * Parsing and building entity URIs for inline chips and block cards.
 *
 * URI Format: [@vienna//entity_type/path?label=base64]
 * - Single brackets for inline chips
 * - Double brackets for block cards: [[@vienna//...]]
 *
 * @module chat-ui/utils/entity-uri
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type EntityDisplayMode = 'inline' | 'card';

export interface ParsedEntityURI {
  uri: string;
  entityType: string;
  pathSegments: string[];
  label?: string;
  detachable?: boolean;
}

export interface TextSegment {
  type: 'text';
  content: string;
}

export interface EntitySegment {
  type: 'entity';
  entity: ParsedEntityURI;
  displayMode: EntityDisplayMode;
  raw: string;
}

export type ParsedSegment = TextSegment | EntitySegment;

// ─────────────────────────────────────────────────────────────────────────────
// Pattern
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Matches both card ([[...]]) and inline ([...]) entity URI syntax.
 * Supports @vienna//, vienna//, and vienna:// prefixes.
 */
const ENTITY_URI_PATTERN =
  /\[\[@?vienna:?\/\/([a-z_][a-z0-9_]*)\/([^\]?]+)(?:\?([^\]]*))?\]\]|\[@?vienna:?\/\/([a-z_][a-z0-9_]*)\/([^\]?]+)(?:\?([^\]]*))?\]/gi;

// ─────────────────────────────────────────────────────────────────────────────
// Encoding
// ─────────────────────────────────────────────────────────────────────────────

function decodeLabel(base64: string): string | undefined {
  try {
    let decoded: string;
    if (typeof atob === 'function') {
      const binary = atob(base64);
      const bytes = Uint8Array.from(binary, (c) => c.codePointAt(0)!);
      decoded = new TextDecoder().decode(bytes);
    } else {
      decoded = Buffer.from(base64, 'base64').toString('utf-8');
    }
    if (decoded.includes('%')) {
      try {
        return decodeURIComponent(decoded);
      } catch {
        return decoded;
      }
    }
    return decoded;
  } catch {
    return undefined;
  }
}

/** Encode a label to base64 (handles Unicode). */
export function encodeLabel(label: string): string {
  if (typeof btoa === 'function') {
    return btoa(String.fromCodePoint(...new TextEncoder().encode(label)));
  }
  return Buffer.from(label, 'utf-8').toString('base64');
}

// ─────────────────────────────────────────────────────────────────────────────
// Parsing
// ─────────────────────────────────────────────────────────────────────────────

/** Check if text contains any entity URI markup. */
export function containsEntityMarkup(text: string): boolean {
  ENTITY_URI_PATTERN.lastIndex = 0;
  return ENTITY_URI_PATTERN.test(text);
}

/** Parse text into segments of plain text and entity references. */
export function parseEntityMarkup(text: string): ParsedSegment[] {
  const segments: ParsedSegment[] = [];
  let lastIndex = 0;

  ENTITY_URI_PATTERN.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = ENTITY_URI_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }

    const isCard = match[1] !== undefined;
    const entityType = isCard ? match[1] : match[4];
    const pathString = isCard ? match[2] : match[5];
    const queryString = isCard ? match[3] : match[6];
    const displayMode: EntityDisplayMode = isCard ? 'card' : 'inline';

    const pathSegments = pathString
      .split('/')
      .map((s) => {
        try {
          return decodeURIComponent(s.trim());
        } catch {
          return s.trim();
        }
      })
      .filter((s) => s.length > 0);

    let label: string | undefined;
    let detachable: boolean | undefined;
    if (queryString) {
      const params = new URLSearchParams(queryString);
      const labelBase64 = params.get('label');
      if (labelBase64) label = decodeLabel(labelBase64);
      if (params.get('detach') === 'true') detachable = true;
    }

    const pathPart = pathSegments.map(encodeURIComponent).join('/');
    let uri = `@vienna//${entityType}/${pathPart}`;
    const uriParams: string[] = [];
    if (label) uriParams.push(`label=${encodeLabel(label)}`);
    if (detachable) uriParams.push('detach=true');
    if (uriParams.length > 0) uri += `?${uriParams.join('&')}`;

    segments.push({
      type: 'entity',
      entity: { uri, entityType, pathSegments, label, detachable },
      displayMode,
      raw: match[0],
    });

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', content: text.slice(lastIndex) });
  }

  return segments;
}

/**
 * Parse a single entity URI (without brackets).
 * Supports @vienna//, vienna//, and vienna:// formats.
 */
export function parseEntityURI(uri: string): ParsedEntityURI | null {
  const match = uri.match(/^@?vienna:?\/\/([a-z_][a-z0-9_]*)\/([^?]+)(?:\?(.*))?$/i);
  if (!match) return null;

  const [, entityType, pathString, queryString] = match;
  const pathSegments = pathString
    .split('/')
    .map((s) => {
      try {
        return decodeURIComponent(s.trim());
      } catch {
        return s.trim();
      }
    })
    .filter((s) => s.length > 0);

  let label: string | undefined;
  let detachable: boolean | undefined;
  if (queryString) {
    const params = new URLSearchParams(queryString);
    const labelBase64 = params.get('label');
    if (labelBase64) label = decodeLabel(labelBase64);
    if (params.get('detach') === 'true') detachable = true;
  }

  return { uri, entityType, pathSegments, label, detachable };
}

// ─────────────────────────────────────────────────────────────────────────────
// Building
// ─────────────────────────────────────────────────────────────────────────────

/** Build an entity URI from components. */
export function buildEntityURI(entityType: string, id: string, label?: string): string {
  let uri = `@vienna//${entityType}/${encodeURIComponent(id)}`;
  if (label) uri += `?label=${encodeLabel(label)}`;
  return uri;
}

/** Build entity markup for insertion into text. */
export function buildEntityMarkup(
  entityType: string,
  id: string,
  label?: string,
  displayMode: EntityDisplayMode = 'inline',
  detachable?: boolean
): string {
  let uri = buildEntityURI(entityType, id, label);
  if (detachable && displayMode === 'card') {
    uri += (uri.includes('?') ? '&' : '?') + 'detach=true';
  }
  return displayMode === 'card' ? `[[${uri}]]` : `[${uri}]`;
}

/** Get a display label for an entity, formatting the path as fallback. */
export function getEntityDisplayLabel(entity: ParsedEntityURI): string {
  if (entity.label) return entity.label;
  if (entity.pathSegments.length === 1) return entity.pathSegments[0];

  const last = entity.pathSegments[entity.pathSegments.length - 1];
  if (/^\d+$/.test(last)) {
    return `${entity.pathSegments.slice(0, -1).join('/')}#${last}`;
  }
  return entity.pathSegments.join('/');
}
