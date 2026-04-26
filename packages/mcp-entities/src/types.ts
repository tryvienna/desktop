/**
 * Core Types for MCP Entity Server
 *
 * Defines the ToolContext interface (abstraction over registry access)
 * and the ToolResult type (standard MCP response format).
 *
 * In production, BridgeToolContext implements ToolContext via Unix socket.
 * In tests, createTestContext() wraps real EntityRegistry/IntegrationRegistry.
 */

import type {
  BaseEntity,
  EntityTypeSummary,
} from '@tryvienna/sdk';

/** Abstraction over registry access — bridge in prod, direct registries in tests */
export interface ToolContext {
  /** Get a single entity by URI */
  getEntity(uri: string): Promise<BaseEntity | null>;
  /** Discover registered entity types and their metadata */
  getEntityTypes(): Promise<EntityTypeSummary[]>;
  /** Execute an arbitrary GraphQL query or mutation */
  executeGraphql(
    query: string,
    variables?: Record<string, unknown>
  ): Promise<unknown>;
  /** Discover available GraphQL operations (queries and mutations) */
  getGraphqlOperations(
    query?: string,
    kind?: 'query' | 'mutation'
  ): Promise<GraphqlOperationSummary[]>;

  /** Create a workstream with full directory/worktree inheritance */
  createWorkstream(input: {
    projectId: string;
    title: string;
    model?: string;
    groupId?: string;
    groupName?: string;
    createWorktrees?: boolean;
    branchName?: string;
    baseBranch?: string;
  }): Promise<WorkstreamCreateResult>;

  /** Send a message to a workstream agent (auto-starts if needed) */
  sendWorkstreamMessage(
    workstreamId: string,
    text: string,
  ): Promise<WorkstreamSendMessageResult>;

  /** Add an entity reference to the current workstream */
  addReference(input: {
    entityUri: string;
    entityType: string;
    entityTitle?: string;
  }): Promise<ReferenceResult>;

  /** Remove an entity reference from the current workstream */
  removeReference(entityUri: string): Promise<ReferenceResult>;
}

/** Compact summary of a GraphQL operation for discovery */
export interface GraphqlOperationSummary {
  kind: 'query' | 'mutation';
  name: string;
  description: string;
  args: Array<{
    name: string;
    type: string;
    description?: string;
    /** Fields of an InputObjectType arg (one level deep) — helps agents construct correct variables */
    inputFields?: Array<{ name: string; type: string; description?: string }>;
  }>;
  returnType: string;
  /** Top-level field names on the return type (for generating example queries) */
  returnFields?: string[];
}

/** Result of workstream creation via MCP */
export interface WorkstreamCreateResult {
  workstream: {
    id: string;
    title: string;
    status: string;
    model: string | null;
  };
  worktrees?: Array<{
    directoryPath: string;
    branch: string;
    worktreePath?: string;
    error?: string;
  }>;
}

/** Result of adding/removing a workstream reference via MCP */
export interface ReferenceResult {
  success: boolean;
  entityUri: string;
}

/** Result of sending a message to a workstream via MCP */
export interface WorkstreamSendMessageResult {
  workstream: {
    id: string;
    status: string;
    messageCount: number;
  };
}

/**
 * Standard MCP tool response.
 * Index signature required for compatibility with MCP SDK's CallToolResult type.
 */
export interface ToolResult {
  [key: string]: unknown;
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

/** Create an error ToolResult */
export function errorResult(message: string): ToolResult {
  return {
    content: [{ type: 'text', text: message }],
    isError: true,
  };
}

/** Create a success ToolResult */
export function textResult(text: string): ToolResult {
  return {
    content: [{ type: 'text', text }],
  };
}
