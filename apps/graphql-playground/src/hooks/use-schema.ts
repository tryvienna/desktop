/**
 * useSchema — Fetch introspection and build a client-side GraphQL schema
 *
 * Uses buildClientSchema() to reconstruct a full GraphQLSchema in the browser
 * from introspection JSON. This schema is used by cm6-graphql for autocomplete,
 * linting, and hover — without importing any Node-only modules.
 */

import { useState, useEffect } from 'react';
import { buildClientSchema } from 'graphql';
import type { GraphQLSchema, IntrospectionQuery } from 'graphql';
import { fetchIntrospection, fetchSDL } from '@/lib/graphql-client';

interface SchemaState {
  schema: GraphQLSchema | null;
  introspection: IntrospectionQuery | null;
  sdl: string | null;
  loading: boolean;
  error: string | null;
}

export function useSchema() {
  const [state, setState] = useState<SchemaState>({
    schema: null,
    introspection: null,
    sdl: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [introspectionResult, sdl] = await Promise.all([fetchIntrospection(), fetchSDL()]);

        if (cancelled) return;

        if (introspectionResult.errors) {
          setState((s) => ({
            ...s,
            loading: false,
            error: introspectionResult.errors![0]!.message,
          }));
          return;
        }

        const introspection = introspectionResult.data as unknown as IntrospectionQuery;
        const schema = buildClientSchema(introspection);

        setState({
          schema,
          introspection,
          sdl,
          loading: false,
          error: null,
        });
      } catch (err) {
        if (cancelled) return;
        setState((s) => ({
          ...s,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to load schema',
        }));
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
