/**
 * MCP Server Factory
 *
 * Creates an MCP server with all entity tools registered.
 * Tool routing, input validation, and error handling are centralized here.
 * Tool handlers never validate input or catch errors — the router does both.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import type { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

import type { ToolContext, ToolResult } from './types';
import { errorResult } from './types';
import {
  EntityGetInputSchema,
  EntityTypesInputSchema,
  GraphqlExecuteInputSchema,
  GraphqlOperationsInputSchema,
  WorkstreamCreateInputSchema,
  WorkstreamSendMessageInputSchema,
  ReferenceAddInputSchema,
  ReferenceRemoveInputSchema,
} from './schemas';
import { handleEntityGet } from './tools/entity-get';
import { handleEntityTypes } from './tools/entity-types';
import { handleGraphqlExecute } from './tools/graphql-execute';
import { handleGraphqlOperations } from './tools/graphql-operations';
import { handleWorkstreamCreate } from './tools/workstream-create';
import { handleWorkstreamSendMessage } from './tools/workstream-send-message';
import { handleReferenceAdd } from './tools/reference-add';
import { handleReferenceRemove } from './tools/reference-remove';

/** Strip $schema from zodToJsonSchema output — MCP protocol expects raw JSON Schema objects. */
function stripSchemaField(schema: Record<string, unknown>): Record<string, unknown> {
  const { $schema, ...rest } = schema;
  return rest;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tool Registry
// ─────────────────────────────────────────────────────────────────────────────

interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: z.ZodType;
  handler: (input: unknown, ctx: ToolContext) => Promise<ToolResult>;
}

/** Type-safe tool definition — ensures handler input type matches the Zod schema output */
function tool<T>(def: {
  name: string;
  description: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inputSchema: z.ZodType<T, z.ZodTypeDef, any>;
  handler: (input: T, ctx: ToolContext) => Promise<ToolResult>;
}): ToolDefinition {
  return def as ToolDefinition;
}

/**
 * All registered MCP tools. Ordered by priority — GraphQL discovery first.
 * Data-driven — add new tools here.
 */
const TOOLS: ToolDefinition[] = [
  tool({
    name: 'graphql_operations',
    description:
      'Discover available queries and mutations. ' +
      'Describe your intent in plain English (e.g., "add label to issue", "list workstreams", "create project") ' +
      'to get full operation specs with args and example queries. ' +
      'For broader browsing, use a single keyword (e.g., "issue", "workstream"). ' +
      'If you get a compact catalog, call again with the exact operation name for the full spec.',
    inputSchema: GraphqlOperationsInputSchema,
    handler: handleGraphqlOperations,
  }),
  tool({
    name: 'graphql_execute',
    description:
      'Execute a GraphQL query or mutation against the Vienna schema. ' +
      'Use graphql_operations first to discover the operation name and arguments.',
    inputSchema: GraphqlExecuteInputSchema,
    handler: handleGraphqlExecute,
  }),
  tool({
    name: 'entity_types',
    description:
      'Discover registered entity types and integrations. ' +
      'Shows available entity types, URI patterns, and integration methods. ' +
      'Use graphql_operations to find typed queries for each entity type.',
    inputSchema: EntityTypesInputSchema,
    handler: handleEntityTypes,
  }),
  tool({
    name: 'entity_get',
    description:
      'Get details of a Vienna entity by URI (@vienna//type/id). ' +
      'Use for resolving entity references in context.',
    inputSchema: EntityGetInputSchema,
    handler: handleEntityGet,
  }),
  tool({
    name: 'workstream_create',
    description:
      'Create a new Vienna workstream with optional model, group, and git worktree. Inherits project directories automatically. Use createWorktrees=true to give the workstream its own git branch and working copy.',
    inputSchema: WorkstreamCreateInputSchema,
    handler: handleWorkstreamCreate,
  }),
  tool({
    name: 'workstream_send_message',
    description:
      'Send a message to a Vienna workstream agent. Auto-starts the agent if not running. Use this to delegate tasks to workstreams programmatically.',
    inputSchema: WorkstreamSendMessageInputSchema,
    handler: handleWorkstreamSendMessage,
  }),
  tool({
    name: 'reference_add',
    description:
      'Add an entity reference to this workstream. Use after creating or mentioning a PR, issue, doc, or other trackable entity so it appears in the workstream sidebar. Example: after creating a GitHub PR, call this with the PR URI.',
    inputSchema: ReferenceAddInputSchema,
    handler: handleReferenceAdd,
  }),
  tool({
    name: 'reference_remove',
    description:
      'Remove an entity reference from this workstream. Use to dismiss a reference that is no longer relevant.',
    inputSchema: ReferenceRemoveInputSchema,
    handler: handleReferenceRemove,
  }),
];

// ─────────────────────────────────────────────────────────────────────────────
// Server Factory
// ─────────────────────────────────────────────────────────────────────────────

/** Create an MCP server with all entity tools wired to the given context */
export function createMcpServer(ctx: ToolContext): Server {
  const server = new Server(
    { name: '@vienna/mcp-entities', version: '0.1.0' },
    { capabilities: { tools: {} } }
  );

  // List available tools with JSON Schema definitions
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: stripSchemaField(zodToJsonSchema(tool.inputSchema)),
    })),
  }));

  // Route tool calls: validate → handle → catch errors
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    const tool = TOOLS.find((t) => t.name === name);
    if (!tool) {
      return errorResult(`Unknown tool: ${name}`);
    }

    // Validate input with Zod
    const parsed = tool.inputSchema.safeParse(args ?? {});
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
      return errorResult(`Invalid input:\n${issues.join('\n')}`);
    }

    // Execute handler with centralized error catching
    try {
      return await tool.handler(parsed.data, ctx);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return errorResult(`Error executing ${name}: ${message}`);
    }
  });

  return server;
}

/** Exported for testing: get tool definitions */
export function getToolDefinitions(): ReadonlyArray<ToolDefinition> {
  return TOOLS;
}
