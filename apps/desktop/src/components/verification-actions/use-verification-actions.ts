/**
 * useVerificationActions — Manages verification actions with localStorage persistence.
 *
 * On first visit, seeds from registry defaults via GraphQL.
 * Subsequent visits load from localStorage without network.
 * Supports reset-to-defaults.
 *
 * Uses a module-level store with useSyncExternalStore so all consumers
 * (ChatView action bar + config drawer) share the same reactive state.
 *
 * @module verification-actions/use-verification-actions
 */

import { useSyncExternalStore, useCallback, useEffect, useRef } from 'react';
import {
  useApolloClient,
  GET_REGISTRY_VERIFICATION_ACTION_DEFAULTS,
} from '@vienna/graphql/client';
import type {
  VerificationActionConfig,
  VerificationActionsState,
} from './types';

const STORAGE_KEY = 'vienna:verification-actions';

// ── Module-level shared store ──────────────────────────────────────────────

type Listener = () => void;

const listeners = new Set<Listener>();

let currentState: VerificationActionsState = { actions: [], initialized: false, modified: false };
let stateLoaded = false;

function loadFromStorage(): VerificationActionsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { actions: [], initialized: false, modified: false };
    return JSON.parse(raw) as VerificationActionsState;
  } catch {
    return { actions: [], initialized: false, modified: false };
  }
}

function ensureLoaded(): void {
  if (stateLoaded) return;
  stateLoaded = true;
  currentState = loadFromStorage();
}

function setState(state: VerificationActionsState): void {
  currentState = state;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota exceeded */
  }
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): VerificationActionsState {
  ensureLoaded();
  return currentState;
}

/** Map GraphQL verification action response to local config shape. */
type VerificationActionGQL = {
  id?: string | null;
  type?: string | null;
  label?: string | null;
  builtinId?: string | null;
  prompt?: string | null;
};

function toConfig(a: VerificationActionGQL): VerificationActionConfig {
  return {
    id: a.id ?? '',
    type: (a.type as 'builtin' | 'prompt') ?? 'builtin',
    label: a.label ?? '',
    builtinId: a.builtinId ?? undefined,
    prompt: a.prompt ?? undefined,
    source: 'registry' as const,
  };
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useVerificationActions() {
  const client = useApolloClient();
  const state = useSyncExternalStore(subscribe, getSnapshot);
  const initRef = useRef(false);

  // Seed from registry on first mount if not yet initialized
  useEffect(() => {
    if (initRef.current || state.initialized) return;
    initRef.current = true;

    client
      .query({ query: GET_REGISTRY_VERIFICATION_ACTION_DEFAULTS })
      .then((result) => {
        const defaults = result.data.registryVerificationActionDefaults ?? [];
        const seeded = defaults.map((a) => toConfig(a));

        setState({ actions: seeded, initialized: true, modified: false });
      })
      .catch(() => {
        setState({ actions: [], initialized: true, modified: false });
      });
  }, [client, state.initialized]);

  const saveActions = useCallback((updated: VerificationActionConfig[]) => {
    setState({ actions: updated, initialized: true, modified: true });
  }, []);

  const resetToDefaults = useCallback(async () => {
    const result = await client.query({
      query: GET_REGISTRY_VERIFICATION_ACTION_DEFAULTS,
      fetchPolicy: 'network-only',
    });
    const defaults = result.data.registryVerificationActionDefaults ?? [];
    const seeded = defaults.map((a) => toConfig(a as VerificationActionGQL));

    setState({ actions: seeded, initialized: true, modified: false });
  }, [client]);

  return {
    actions: state.actions,
    modified: state.modified,
    isLoading: !state.initialized,
    saveActions,
    resetToDefaults,
  };
}
