/**
 * Entity URI Utilities
 *
 * URIs follow the pattern: @vienna//<type>/<segment1>/<segment2>/...
 * Labels are optional: @vienna//<type>/<segments>?label=<base64>
 *
 * Examples:
 *   @vienna//project/abc123
 *   @vienna//github_pr/owner/repo/42
 *   @vienna//project/abc123?label=TXkgUHJvamVjdA==
 */

import type { EntityURIPath } from './schemas';
import { EntityURIError } from './errors';

export const ENTITY_URI_SCHEME = '@vienna//';

/**
 * Build an entity URI from type, ID parts, and URI path config.
 *
 * @example
 * ```ts
 * buildEntityURI('project', { id: 'abc' }, { segments: ['id'] })
 * // => '@vienna//project/abc'
 * ```
 */
export function buildEntityURI(
  type: string,
  id: Record<string, string>,
  uriPath: EntityURIPath
): string {
  if (!type) {
    throw new EntityURIError('MISSING_ENTITY_TYPE', 'Entity type must not be empty');
  }
  if (uriPath.segments.length === 0) {
    throw new EntityURIError(
      'MISSING_PATH',
      `Entity type '${type}' must have at least one URI segment`
    );
  }
  const parts = uriPath.segments.map((seg) => {
    const value = id[seg];
    if (value === undefined || value === '') {
      throw new EntityURIError(
        'INVALID_PATH_SEGMENT',
        `Missing or empty URI segment '${seg}' for entity type '${type}'`
      );
    }
    return encodeURIComponent(value);
  });
  return `${ENTITY_URI_SCHEME}${type}/${parts.join('/')}`;
}

/**
 * Build an entity URI with an optional display label.
 * The label is base64-encoded and appended as a query parameter.
 */
export function buildEntityURIWithLabel(
  type: string,
  id: Record<string, string>,
  uriPath: EntityURIPath,
  label?: string
): string {
  const base = buildEntityURI(type, id, uriPath);
  if (!label) return base;
  const bytes = new TextEncoder().encode(label);
  const encoded = btoa(String.fromCharCode(...bytes));
  return `${base}?label=${encoded}`;
}

/** Strip the label query parameter from a URI. */
function stripLabel(uri: string): string {
  const qIndex = uri.indexOf('?label=');
  return qIndex === -1 ? uri : uri.slice(0, qIndex);
}

/**
 * Parse an entity URI and extract the type and path segments.
 * If `uriPath` is provided, segments are mapped to named keys.
 * Otherwise, segments are keyed by index ('0', '1', ...).
 */
export function parseEntityURI(
  uri: string,
  uriPath?: EntityURIPath
): { type: string; id: Record<string, string> } {
  const base = stripLabel(uri);

  if (!base.startsWith(ENTITY_URI_SCHEME)) {
    throw new EntityURIError(
      'INVALID_FORMAT',
      `Invalid entity URI: must start with '${ENTITY_URI_SCHEME}'`,
      uri
    );
  }

  const rest = base.slice(ENTITY_URI_SCHEME.length);
  const slashIndex = rest.indexOf('/');
  if (slashIndex === -1) {
    throw new EntityURIError(
      'MISSING_PATH',
      `Invalid entity URI: missing path segments in '${uri}'`,
      uri
    );
  }

  const type = rest.slice(0, slashIndex);
  if (!type) {
    throw new EntityURIError(
      'MISSING_ENTITY_TYPE',
      `Invalid entity URI: empty type in '${uri}'`,
      uri
    );
  }

  const pathStr = rest.slice(slashIndex + 1);
  const segments = pathStr.split('/').map(decodeURIComponent);

  if (uriPath) {
    if (segments.length !== uriPath.segments.length) {
      throw new EntityURIError(
        'SEGMENT_COUNT_MISMATCH',
        `URI segment count mismatch for type '${type}': expected ${uriPath.segments.length}, got ${segments.length}`,
        uri
      );
    }
    const id: Record<string, string> = {};
    for (let i = 0; i < uriPath.segments.length; i++) {
      id[uriPath.segments[i]!] = segments[i]!;
    }
    return { type, id };
  }

  const id: Record<string, string> = {};
  for (let i = 0; i < segments.length; i++) {
    id[String(i)] = segments[i]!;
  }
  return { type, id };
}

/**
 * Parse an entity URI and also extract the display label if present.
 */
export function parseEntityURIWithLabel(
  uri: string,
  uriPath?: EntityURIPath
): { type: string; id: Record<string, string>; label?: string } {
  const result = parseEntityURI(uri, uriPath);
  const label = extractLabel(uri);
  return label !== undefined ? { ...result, label } : result;
}

/**
 * Extract just the entity type from a URI without full parsing.
 */
export function getEntityTypeFromURI(uri: string): string {
  const base = stripLabel(uri);
  if (!base.startsWith(ENTITY_URI_SCHEME)) {
    throw new EntityURIError(
      'INVALID_FORMAT',
      `Invalid entity URI: must start with '${ENTITY_URI_SCHEME}'`,
      uri
    );
  }
  const rest = base.slice(ENTITY_URI_SCHEME.length);
  const slashIndex = rest.indexOf('/');
  if (slashIndex === -1) {
    throw new EntityURIError(
      'MISSING_PATH',
      `Invalid entity URI: missing path segments in '${uri}'`,
      uri
    );
  }
  const type = rest.slice(0, slashIndex);
  if (!type) {
    throw new EntityURIError(
      'MISSING_ENTITY_TYPE',
      `Invalid entity URI: empty type in '${uri}'`,
      uri
    );
  }
  return type;
}

/**
 * Check whether a string is a valid entity URI (non-throwing).
 */
export function isEntityURI(uri: string): boolean {
  try {
    getEntityTypeFromURI(uri);
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract the display label from a URI, or undefined if none.
 */
const BASE64_RE = /^[A-Za-z0-9+/]*={0,2}$/;

export function extractLabel(uri: string): string | undefined {
  const prefix = '?label=';
  const qIndex = uri.indexOf(prefix);
  if (qIndex === -1) return undefined;
  const encoded = uri.slice(qIndex + prefix.length);
  if (!encoded || !BASE64_RE.test(encoded)) return undefined;
  try {
    const bytes = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return undefined;
  }
}

/**
 * Compare two entity URIs for equality, ignoring labels.
 */
export function compareEntityURIs(uri1: string, uri2: string): boolean {
  return stripLabel(uri1) === stripLabel(uri2);
}
