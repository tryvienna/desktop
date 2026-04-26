/**
 * useQuickActions — Manages quick action categories with localStorage persistence.
 *
 * On first visit, seeds from registry defaults via GraphQL.
 * Subsequent visits load from localStorage without network.
 * Registry browsing uses on-demand GraphQL queries.
 *
 * @module quick-actions/use-quick-actions
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  useApolloClient,
  GET_REGISTRY_QUICK_ACTIONS,
  GET_REGISTRY_QUICK_ACTION_DEFAULTS,
} from '@vienna/graphql/client';
import type { QuickActionCategoryWithSource, QuickActionsState, RegistryQuickAction } from './types';

const STORAGE_KEY = 'vienna:quick-actions';

/** Custom event dispatched when the active content profile changes. */
export const PROFILE_SWITCH_EVENT = 'vienna:profile-switched';

function readState(): QuickActionsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { categories: [], initialized: false };
    return JSON.parse(raw) as QuickActionsState;
  } catch {
    return { categories: [], initialized: false };
  }
}

function writeState(state: QuickActionsState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota exceeded */
  }
}

export function useQuickActions() {
  const client = useApolloClient();
  const [categories, setCategories] = useState<QuickActionCategoryWithSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const initRef = useRef(false);

  const seedFromRegistry = useCallback(() => {
    setIsLoading(true);
    Promise.all([
      client.query({ query: GET_REGISTRY_QUICK_ACTION_DEFAULTS, fetchPolicy: 'network-only' }),
      client.query({ query: GET_REGISTRY_QUICK_ACTIONS, fetchPolicy: 'network-only' }),
    ])
      .then(([defaultsResult, actionsResult]) => {
        const defaultIds = new Set(defaultsResult.data.registryQuickActionDefaults ?? []);
        const allActions = actionsResult.data.registryQuickActions ?? [];

        const seeded: QuickActionCategoryWithSource[] = allActions
          .filter((a) => a.id && defaultIds.has(a.id))
          .map((a) => ({
            id: a.id ?? '',
            label: a.label ?? '',
            icon: a.icon ?? '',
            options: (a.options ?? []).map((o) => ({
              id: o.id ?? '',
              label: o.label ?? '',
              prompt: o.prompt ?? '',
            })),
            source: 'registry' as const,
          }));

        const newState: QuickActionsState = { categories: seeded, initialized: true };
        writeState(newState);
        setCategories(seeded);
      })
      .catch(() => {
        const newState: QuickActionsState = { categories: [], initialized: true };
        writeState(newState);
        setCategories([]);
      })
      .finally(() => setIsLoading(false));
  }, [client]);

  // Load on mount — from localStorage or seed from registry
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const state = readState();
    if (state.initialized) {
      setCategories(state.categories);
      setIsLoading(false);
      return;
    }

    seedFromRegistry();
  }, [client, seedFromRegistry]);

  // Re-seed when the active content profile changes
  useEffect(() => {
    const handler = () => {
      localStorage.removeItem(STORAGE_KEY);
      seedFromRegistry();
    };
    window.addEventListener(PROFILE_SWITCH_EVENT, handler);
    return () => window.removeEventListener(PROFILE_SWITCH_EVENT, handler);
  }, [seedFromRegistry]);

  const saveCategories = useCallback((updated: QuickActionCategoryWithSource[]) => {
    setCategories(updated);
    writeState({ categories: updated, initialized: true });
  }, []);

  const browseRegistry = useCallback(async (): Promise<RegistryQuickAction[]> => {
    const result = await client.query({
      query: GET_REGISTRY_QUICK_ACTIONS,
      fetchPolicy: 'network-only',
    });
    return (result.data.registryQuickActions ?? []).map((a) => ({
      id: a.id ?? '',
      label: a.label ?? '',
      icon: a.icon ?? '',
      description: a.description ?? '',
      author: { name: a.author?.name ?? '' },
      tags: [...(a.tags ?? [])],
      options: (a.options ?? []).map((o) => ({
        id: o.id ?? '',
        label: o.label ?? '',
        prompt: o.prompt ?? '',
      })),
    }));
  }, [client]);

  const addFromRegistry = useCallback(
    (action: RegistryQuickAction) => {
      const newCat: QuickActionCategoryWithSource = {
        id: action.id,
        label: action.label,
        icon: action.icon,
        options: action.options.map((o) => ({ id: o.id, label: o.label, prompt: o.prompt })),
        source: 'registry',
      };
      setCategories((prev) => {
        const updated = [...prev, newCat];
        writeState({ categories: updated, initialized: true });
        return updated;
      });
    },
    [],
  );

  return { categories, isLoading, saveCategories, browseRegistry, addFromRegistry };
}
