import { describe, it, expect, beforeEach } from 'vitest';
import type { ToolContext } from '../types';
import { handleEntityGet } from '../tools/entity-get';
import { createStandardTestContext, FIXTURES } from './helpers';

describe('handleEntityGet', () => {
  let ctx: ToolContext;

  beforeEach(() => {
    ctx = createStandardTestContext();
  });

  it('returns entity details for a valid URI', async () => {
    const result = await handleEntityGet({ uri: '@vienna//project/proj-1' }, ctx);
    expect(result.isError).toBeUndefined();
    expect(result.content[0]!.text).toContain(FIXTURES.project1.title);
    expect(result.content[0]!.text).toContain('@vienna//project/proj-1');
    expect(result.content[0]!.text).toContain('project');
  });

  it('returns not-found message for unknown URI', async () => {
    const result = await handleEntityGet({ uri: '@vienna//project/nonexistent' }, ctx);
    expect(result.content[0]!.text).toContain('Entity not found');
    expect(result.content[0]!.text).toContain('nonexistent');
  });

  it('returns not-found for unknown type', async () => {
    const result = await handleEntityGet({ uri: '@vienna//unknown_type/abc' }, ctx);
    expect(result.content[0]!.text).toContain('Entity not found');
  });

  it('includes reference hint', async () => {
    const result = await handleEntityGet({ uri: '@vienna//project/proj-1' }, ctx);
    expect(result.content[0]!.text).toContain('Reference:');
  });
});
