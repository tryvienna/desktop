/**
 * Tests for the MCP server factory, tool routing, and input validation.
 *
 * Tests the router's validation and error handling without actually
 * connecting to an MCP transport — we call the handler functions directly.
 */

import { describe, it, expect } from 'vitest';
import { getToolDefinitions } from '../server';
import { createStandardTestContext, FIXTURES } from './helpers';
import {
  EntityGetInputSchema,
  EntityTypesInputSchema,
  GraphqlExecuteInputSchema,
  GraphqlOperationsInputSchema,
  WorkstreamCreateInputSchema,
  WorkstreamSendMessageInputSchema,
} from '../schemas';

describe('Tool Definitions', () => {
  it('registers all 6 tools', () => {
    const tools = getToolDefinitions();
    expect(tools).toHaveLength(6);
    const names = tools.map((t) => t.name);
    expect(names).toContain('graphql_operations');
    expect(names).toContain('graphql_execute');
    expect(names).toContain('entity_types');
    expect(names).toContain('entity_get');
    expect(names).toContain('workstream_create');
    expect(names).toContain('workstream_send_message');
  });

  it('graphql_operations is listed first', () => {
    const tools = getToolDefinitions();
    expect(tools[0]!.name).toBe('graphql_operations');
  });

  it('all tools have descriptions', () => {
    for (const tool of getToolDefinitions()) {
      expect(tool.description).toBeTruthy();
      expect(tool.description.length).toBeGreaterThan(10);
    }
  });
});

describe('Input Schema Validation', () => {
  describe('EntityGetInputSchema', () => {
    it('accepts valid URI', () => {
      const result = EntityGetInputSchema.safeParse({ uri: '@vienna//project/abc' });
      expect(result.success).toBe(true);
    });

    it('rejects missing URI', () => {
      const result = EntityGetInputSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('rejects URIs that do not start with @vienna//', () => {
      const result = EntityGetInputSchema.safeParse({ uri: 'invalid-uri' });
      expect(result.success).toBe(false);
    });

    it('rejects empty string', () => {
      const result = EntityGetInputSchema.safeParse({ uri: '' });
      expect(result.success).toBe(false);
    });
  });

  describe('EntityTypesInputSchema', () => {
    it('accepts empty object', () => {
      const result = EntityTypesInputSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe('GraphqlExecuteInputSchema', () => {
    it('accepts query string', () => {
      const result = GraphqlExecuteInputSchema.safeParse({ query: '{ projects { id } }' });
      expect(result.success).toBe(true);
    });

    it('accepts optional variables', () => {
      const result = GraphqlExecuteInputSchema.parse({
        query: 'mutation Foo($id: ID!) { foo(id: $id) }',
        variables: { id: '123' },
      });
      expect(result.variables).toEqual({ id: '123' });
    });

    it('rejects missing query', () => {
      const result = GraphqlExecuteInputSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('GraphqlOperationsInputSchema', () => {
    it('accepts empty object', () => {
      const result = GraphqlOperationsInputSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('accepts optional query and kind', () => {
      const result = GraphqlOperationsInputSchema.parse({
        query: 'merge',
        kind: 'mutation',
      });
      expect(result.query).toBe('merge');
      expect(result.kind).toBe('mutation');
    });

    it('rejects invalid kind', () => {
      const result = GraphqlOperationsInputSchema.safeParse({ kind: 'subscription' });
      expect(result.success).toBe(false);
    });

  });

  describe('WorkstreamCreateInputSchema', () => {
    it('accepts minimal input', () => {
      const result = WorkstreamCreateInputSchema.safeParse({
        projectId: 'proj-1',
        title: 'Test Workstream',
      });
      expect(result.success).toBe(true);
    });

    it('accepts full input', () => {
      const result = WorkstreamCreateInputSchema.parse({
        projectId: 'proj-1',
        title: 'Test Workstream',
        model: 'opus',
        groupName: 'My Group',
        createWorktrees: true,
        branchName: 'feature/test',
        baseBranch: 'main',
      });
      expect(result.model).toBe('opus');
      expect(result.createWorktrees).toBe(true);
    });

    it('rejects missing projectId', () => {
      const result = WorkstreamCreateInputSchema.safeParse({ title: 'Test' });
      expect(result.success).toBe(false);
    });

    it('rejects missing title', () => {
      const result = WorkstreamCreateInputSchema.safeParse({ projectId: 'proj-1' });
      expect(result.success).toBe(false);
    });

    it('rejects empty title', () => {
      const result = WorkstreamCreateInputSchema.safeParse({ projectId: 'proj-1', title: '' });
      expect(result.success).toBe(false);
    });
  });

  describe('WorkstreamSendMessageInputSchema', () => {
    it('accepts valid input', () => {
      const result = WorkstreamSendMessageInputSchema.safeParse({
        workstreamId: 'ws-1',
        text: 'Hello agent',
      });
      expect(result.success).toBe(true);
    });

    it('rejects missing workstreamId', () => {
      const result = WorkstreamSendMessageInputSchema.safeParse({ text: 'Hello' });
      expect(result.success).toBe(false);
    });

    it('rejects missing text', () => {
      const result = WorkstreamSendMessageInputSchema.safeParse({ workstreamId: 'ws-1' });
      expect(result.success).toBe(false);
    });

    it('rejects empty text', () => {
      const result = WorkstreamSendMessageInputSchema.safeParse({ workstreamId: 'ws-1', text: '' });
      expect(result.success).toBe(false);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Router Integration — validates tool wiring end-to-end
// ─────────────────────────────────────────────────────────────────────────────

describe('Tool Router Integration', () => {
  function findTool(name: string) {
    const tool = getToolDefinitions().find((t) => t.name === name);
    if (!tool) throw new Error(`Tool ${name} not found`);
    return tool;
  }

  /** Simulate the router: validate input with Zod, then call handler */
  async function routeToolCall(name: string, args: unknown) {
    const tool = findTool(name);
    const parsed = tool.inputSchema.safeParse(args);
    if (!parsed.success) {
      return { content: [{ type: 'text', text: `Invalid input` }], isError: true };
    }
    return tool.handler(parsed.data, createStandardTestContext());
  }

  it('entity_get routes through validation to handler', async () => {
    const result = await routeToolCall('entity_get', { uri: '@vienna//project/proj-1' });
    expect(result.isError).toBeUndefined();
    expect(result.content[0]!.text).toContain(FIXTURES.project1.title);
  });

  it('entity_types routes through validation to handler', async () => {
    const result = await routeToolCall('entity_types', {});
    expect(result.isError).toBeUndefined();
    expect(result.content[0]!.text).toContain('project');
    expect(result.content[0]!.text).toContain('workstream');
  });

  it('workstream_create routes through validation to handler', async () => {
    const result = await routeToolCall('workstream_create', {
      projectId: 'proj-1',
      title: 'New Workstream',
      model: 'opus',
    });
    expect(result.isError).toBeUndefined();
    expect(result.content[0]!.text).toContain('Workstream Created');
    expect(result.content[0]!.text).toContain('New Workstream');
  });

  it('workstream_send_message routes through validation to handler', async () => {
    const result = await routeToolCall('workstream_send_message', {
      workstreamId: 'ws-1',
      text: 'Work on this issue',
    });
    expect(result.isError).toBeUndefined();
    expect(result.content[0]!.text).toContain('Message Sent');
  });


  it('returns validation error for invalid URI format', async () => {
    const result = await routeToolCall('entity_get', { uri: 'not-a-valid-uri' });
    expect(result.isError).toBe(true);
  });

  it('graphql_operations returns filtered operations', async () => {
    const result = await routeToolCall('graphql_operations', { query: 'merge' });
    expect(result.isError).toBeUndefined();
    expect(result.content[0]!.text).toContain('mergePR');
  });

  it('graphql_operations filters by kind', async () => {
    const result = await routeToolCall('graphql_operations', { kind: 'query' });
    expect(result.isError).toBeUndefined();
    expect(result.content[0]!.text).toContain('projects');
    expect(result.content[0]!.text).not.toContain('mergePR');
  });

  it('graphql_execute routes through validation to handler', async () => {
    const result = await routeToolCall('graphql_execute', {
      query: '{ __typename }',
    });
    expect(result.isError).toBeUndefined();
    expect(result.content[0]!.text).toContain('__test');
  });
});
