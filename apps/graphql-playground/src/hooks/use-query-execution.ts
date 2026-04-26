/**
 * useQueryExecution — Manages query execution state
 */

import { useState, useCallback } from 'react';
import { executeQuery } from '@/lib/graphql-client';
import type { GraphQLResult } from '@/lib/graphql-client';

interface ExecutionState {
  result: GraphQLResult | null;
  duration: number | null;
  loading: boolean;
  error: string | null;
}

export function useQueryExecution() {
  const [state, setState] = useState<ExecutionState>({
    result: null,
    duration: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(async (query: string, variables?: Record<string, unknown>) => {
    setState((s) => ({ ...s, loading: true, error: null }));

    try {
      // Parse variables if they're a string
      const vars =
        typeof variables === 'string'
          ? (JSON.parse(variables) as Record<string, unknown>)
          : variables;

      const { result, duration } = await executeQuery(query, vars);

      setState({
        result,
        duration,
        loading: false,
        error: null,
      });

      return { result, duration };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Execution failed';
      setState((s) => ({ ...s, loading: false, error }));
      return null;
    }
  }, []);

  return { ...state, execute };
}
