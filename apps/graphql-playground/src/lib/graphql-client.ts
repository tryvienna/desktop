/**
 * GraphQL Client — HTTP fetch wrappers for the playground API
 */

const API_BASE = '/api/graphql';

export interface GraphQLResult {
  data?: unknown;
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: Array<string | number>;
    extensions?: Record<string, unknown>;
  }>;
}

export interface ExecuteResult {
  result: GraphQLResult;
  /** Response time in milliseconds */
  duration: number;
}

export async function executeQuery(
  query: string,
  variables?: Record<string, unknown>,
  operationName?: string
): Promise<ExecuteResult> {
  const start = performance.now();

  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables, operationName }),
  });

  const result = (await res.json()) as GraphQLResult;
  const duration = performance.now() - start;

  return { result, duration };
}

export async function fetchIntrospection(): Promise<GraphQLResult> {
  const res = await fetch(`${API_BASE}/introspection`);
  return res.json() as Promise<GraphQLResult>;
}

export async function fetchSDL(): Promise<string> {
  const res = await fetch(`${API_BASE}/schema.graphql`);
  return res.text();
}
