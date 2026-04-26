/**
 * MCP Request Handlers — Route through GraphQL
 *
 * All handlers execute GraphQL queries/mutations using graphql-js execute(),
 * the same path the renderer uses via IPC. This ensures:
 * - Consistent authorization, validation, and error handling
 * - Single API surface — GraphQL is the unified data layer
 * - Cache invalidation awareness for the renderer
 *
 * Methods:
 *   graphql.operations  → schema introspection (operation discovery)
 *   graphql.execute     → arbitrary GraphQL query/mutation
 *   entity.get          → query entity
 *   entity.types        → query entityTypes + integrations
 */

import { executeGraphQL, getSchema } from '@vienna/graphql/schema';
import type { GraphQLContext } from '@vienna/graphql';
import type { Logger } from '@vienna/logger';
import type { MCPHandler } from './types';
import {
  getInputTypeFields,
  getUnwrappedTypeName,
  buildOperationSummary,
  resolveOperationSpecs,
  type OperationSummary,
  type InputFieldInfo,
} from './schema-utils';
import type { IntentClassifier } from '../agent/intent-classifier';

// ─────────────────────────────────────────────────────────────────────────────
// GraphQL execution helper
// ─────────────────────────────────────────────────────────────────────────────

async function gql(
  ctx: GraphQLContext,
  query: string,
  variables?: Record<string, unknown>,
  log?: Logger,
): Promise<unknown> {
  log?.debug('Executing GraphQL query', { variables });
  const result = await executeGraphQL(ctx, query, variables);

  if (result.errors?.length) {
    log?.error('GraphQL execution error', {
      errors: result.errors.map((e: { message: string }) => e.message),
    });
    throw new Error(result.errors.map((e: { message: string }) => e.message).join('; '));
  }

  return result.data;
}

// ─────────────────────────────────────────────────────────────────────────────
// GraphQL query/mutation strings
// ─────────────────────────────────────────────────────────────────────────────

const ENTITY_GET = `
  query EntityGet($uri: String!) {
    entity(uri: $uri) {
      id type uri title description createdAt updatedAt
    }
  }
`;

const ENTITY_TYPES = `
  query EntityTypes {
    entityTypes {
      type displayName icon source uriExample display
    }
    integrations {
      id displayName icon
    }
  }
`;

const CREATE_WORKSTREAM = `
  mutation CreateWorkstream($input: CreateWorkstreamInput!) {
    createWorkstream(input: $input) {
      workstream { id title status model isPinned messageCount createdAt updatedAt }
      worktrees { directoryPath branch worktreePath error }
    }
  }
`;

const SEND_WORKSTREAM_MESSAGE = `
  mutation SendWorkstreamMessage($workstreamId: ID!, $text: String!) {
    sendWorkstreamMessage(workstreamId: $workstreamId, text: $text) {
      workstream { id status messageCount lastActivityAt updatedAt }
    }
  }
`;

const ADD_WORKSTREAM_REFERENCE = `
  mutation AddWorkstreamReference($workstreamId: ID!, $entityUri: String!, $entityType: String!, $entityTitle: String) {
    addWorkstreamReference(workstreamId: $workstreamId, entityUri: $entityUri, entityType: $entityType, entityTitle: $entityTitle) {
      workstream { id updatedAt }
    }
  }
`;

const REMOVE_WORKSTREAM_REFERENCE = `
  mutation RemoveWorkstreamReference($workstreamId: ID!, $entityUri: String!) {
    removeWorkstreamReference(workstreamId: $workstreamId, entityUri: $entityUri) {
      workstream { id updatedAt }
    }
  }
`;

// ─────────────────────────────────────────────────────────────────────────────
// Handler factory
// ─────────────────────────────────────────────────────────────────────────────

/** Emitter for GraphQL cache invalidation events sent to the renderer */
export interface GraphqlCacheEmitter {
  onInvalidate: (payload: { typename: string; id?: string; keyFields?: Record<string, string> }) => void;
}

interface HandlerDeps {
  graphqlContext: GraphQLContext;
  graphqlEmitter?: GraphqlCacheEmitter;
  log?: Logger;
  /** Optional intent classifier for semantic operation matching */
  intentClassifier?: IntentClassifier;
  /** Fetch recent conversation messages for a workstream (user + assistant text, newest last) */
  getRecentMessages?: (workstreamId: string) => string[];
}

/** Try to extract the first operation name from a GraphQL query string */
function extractOperationName(query: string): string | undefined {
  // Matches: `{ opName(`, `query { opName(`, `mutation($x: T!) { opName(`
  const match = /(?:query|mutation)\s*(?:\([^)]*\)\s*)?\{\s*(\w+)|^\s*\{\s*(\w+)/m.exec(query);
  return match?.[1] ?? match?.[2];
}

/** Enrich a GraphQL error message with schema hints for the failed operation */
function enrichErrorWithSchemaHints(query: string, message: string): string {
  try {
    const opName = extractOperationName(query);
    if (!opName) return message;

    const schema = getSchema();
    const field =
      schema.getQueryType()?.getFields()[opName] ??
      schema.getMutationType()?.getFields()[opName];
    if (!field) return message;

    const formatFields = (fields: InputFieldInfo[]): string =>
      ` { ${fields.map((f) => {
        const nested = f.inputFields ? formatFields(f.inputFields) : '';
        return `${f.name}: ${f.type}${nested}`;
      }).join(', ')} }`;

    const argHints = field.args.map((a) => {
      const fields = getInputTypeFields(a.type);
      const fieldStr = fields ? formatFields(fields) : '';
      return `  ${a.name}: ${a.type.toString()}${fieldStr}`;
    });

    if (argHints.length === 0) return message;

    return `${message}\n\nHint — expected args for \`${opName}\`:\n${argHints.join('\n')}`;
  } catch {
    // Don't let enrichment failures mask the original error
    return message;
  }
}

/**
 * Create all MCP request handlers.
 * Returns a Map of method name → handler function.
 */
export function createHandlers(deps: HandlerDeps): Map<string, MCPHandler> {
  const { graphqlContext: ctx, log: parentLog } = deps;
  const log = parentLog?.child({ component: 'MCPHandlers' });
  const handlers = new Map<string, MCPHandler>();

  // ─── graphql.operations ─────────────────────────────────────────────────

  handlers.set('graphql.operations', async (params) => {
    const query = params['query'] as string | undefined;
    const kind = params['kind'] as 'query' | 'mutation' | undefined;
    const workstreamId = params['_workstreamId'] as string | undefined;
    log?.info('graphql.operations', { query, kind, workstreamId });

    const schema = getSchema();

    const typePairs: Array<['query' | 'mutation', ReturnType<typeof schema.getQueryType>]> = [];
    if (!kind || kind === 'query') typePairs.push(['query', schema.getQueryType()]);
    if (!kind || kind === 'mutation') typePairs.push(['mutation', schema.getMutationType()]);

    // Exact-name fast path — when the query exactly matches an operation name,
    // return only that operation (ensures full spec after compact catalog discovery)
    if (query) {
      const q = query.toLowerCase();
      for (const [opKind, type] of typePairs) {
        if (!type) continue;
        const fields = type.getFields();
        for (const [name, field] of Object.entries(fields)) {
          if (name.toLowerCase() === q) {
            const operations = [buildOperationSummary(opKind, name, field)];
            log?.info('graphql.operations result (exact match)', { count: 1 });
            return { operations };
          }
        }
      }
    }

    // Semantic classification path — when an intent classifier is available,
    // use it to identify the best operations for natural language queries.
    // Fetches recent conversation messages for the workstream to give the
    // classifier full context (not just the terse keyword query from Claude).
    // Falls through to string matching if classification fails or returns nothing.
    if (query && deps.intentClassifier) {
      try {
        const recentMessages = (workstreamId && deps.getRecentMessages)
          ? deps.getRecentMessages(workstreamId)
          : [];
        const classification = await deps.intentClassifier.classify(query, recentMessages);
        if (classification && classification.operationNames.length > 0) {
          const operations = resolveOperationSpecs(classification.operationNames);
          if (operations.length > 0) {
            log?.info('graphql.operations result (classified)', {
              count: operations.length,
              confidence: classification.confidence,
              latencyMs: classification.latencyMs,
            });
            return { operations };
          }
        }
      } catch {
        // Fall through to string matching
      }
    }

    // Stop words that don't carry semantic meaning for operation matching
    const STOP_WORDS = new Set(['a', 'an', 'the', 'to', 'from', 'for', 'in', 'on', 'of', 'with', 'by', 'and', 'or', 'is', 'it', 'my', 'me', 'all', 'get', 'set', 'do']);

    // Action words that imply a mutation (write operation)
    const MUTATION_WORDS = new Set(['add', 'remove', 'update', 'create', 'delete', 'edit', 'change', 'modify', 'assign', 'unassign', 'close', 'reopen', 'merge', 'move', 'rename', 'archive']);

    const nameMatches: OperationSummary[] = [];
    const descMatches: OperationSummary[] = [];
    const returnTypeMatches: OperationSummary[] = [];

    // Detect if the query implies a mutation
    const queryWords = query ? query.toLowerCase().split(/\s+/).filter((w) => w && !STOP_WORDS.has(w)) : [];
    const impliesMutation = queryWords.some((w) => MUTATION_WORDS.has(w));

    for (const [opKind, type] of typePairs) {
      if (!type) continue;
      const fields = type.getFields();
      for (const [name, field] of Object.entries(fields)) {
        // Skip internal fields
        if (name.startsWith('__')) continue;

        const op = buildOperationSummary(opKind, name, field);

        if (query) {
          const words = queryWords;
          if (words.length === 0) {
            // All stop words — include all
            nameMatches.push(op);
            continue;
          }

          const nameLower = name.toLowerCase();
          const descLower = (field.description ?? '').toLowerCase();
          const returnTypeLower = getUnwrappedTypeName(field.type).toLowerCase();

          // Also collect input field names for matching (e.g. "labels" on UpdateGitHubIssueInput)
          const inputFieldNames = field.args
            .flatMap((a) => {
              const fields = getInputTypeFields(a.type);
              return fields ? fields.map((f) => f.name.toLowerCase()) : [];
            })
            .join(' ');

          // Words matching in name or input fields (strong signals)
          const nameOrInputWords = words.filter((w) =>
            nameLower.includes(w) || inputFieldNames.includes(w),
          );
          // Words matching only in description or return type (weak signals)
          const weakOnlyWords = words.filter((w) =>
            !nameLower.includes(w) && !inputFieldNames.includes(w) && (descLower.includes(w) || returnTypeLower.includes(w)),
          );
          const matchCount = nameOrInputWords.length + weakOnlyWords.length;

          // Require at least half of meaningful words to match (handles action verbs like "remove" that don't appear in schema)
          if (matchCount < Math.ceil(words.length / 2)) {
            // Too few matches → skip
          } else if (impliesMutation && opKind === 'query') {
            // Query implies mutation but this is a read operation — demote to lowest tier
            // e.g. "add label to issue" should rank githubUpdateIssue above searchGithubIssues
            returnTypeMatches.push(op);
          } else {
            // Priority: how many words matched in name?
            const nameWordCount = words.filter((w) => nameLower.includes(w)).length;
            if (nameWordCount === words.length) {
              nameMatches.push(op);
            } else if (nameOrInputWords.length > 0) {
              descMatches.push(op);
            } else {
              returnTypeMatches.push(op);
            }
          }
        } else {
          // No query filter — include all
          nameMatches.push(op);
        }
      }
    }

    // Priority: name matches → description matches → return type matches
    // When mutation is implied, sort mutations before queries within each tier
    const sortMutationsFirst = (a: OperationSummary, b: OperationSummary) =>
      impliesMutation ? (a.kind === 'mutation' ? -1 : 1) - (b.kind === 'mutation' ? -1 : 1) : 0;
    nameMatches.sort(sortMutationsFirst);
    descMatches.sort(sortMutationsFirst);

    const operations = [...nameMatches, ...descMatches, ...returnTypeMatches];

    log?.info('graphql.operations result', { count: operations.length });
    return { operations };
  });

  // ─── graphql.execute ────────────────────────────────────────────────────

  handlers.set('graphql.execute', async (params) => {
    const query = params['query'] as string;
    const variables = params['variables'] as Record<string, unknown> | undefined;
    log?.info('graphql.execute', { query: query.slice(0, 100) });

    let data: unknown;
    try {
      data = await gql(ctx, query, variables, log);
    } catch (err) {
      // Enrich error with schema hints so the agent can self-correct
      const message = err instanceof Error ? err.message : String(err);
      const enriched = enrichErrorWithSchemaHints(query, message);
      throw new Error(enriched);
    }

    // Invalidate the renderer's Apollo cache for mutations.
    // We can't know exactly what changed, so invalidate Query root.
    if (query.trimStart().startsWith('mutation') && deps.graphqlEmitter) {
      deps.graphqlEmitter.onInvalidate({ typename: 'Query' });
    }

    log?.info('graphql.execute result');
    return data;
  });

  // ─── entity.get ──────────────────────────────────────────────────────────

  handlers.set('entity.get', async (params) => {
    log?.info('entity.get', { uri: params['uri'] });
    const data = (await gql(ctx, ENTITY_GET, {
      uri: params['uri'] as string,
    }, log)) as { entity: unknown | null };

    log?.info('entity.get result', { found: data.entity != null });
    return { entity: data.entity };
  });

  // ─── entity.types ────────────────────────────────────────────────────────

  handlers.set('entity.types', async () => {
    log?.info('entity.types');
    const data = (await gql(ctx, ENTITY_TYPES, undefined, log)) as {
      entityTypes: unknown[];
      integrations: unknown[];
    };

    log?.info('entity.types result', {
      typeCount: data.entityTypes.length,
      integrationCount: data.integrations.length,
    });

    return {
      types: data.entityTypes,
      integrations: data.integrations.length > 0 ? data.integrations : undefined,
    };
  });

  // ─── workstream.create ────────────────────────────────────────────────

  handlers.set('workstream.create', async (params) => {
    const input = params as {
      projectId: string;
      title: string;
      model?: string;
      groupId?: string;
      groupName?: string;
      createWorktrees?: boolean;
      branchName?: string;
      baseBranch?: string;
    };
    log?.info('workstream.create', { projectId: input.projectId, title: input.title, model: input.model });

    // Single mutation handles everything: group resolution, directory inheritance, worktree creation
    const data = (await gql(ctx, CREATE_WORKSTREAM, {
      input: {
        projectId: input.projectId,
        title: input.title,
        model: input.model ?? null,
        groupId: input.groupId ?? null,
        groupName: input.groupName ?? null,
        createWorktrees: input.createWorktrees ?? false,
        branchName: input.branchName ?? null,
        baseBranch: input.baseBranch ?? null,
      },
    }, log)) as {
      createWorkstream: {
        workstream: { id: string; title: string; status: string; model: string | null };
        worktrees: Array<{ directoryPath: string; branch: string; worktreePath: string | null; error: string | null }> | null;
      };
    };

    const { workstream, worktrees } = data.createWorkstream;

    // Invalidate renderer cache
    if (deps.graphqlEmitter) {
      deps.graphqlEmitter.onInvalidate({ typename: 'Workstream' });
    }

    log?.info('workstream.create result', { workstreamId: workstream.id, worktreeCount: worktrees?.length ?? 0 });
    return { workstream, worktrees: worktrees ?? undefined };
  });

  // ─── workstream.sendMessage ───────────────────────────────────────────

  handlers.set('workstream.sendMessage', async (params) => {
    const input = params as { workstreamId: string; text: string };
    log?.info('workstream.sendMessage', { workstreamId: input.workstreamId });

    const data = (await gql(ctx, SEND_WORKSTREAM_MESSAGE, {
      workstreamId: input.workstreamId,
      text: input.text,
    }, log)) as { sendWorkstreamMessage: { workstream: { id: string; status: string; messageCount: number } } };

    // Invalidate renderer cache
    if (deps.graphqlEmitter) {
      deps.graphqlEmitter.onInvalidate({
        typename: 'Workstream',
        id: input.workstreamId,
        keyFields: { id: input.workstreamId },
      });
    }

    log?.info('workstream.sendMessage result', { workstreamId: input.workstreamId });
    return data.sendWorkstreamMessage;
  });

  // ─── reference.add ──────────────────────────────────────────────────────

  handlers.set('reference.add', async (params) => {
    const input = params as { workstreamId?: string; entityUri: string; entityType: string; entityTitle?: string };
    const workstreamId = input.workstreamId;
    if (!workstreamId) throw new Error('workstreamId is required for reference.add');

    log?.info('reference.add', { workstreamId, entityUri: input.entityUri });

    await gql(ctx, ADD_WORKSTREAM_REFERENCE, {
      workstreamId,
      entityUri: input.entityUri,
      entityType: input.entityType,
      entityTitle: input.entityTitle ?? null,
    }, log);

    if (deps.graphqlEmitter) {
      deps.graphqlEmitter.onInvalidate({ typename: 'WorkstreamReference' });
    }

    return { success: true, entityUri: input.entityUri };
  });

  // ─── reference.remove ───────────────────────────────────────────────────

  handlers.set('reference.remove', async (params) => {
    const input = params as { workstreamId?: string; entityUri: string };
    const workstreamId = input.workstreamId;
    if (!workstreamId) throw new Error('workstreamId is required for reference.remove');

    log?.info('reference.remove', { workstreamId, entityUri: input.entityUri });

    await gql(ctx, REMOVE_WORKSTREAM_REFERENCE, {
      workstreamId,
      entityUri: input.entityUri,
    }, log);

    if (deps.graphqlEmitter) {
      deps.graphqlEmitter.onInvalidate({ typename: 'WorkstreamReference' });
    }

    return { success: true, entityUri: input.entityUri };
  });

  return handlers;
}
