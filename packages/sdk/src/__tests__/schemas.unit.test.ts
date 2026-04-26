import { describe, it, expect } from 'vitest';
import {
  EntityTypeSchema,
  PathSegmentSchema,
  EntityURIPathSchema,
  BaseEntitySchema,
  EntityDisplayMetadataSchema,
  EntityCacheConfigSchema,
} from '../schemas';

// ─────────────────────────────────────────────────────────────────────────────
// Primitives
// ─────────────────────────────────────────────────────────────────────────────

describe('EntityTypeSchema', () => {
  it('accepts valid lowercase type names', () => {
    expect(EntityTypeSchema.parse('github_pr')).toBe('github_pr');
    expect(EntityTypeSchema.parse('slack_message')).toBe('slack_message');
    expect(EntityTypeSchema.parse('a')).toBe('a');
    expect(EntityTypeSchema.parse('linear_issue')).toBe('linear_issue');
  });

  it('rejects uppercase characters', () => {
    expect(() => EntityTypeSchema.parse('GitHub_PR')).toThrow();
    expect(() => EntityTypeSchema.parse('ALLCAPS')).toThrow();
    expect(() => EntityTypeSchema.parse('mixedCase')).toThrow();
  });

  it('rejects types starting with a number', () => {
    expect(() => EntityTypeSchema.parse('1bad')).toThrow();
    expect(() => EntityTypeSchema.parse('0_start')).toThrow();
  });

  it('rejects empty string', () => {
    expect(() => EntityTypeSchema.parse('')).toThrow();
  });

  it('rejects strings exceeding 64 characters', () => {
    const longType = 'a' + '_abc'.repeat(21); // 1 + 84 = 85 chars
    expect(longType.length).toBeGreaterThan(64);
    expect(() => EntityTypeSchema.parse(longType)).toThrow();
  });

  it('accepts a type at exactly 64 characters', () => {
    const exact = 'a'.repeat(64);
    expect(EntityTypeSchema.parse(exact)).toBe(exact);
  });

  it('rejects types with special characters', () => {
    expect(() => EntityTypeSchema.parse('has-dash')).toThrow();
    expect(() => EntityTypeSchema.parse('has.dot')).toThrow();
    expect(() => EntityTypeSchema.parse('has space')).toThrow();
  });
});

describe('PathSegmentSchema', () => {
  it('accepts valid path segments', () => {
    expect(PathSegmentSchema.parse('owner/repo')).toBe('owner/repo');
    expect(PathSegmentSchema.parse('some-id-123')).toBe('some-id-123');
    expect(PathSegmentSchema.parse('x')).toBe('x');
  });

  it('rejects empty string', () => {
    expect(() => PathSegmentSchema.parse('')).toThrow();
  });

  it('rejects segments containing control characters', () => {
    expect(() => PathSegmentSchema.parse('has\0null')).toThrow();
    expect(() => PathSegmentSchema.parse('has\nnewline')).toThrow();
    expect(() => PathSegmentSchema.parse('has\rreturn')).toThrow();
  });

  it('rejects segments exceeding 256 characters', () => {
    const longSegment = 'x'.repeat(257);
    expect(() => PathSegmentSchema.parse(longSegment)).toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// URI
// ─────────────────────────────────────────────────────────────────────────────

describe('EntityURIPathSchema', () => {
  it('accepts a valid path with one or more segments', () => {
    const path = EntityURIPathSchema.parse({ segments: ['owner', 'repo', '42'] });
    expect(path.segments).toEqual(['owner', 'repo', '42']);
  });

  it('rejects an empty segments array', () => {
    expect(() => EntityURIPathSchema.parse({ segments: [] })).toThrow();
  });

  it('rejects segments containing empty strings', () => {
    expect(() => EntityURIPathSchema.parse({ segments: ['valid', ''] })).toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Base Entity
// ─────────────────────────────────────────────────────────────────────────────

describe('BaseEntitySchema', () => {
  const validEntity = {
    id: 'issue-123',
    type: 'linear_issue',
    uri: '@vienna//linear_issue/PROJ-123',
    title: 'Fix login bug',
  };

  it('parses a valid entity with only required fields', () => {
    const entity = BaseEntitySchema.parse(validEntity);
    expect(entity.id).toBe('issue-123');
    expect(entity.type).toBe('linear_issue');
    expect(entity.uri).toBe('@vienna//linear_issue/PROJ-123');
    expect(entity.title).toBe('Fix login bug');
    expect(entity.description).toBeUndefined();
    expect(entity.createdAt).toBeUndefined();
    expect(entity.updatedAt).toBeUndefined();
  });

  it('parses a valid entity with all optional fields', () => {
    const now = Date.now();
    const entity = BaseEntitySchema.parse({
      ...validEntity,
      description: 'Users cannot log in after password reset',
      createdAt: now,
      updatedAt: now + 1000,
    });
    expect(entity.description).toBe('Users cannot log in after password reset');
    expect(entity.createdAt).toBe(now);
    expect(entity.updatedAt).toBe(now + 1000);
  });

  it('rejects entity missing required id', () => {
    const { id: _, ...noId } = validEntity;
    expect(() => BaseEntitySchema.parse(noId)).toThrow();
  });

  it('rejects entity missing required type', () => {
    const { type: _, ...noType } = validEntity;
    expect(() => BaseEntitySchema.parse(noType)).toThrow();
  });

  it('rejects entity missing required uri', () => {
    const { uri: _, ...noUri } = validEntity;
    expect(() => BaseEntitySchema.parse(noUri)).toThrow();
  });

  it('rejects entity with empty id', () => {
    expect(() => BaseEntitySchema.parse({ ...validEntity, id: '' })).toThrow();
  });

  it('accepts entity with metadata', () => {
    const entity = BaseEntitySchema.parse({
      ...validEntity,
      metadata: { priority: 'high', labels: ['bug', 'urgent'] },
    });
    expect(entity.metadata).toEqual({ priority: 'high', labels: ['bug', 'urgent'] });
  });

  it('treats metadata as optional', () => {
    const entity = BaseEntitySchema.parse(validEntity);
    expect(entity.metadata).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Display Metadata
// ─────────────────────────────────────────────────────────────────────────────

describe('EntityDisplayMetadataSchema', () => {
  const validDisplay = {
    emoji: '🐛',
    colors: { bg: '#1a1a2e', text: '#e0e0e0', border: '#333366' },
  };

  it('parses valid display metadata with only required fields', () => {
    const display = EntityDisplayMetadataSchema.parse(validDisplay);
    expect(display.emoji).toBe('🐛');
    expect(display.colors.bg).toBe('#1a1a2e');
    expect(display.description).toBeUndefined();
    expect(display.filterDescriptions).toBeUndefined();
    expect(display.outputFields).toBeUndefined();
  });

  it('parses display metadata with all optional fields', () => {
    const display = EntityDisplayMetadataSchema.parse({
      ...validDisplay,
      description: 'Bug tracker issues',
      filterDescriptions: [
        { name: 'status', type: 'string', description: 'Issue status' },
      ],
      outputFields: [
        { key: 'status', label: 'Status', metadataPath: 'metadata.status' },
        { key: 'priority', label: 'Priority', metadataPath: 'metadata.priority', format: 'badge' },
      ],
    });
    expect(display.description).toBe('Bug tracker issues');
    expect(display.filterDescriptions).toHaveLength(1);
    expect(display.outputFields).toHaveLength(2);
    expect(display.outputFields![1].format).toBe('badge');
  });

  it('rejects display metadata missing required colors', () => {
    expect(() => EntityDisplayMetadataSchema.parse({ emoji: '🐛' })).toThrow();
  });

  it('rejects display metadata missing required emoji', () => {
    expect(() =>
      EntityDisplayMetadataSchema.parse({
        colors: { bg: '#000', text: '#fff', border: '#ccc' },
      })
    ).toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Cache Config
// ─────────────────────────────────────────────────────────────────────────────

describe('EntityCacheConfigSchema', () => {
  it('parses valid config with required ttl only', () => {
    const config = EntityCacheConfigSchema.parse({ ttl: 60000 });
    expect(config.ttl).toBe(60000);
    expect(config.maxSize).toBeUndefined();
  });

  it('parses valid config with ttl and maxSize', () => {
    const config = EntityCacheConfigSchema.parse({ ttl: 30000, maxSize: 500 });
    expect(config.ttl).toBe(30000);
    expect(config.maxSize).toBe(500);
  });

  it('rejects non-positive ttl', () => {
    expect(() => EntityCacheConfigSchema.parse({ ttl: 0 })).toThrow();
    expect(() => EntityCacheConfigSchema.parse({ ttl: -100 })).toThrow();
  });

  it('rejects non-positive maxSize', () => {
    expect(() => EntityCacheConfigSchema.parse({ ttl: 1000, maxSize: 0 })).toThrow();
    expect(() => EntityCacheConfigSchema.parse({ ttl: 1000, maxSize: -1 })).toThrow();
  });
});
