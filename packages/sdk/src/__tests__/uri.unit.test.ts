import { describe, expect, it } from 'vitest';

import {
  buildEntityURI,
  buildEntityURIWithLabel,
  compareEntityURIs,
  ENTITY_URI_SCHEME,
  extractLabel,
  getEntityTypeFromURI,
  isEntityURI,
  parseEntityURI,
  parseEntityURIWithLabel,
} from '../uri';
import { EntityURIError } from '../errors';

describe('ENTITY_URI_SCHEME', () => {
  it('equals @vienna//', () => {
    expect(ENTITY_URI_SCHEME).toBe('@vienna//');
  });
});

describe('buildEntityURI', () => {
  it('builds a URI with a single segment', () => {
    const uri = buildEntityURI('project', { id: 'abc123' }, { segments: ['id'] });
    expect(uri).toBe('@vienna//project/abc123');
  });

  it('builds a URI with multiple segments', () => {
    const uri = buildEntityURI(
      'github_pr',
      { owner: 'acme', repo: 'widgets', number: '42' },
      { segments: ['owner', 'repo', 'number'] }
    );
    expect(uri).toBe('@vienna//github_pr/acme/widgets/42');
  });

  it('URL-encodes special characters in segment values', () => {
    const uri = buildEntityURI('item', { id: 'hello world/foo' }, { segments: ['id'] });
    expect(uri).toBe('@vienna//item/hello%20world%2Ffoo');
  });

  it('throws EntityURIError with MISSING_ENTITY_TYPE when type is empty', () => {
    expect(() => buildEntityURI('', { id: 'x' }, { segments: ['id'] })).toThrowError(
      expect.objectContaining({
        name: 'EntityURIError',
        code: 'MISSING_ENTITY_TYPE',
      })
    );
  });

  it('throws EntityURIError with INVALID_PATH_SEGMENT when a segment value is missing', () => {
    expect(() =>
      buildEntityURI('project', { wrong_key: 'val' }, { segments: ['id'] })
    ).toThrowError(
      expect.objectContaining({
        name: 'EntityURIError',
        code: 'INVALID_PATH_SEGMENT',
      })
    );
  });

  it('throws EntityURIError with MISSING_PATH when segments array is empty', () => {
    expect(() => buildEntityURI('project', { id: 'abc' }, { segments: [] })).toThrowError(
      expect.objectContaining({
        name: 'EntityURIError',
        code: 'MISSING_PATH',
      })
    );
  });
});

describe('buildEntityURIWithLabel', () => {
  const uriPath = { segments: ['id'] } as const;

  it('returns the base URI when label is undefined', () => {
    const uri = buildEntityURIWithLabel('project', { id: 'abc' }, uriPath);
    expect(uri).toBe('@vienna//project/abc');
  });

  it('returns the base URI when label is an empty string', () => {
    const uri = buildEntityURIWithLabel('project', { id: 'abc' }, uriPath, '');
    expect(uri).toBe('@vienna//project/abc');
  });

  it('appends a base64-encoded label as a query parameter', () => {
    const uri = buildEntityURIWithLabel('project', { id: 'abc' }, uriPath, 'My Project');
    expect(uri).toMatch(/^@vienna\/\/project\/abc\?label=.+$/);
    // The label should be recoverable
    const label = extractLabel(uri);
    expect(label).toBe('My Project');
  });

  it('correctly round-trips UTF-8 labels with non-ASCII characters', () => {
    const utf8Label = 'Caf\u00e9 \u2615 \u{1F680}';
    const uri = buildEntityURIWithLabel('item', { id: '1' }, uriPath, utf8Label);
    const recovered = extractLabel(uri);
    expect(recovered).toBe(utf8Label);
  });
});

describe('parseEntityURI', () => {
  it('parses a single-segment URI without uriPath using indexed keys', () => {
    const result = parseEntityURI('@vienna//project/abc123');
    expect(result).toEqual({ type: 'project', id: { '0': 'abc123' } });
  });

  it('parses a single-segment URI with uriPath using named keys', () => {
    const result = parseEntityURI('@vienna//project/abc123', { segments: ['id'] });
    expect(result).toEqual({ type: 'project', id: { id: 'abc123' } });
  });

  it('parses a multi-segment URI with uriPath', () => {
    const result = parseEntityURI('@vienna//github_pr/acme/widgets/42', {
      segments: ['owner', 'repo', 'number'],
    });
    expect(result).toEqual({
      type: 'github_pr',
      id: { owner: 'acme', repo: 'widgets', number: '42' },
    });
  });

  it('decodes URL-encoded segments', () => {
    const result = parseEntityURI('@vienna//item/hello%20world%2Ffoo');
    expect(result.id['0']).toBe('hello world/foo');
  });

  it('round-trips segments containing slashes via encoding', () => {
    const uriPath = { segments: ['owner', 'repo'] } as const;
    const uri = buildEntityURI('item', { owner: 'a/b', repo: 'c/d' }, uriPath);
    const parsed = parseEntityURI(uri, uriPath);
    expect(parsed.id).toEqual({ owner: 'a/b', repo: 'c/d' });
  });

  it('strips the label before parsing', () => {
    const result = parseEntityURI('@vienna//project/abc?label=TXkgUHJvamVjdA==', {
      segments: ['id'],
    });
    expect(result).toEqual({ type: 'project', id: { id: 'abc' } });
  });

  describe('errors', () => {
    it('throws INVALID_FORMAT when URI does not start with @vienna//', () => {
      expect(() => parseEntityURI('https://example.com')).toThrowError(
        expect.objectContaining({
          name: 'EntityURIError',
          code: 'INVALID_FORMAT',
        })
      );
    });

    it('throws MISSING_PATH when URI has no path segments', () => {
      expect(() => parseEntityURI('@vienna//project')).toThrowError(
        expect.objectContaining({
          name: 'EntityURIError',
          code: 'MISSING_PATH',
        })
      );
    });

    it('throws MISSING_ENTITY_TYPE when type is empty', () => {
      expect(() => parseEntityURI('@vienna///abc')).toThrowError(
        expect.objectContaining({
          name: 'EntityURIError',
          code: 'MISSING_ENTITY_TYPE',
        })
      );
    });

    it('throws SEGMENT_COUNT_MISMATCH when segment count does not match uriPath', () => {
      expect(() =>
        parseEntityURI('@vienna//github_pr/acme/widgets', {
          segments: ['owner', 'repo', 'number'],
        })
      ).toThrowError(
        expect.objectContaining({
          name: 'EntityURIError',
          code: 'SEGMENT_COUNT_MISMATCH',
        })
      );
    });
  });
});

describe('parseEntityURIWithLabel', () => {
  it('returns the label when present', () => {
    const uri = buildEntityURIWithLabel('project', { id: 'abc' }, { segments: ['id'] }, 'My Project');
    const result = parseEntityURIWithLabel(uri, { segments: ['id'] });
    expect(result).toEqual({
      type: 'project',
      id: { id: 'abc' },
      label: 'My Project',
    });
  });

  it('omits the label field when no label is present', () => {
    const result = parseEntityURIWithLabel('@vienna//project/abc', { segments: ['id'] });
    expect(result).toEqual({ type: 'project', id: { id: 'abc' } });
    expect(result).not.toHaveProperty('label');
  });
});

describe('getEntityTypeFromURI', () => {
  it('extracts the entity type from a valid URI', () => {
    expect(getEntityTypeFromURI('@vienna//github_pr/acme/repo/1')).toBe('github_pr');
  });

  it('extracts the entity type from a URI with a label', () => {
    expect(getEntityTypeFromURI('@vienna//project/abc?label=TXkgUHJvamVjdA==')).toBe('project');
  });

  it('throws EntityURIError on invalid URI', () => {
    expect(() => getEntityTypeFromURI('not-a-uri')).toThrowError(EntityURIError);
  });
});

describe('isEntityURI', () => {
  it('returns true for a valid entity URI', () => {
    expect(isEntityURI('@vienna//project/abc')).toBe(true);
  });

  it('returns true for a valid URI with label', () => {
    expect(isEntityURI('@vienna//project/abc?label=dGVzdA==')).toBe(true);
  });

  it('returns false for an arbitrary string', () => {
    expect(isEntityURI('https://example.com')).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(isEntityURI('')).toBe(false);
  });
});

describe('extractLabel', () => {
  it('returns the decoded label when present', () => {
    const uri = buildEntityURIWithLabel('project', { id: 'abc' }, { segments: ['id'] }, 'Hello');
    expect(extractLabel(uri)).toBe('Hello');
  });

  it('returns undefined when no label query parameter exists', () => {
    expect(extractLabel('@vienna//project/abc')).toBeUndefined();
  });

  it('returns undefined for invalid base64 in the label', () => {
    expect(extractLabel('@vienna//project/abc?label=%%%invalid')).toBeUndefined();
  });

  it('returns undefined when ?label= is present but has no value', () => {
    expect(extractLabel('@vienna//project/abc?label=')).toBeUndefined();
  });
});

describe('compareEntityURIs', () => {
  it('returns true for identical URIs', () => {
    expect(compareEntityURIs('@vienna//project/abc', '@vienna//project/abc')).toBe(true);
  });

  it('returns true for URIs that differ only in their labels', () => {
    expect(
      compareEntityURIs(
        '@vienna//project/abc?label=TXkgUHJvamVjdA==',
        '@vienna//project/abc?label=T3RoZXI='
      )
    ).toBe(true);
  });

  it('returns false for URIs with different base paths', () => {
    expect(compareEntityURIs('@vienna//project/abc', '@vienna//project/xyz')).toBe(false);
  });
});
