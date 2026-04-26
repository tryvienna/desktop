import { describe, it, expect, beforeEach } from 'vitest';
import type { ToolContext } from '../types';
import { handleEntityTypes } from '../tools/entity-types';
import { createStandardTestContext, createTestContext } from './helpers';

describe('handleEntityTypes', () => {
  let ctx: ToolContext;

  beforeEach(() => {
    ctx = createStandardTestContext();
  });

  it('lists all registered entity types', async () => {
    const result = await handleEntityTypes({}, ctx);
    expect(result.isError).toBeUndefined();
    const text = result.content[0]!.text;
    expect(text).toContain('2 entity types available');
    expect(text).toContain('## project');
    expect(text).toContain('## workstream');
  });

  it('includes display metadata', async () => {
    const result = await handleEntityTypes({}, ctx);
    const text = result.content[0]!.text;
    expect(text).toContain('A project grouping workstreams');
  });

  it('includes filter descriptions', async () => {
    const result = await handleEntityTypes({}, ctx);
    const text = result.content[0]!.text;
    expect(text).toContain('List Filters');
    expect(text).toContain('`status`');
  });

  it('includes URI pattern', async () => {
    const result = await handleEntityTypes({}, ctx);
    const text = result.content[0]!.text;
    expect(text).toContain('URI Pattern');
  });

  it('includes available tools footer', async () => {
    const result = await handleEntityTypes({}, ctx);
    const text = result.content[0]!.text;
    expect(text).toContain('graphql_operations');
    expect(text).toContain('graphql_execute');
    expect(text).toContain('entity_get');
    expect(text).not.toContain('entity_search');
    expect(text).not.toContain('entity_list');
    expect(text).not.toContain('entity_action');
  });

  it('handles empty registry', async () => {
    const emptyCtx = createTestContext();
    const result = await handleEntityTypes({}, emptyCtx);
    expect(result.content[0]!.text).toContain('No entity types registered');
  });
});
