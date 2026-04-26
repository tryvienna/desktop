/**
 * Tests for pure markdown formatters.
 * All functions are pure — no mocks needed, just assert on output strings.
 */

import { describe, it, expect } from 'vitest';
import type { BaseEntity, EntityTypeSummary } from '@tryvienna/sdk';
import {
  formatFieldValue,
  encodeLabel,
  formatReferenceHint,
  formatEntityDetails,
  formatEntityTypes,
  formatGraphqlOperations,
  formatGraphqlResult,
  hasEmptyObjects,
} from '../format';

// ── Primitives ──────────────────────────────────────────────────────────────

describe('formatFieldValue', () => {
  it('returns empty string for null/undefined', () => {
    expect(formatFieldValue(null)).toBe('');
    expect(formatFieldValue(undefined)).toBe('');
  });

  it('formats booleans as Yes/No', () => {
    expect(formatFieldValue(true)).toBe('Yes');
    expect(formatFieldValue(false)).toBe('No');
  });

  it('formats numbers and strings', () => {
    expect(formatFieldValue(42)).toBe('42');
    expect(formatFieldValue('hello')).toBe('hello');
  });

  it('formats objects as JSON', () => {
    expect(formatFieldValue({ a: 1 })).toBe('{"a":1}');
  });
});

describe('encodeLabel', () => {
  it('encodes a simple label', () => {
    const encoded = encodeLabel('My Project');
    expect(atob(encoded)).toBe(encodeURIComponent('My Project'));
  });
});

describe('formatReferenceHint', () => {
  it('includes URI in reference syntax', () => {
    const result = formatReferenceHint('@vienna//project/abc');
    expect(result).toContain('[@vienna//project/abc]');
    expect(result).toContain('inline chip');
    expect(result).toContain('block card');
  });

  it('includes encoded label when provided', () => {
    const result = formatReferenceHint('@vienna//project/abc', 'My Project');
    expect(result).toContain('?label=');
  });
});

// ── Entity Details ──────────────────────────────────────────────────────────

describe('formatEntityDetails', () => {
  const entity: BaseEntity = {
    id: 'proj-1',
    type: 'project',
    uri: '@vienna//project/proj-1',
    title: 'Alpha Project',
    description: 'The alpha project',
  };

  it('includes title and URI', () => {
    const result = formatEntityDetails(entity);
    expect(result).toContain('# Alpha Project');
    expect(result).toContain('@vienna//project/proj-1');
  });

  it('includes type and description', () => {
    const result = formatEntityDetails(entity);
    expect(result).toContain('project');
    expect(result).toContain('The alpha project');
  });

  it('does not include a JSON block', () => {
    const result = formatEntityDetails(entity);
    expect(result).not.toContain('```json');
  });

  it('includes reference hint', () => {
    const result = formatEntityDetails(entity);
    expect(result).toContain('Reference:');
  });
});

// ── Entity Types ────────────────────────────────────────────────────────────

describe('formatEntityTypes', () => {
  const summaries: EntityTypeSummary[] = [
    {
      type: 'project',
      displayName: 'Project',
      icon: 'folder',
      source: 'builtin',
      uriExample: '@vienna//project/%3Cid%3E',
      display: {
        emoji: '📁',
        colors: { bg: '#E8F5E9', text: '#2E7D32', border: '#A5D6A7' },
        description: 'A project',
        filterDescriptions: [
          { name: 'status', type: 'string', description: 'Filter by status' },
        ],
      },
    },
  ];

  it('includes type count header', () => {
    const result = formatEntityTypes(summaries);
    expect(result).toContain('1 entity types available');
  });

  it('includes type details', () => {
    const result = formatEntityTypes(summaries);
    expect(result).toContain('## project');
    expect(result).toContain('Project');
    expect(result).toContain('URI Pattern');
  });

  it('includes filter descriptions', () => {
    const result = formatEntityTypes(summaries);
    expect(result).toContain('List Filters');
    expect(result).toContain('`status`');
  });

  it('includes tools footer with graphql_operations as primary', () => {
    const result = formatEntityTypes(summaries);
    expect(result).toContain('graphql_operations');
    expect(result).toContain('graphql_execute');
    expect(result).toContain('entity_get');
    expect(result).not.toContain('entity_search');
    expect(result).not.toContain('entity_list');
    expect(result).not.toContain('entity_action');
  });
});

// ── GraphQL Operations Discovery ─────────────────────────────────────────

describe('formatGraphqlOperations', () => {
  it('shows input fields inline in signature', () => {
    const result = formatGraphqlOperations([
      {
        kind: 'mutation',
        name: 'updateThing',
        description: 'Update a thing',
        args: [
          {
            name: 'input',
            type: 'UpdateThingInput!',
            inputFields: [
              { name: 'id', type: 'ID!' },
              { name: 'title', type: 'String' },
              { name: 'count', type: 'Int' },
            ],
          },
        ],
        returnType: 'Thing',
        returnFields: ['id', 'title'],
      },
    ]);

    expect(result).toContain('UpdateThingInput!');
    expect(result).toContain('id: ID!');
    expect(result).toContain('title: String');
    expect(result).toContain('count: Int');
  });

  it('generates expanded example variables for input types', () => {
    const result = formatGraphqlOperations([
      {
        kind: 'mutation',
        name: 'updateThing',
        description: '',
        args: [
          {
            name: 'input',
            type: 'UpdateThingInput!',
            inputFields: [
              { name: 'owner', type: 'String!' },
              { name: 'repo', type: 'String!' },
              { name: 'number', type: 'Int!' },
              { name: 'title', type: 'String' },
            ],
          },
        ],
        returnType: 'Thing',
        returnFields: ['id'],
      },
    ]);

    // Should show required fields expanded in variables
    expect(result).toContain('input: { owner: "..."');
    expect(result).toContain('repo: "..."');
    expect(result).toContain('number: 10');
    // Optional fields should NOT appear in the example variables
    expect(result).not.toMatch(/variables:.*title/);
  });

  it('works with args that have no inputFields', () => {
    const result = formatGraphqlOperations([
      {
        kind: 'query',
        name: 'getThing',
        description: 'Get a thing',
        args: [{ name: 'id', type: 'ID!' }],
        returnType: 'Thing',
        returnFields: ['id', 'title'],
      },
    ]);

    expect(result).toContain('`getThing(id: ID!)`');
    expect(result).toContain('variables: { id: "..." }');
  });

  it('uses compact format for >3 operations', () => {
    const ops = Array.from({ length: 5 }, (_, i) => ({
      kind: 'query' as const,
      name: `op${i}`,
      description: `Operation ${i}`,
      args: [{ name: 'id', type: 'ID!' }],
      returnType: 'Thing',
      returnFields: ['id'],
    }));

    const result = formatGraphqlOperations(ops, 'thing');

    // Compact format: one-liner per operation, no example queries
    expect(result).toContain('Found 5 operations matching "thing"');
    expect(result).toContain('exact operation name for full spec');
    expect(result).toContain('- **query** `op0(id)` — Operation 0');
    expect(result).toContain('- **query** `op4(id)` — Operation 4');
    // Should NOT contain full spec elements
    expect(result).not.toContain('```graphql');
    expect(result).not.toContain('variables:');
  });

  it('uses full format for ≤3 operations', () => {
    const ops = [
      {
        kind: 'query' as const,
        name: 'getThing',
        description: 'Get a thing',
        args: [{ name: 'id', type: 'ID!' }],
        returnType: 'Thing',
        returnFields: ['id', 'title'],
      },
      {
        kind: 'mutation' as const,
        name: 'updateThing',
        description: 'Update a thing',
        args: [{ name: 'id', type: 'ID!' }],
        returnType: 'Thing',
        returnFields: ['id'],
      },
    ];

    const result = formatGraphqlOperations(ops);

    // Full format: includes example queries and variables
    expect(result).toContain('Found 2 operations');
    expect(result).toContain('```graphql');
    expect(result).toContain('variables:');
  });
});

// ── GraphQL Result Formatting ────────────────────────────────────────────

describe('formatGraphqlResult', () => {
  it('formats result as JSON code block', () => {
    const result = formatGraphqlResult({ data: { id: 1 } });
    expect(result).toContain('```json');
    expect(result).toContain('"id": 1');
    expect(result).toContain('```');
  });

  it('appends hint when result contains empty objects in arrays', () => {
    const result = formatGraphqlResult({
      issue: { labels: [{}, {}] },
    });
    expect(result).toContain('Tip:');
    expect(result).toContain('subfield selections');
  });

  it('does not append hint for normal results', () => {
    const result = formatGraphqlResult({
      issue: { labels: [{ name: 'bug' }] },
    });
    expect(result).not.toContain('Tip:');
  });

  it('does not append hint for empty arrays', () => {
    const result = formatGraphqlResult({ items: [] });
    expect(result).not.toContain('Tip:');
  });
});

// ── Empty Object Detection ───────────────────────────────────────────────

describe('hasEmptyObjects', () => {
  it('detects empty objects in arrays', () => {
    expect(hasEmptyObjects({ items: [{}, {}] })).toBe(true);
  });

  it('detects nested empty objects', () => {
    expect(hasEmptyObjects({ data: { issue: { labels: [{}] } } })).toBe(true);
  });

  it('returns false for normal data', () => {
    expect(hasEmptyObjects({ name: 'test' })).toBe(false);
    expect(hasEmptyObjects({ items: [{ id: 1 }] })).toBe(false);
  });

  it('returns false for primitives and nulls', () => {
    expect(hasEmptyObjects(null)).toBe(false);
    expect(hasEmptyObjects('hello')).toBe(false);
    expect(hasEmptyObjects(42)).toBe(false);
  });

  it('returns false for empty arrays', () => {
    expect(hasEmptyObjects({ items: [] })).toBe(false);
  });
});

