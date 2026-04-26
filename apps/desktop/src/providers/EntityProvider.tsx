/**
 * EntityProvider — React context for entity palette data.
 *
 * @ai-context
 * Bridges GraphQL entity search and IPC file search into a single
 * EntityPaletteDataProvider consumed by ChatInputUnified's @ palette.
 *
 * - Tabs are auto-generated from GET_ENTITY_TYPES + a static "Files" tab
 * - "All" tab cross-searches all entity types via SEARCH_ENTITIES
 * - Type-specific tabs use GET_ENTITIES
 * - "local_file" tab routes to IPC file search (FileIndexService in main process)
 * - Recents stored in localStorage (entity metadata cached, no round-trip needed)
 * - Active workstream directories are indexed on mount/change via setDirectories
 *   (replaces the full indexed set so files from other worktrees are excluded)
 *
 * @module providers/EntityProvider
 */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { useQuery, useApolloClient } from '@vienna/graphql/client';
import { GET_ENTITY_TYPES, SEARCH_ENTITIES, GET_ENTITIES, GET_DIRECTORIES_WITH_BRANCH_INFO } from '@vienna/graphql/client';
import { getApi } from '@vienna/ipc/renderer';
import { api } from '../ipc';
import { useActiveWorkstreamId } from '../renderer/contexts/WorkstreamContext';
import { buildEntityURI } from '@vienna/chat-ui';
import type {
  PaletteEntity as Entity,
  EntityType,
  EntityPaletteDataProvider,
  PaletteTab,
} from '@vienna/chat-ui';

// =============================================================================
// CONSTANTS
// =============================================================================

const RECENTS_KEY = 'vienna:entity-palette:recents';
const MAX_RECENTS = 20;

// =============================================================================
// RECENTS (localStorage)
// =============================================================================

interface RecentEntry {
  id: string;
  type: string;
  uri?: string;
  title: string;
  subtitle?: string;
  accessedAt: number;
}

function loadRecents(): RecentEntry[] {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is RecentEntry =>
        typeof x === 'object' && x !== null && typeof x.id === 'string' && typeof x.type === 'string'
    );
  } catch {
    return [];
  }
}

function saveRecent(entity: Entity): void {
  try {
    const recents = loadRecents().filter((r) => !(r.id === entity.id && r.type === entity.type));
    recents.unshift({
      id: entity.id,
      type: entity.type,
      uri: entity.uri,
      title: entity.title,
      subtitle: entity.subtitle,
      accessedAt: Date.now(),
    });
    localStorage.setItem(RECENTS_KEY, JSON.stringify(recents.slice(0, MAX_RECENTS)));
  } catch {
    // Ignore storage quota errors
  }
}

// =============================================================================
// ENTITY CONVERSION
// =============================================================================

/** Convert a nullable GraphQL entity to the Entity type. Skips entries with missing required fields. */
function graphqlToEntity(gql: {
  id?: string | null;
  type?: string | null;
  uri?: string | null;
  title?: string | null;
  description?: string | null;
}): Entity | null {
  if (!gql.id || !gql.type || !gql.title) return null;
  return {
    id: gql.id,
    type: gql.type,
    uri: gql.uri ?? undefined,
    title: gql.title,
    subtitle: gql.description ?? undefined,
    source: 'builtin',
  };
}

function mapGraphqlResults(results: ReadonlyArray<{ id?: string | null; type?: string | null; title?: string | null; description?: string | null }>): Entity[] {
  const entities: Entity[] = [];
  for (const r of results) {
    const e = graphqlToEntity(r);
    if (e) entities.push(e);
  }
  return entities;
}

interface FileSearchResult {
  path: string;
  name: string;
  relativePath: string;
  projectRoot: string;
  extension?: string;
  score: number;
}

function fileToEntity(file: FileSearchResult): Entity {
  return {
    id: file.path,
    type: 'local_file',
    uri: buildEntityURI('local_file', file.path, file.name),
    title: file.name,
    subtitle: file.relativePath,
    source: 'local',
  };
}

function recentToEntity(recent: RecentEntry): Entity {
  // local_file recents saved before the URI fix won't have recent.uri.
  // Reconstruct it from the id (absolute file path).
  const uri = recent.uri ?? (
    recent.type === 'local_file'
      ? buildEntityURI('local_file', recent.id, recent.title)
      : undefined
  );
  return {
    id: recent.id,
    type: recent.type,
    uri,
    title: recent.title,
    subtitle: recent.subtitle,
    lastAccessedAt: recent.accessedAt,
  };
}

// =============================================================================
// CONTEXT
// =============================================================================

interface EntityContextValue {
  dataProvider: EntityPaletteDataProvider;
  tabs: PaletteTab[];
}

const EntityContext = createContext<EntityContextValue | null>(null);

// =============================================================================
// PROVIDER
// =============================================================================

export function EntityProvider({ children }: { children: ReactNode }) {
  const client = useApolloClient();
  const activeWorkstreamId = useActiveWorkstreamId();
  const ipcRef = useRef(getApi(api));

  // ─── Fetch entity types for tabs ──────────────────────────────────
  const { data: typesData } = useQuery(GET_ENTITY_TYPES);

  const tabs = useMemo<PaletteTab[]>(() => {
    const dynamicTabs: PaletteTab[] = [];
    for (const t of typesData?.entityTypes ?? []) {
      if (t.type && t.displayName) {
        dynamicTabs.push({ id: t.type, label: t.displayName });
      }
    }
    return [
      { id: 'all', label: 'All' },
      ...dynamicTabs,
      { id: 'local_file', label: 'Files' },
    ];
  }, [typesData]);

  // ─── Index workstream directories for file search ─────────────────
  const { data: dirsData } = useQuery(GET_DIRECTORIES_WITH_BRANCH_INFO, {
    variables: { workstreamId: activeWorkstreamId! },
    skip: !activeWorkstreamId,
  });

  useEffect(() => {
    const dirs = dirsData?.directoriesWithBranchInfo?.map((d) => d.effectivePath ?? d.path) ?? [];
    if (dirs.length > 0) {
      // setDirectories replaces the full indexed set — old worktree directories
      // from previous workstreams are removed so file search only returns
      // results for the active workstream's effective paths.
      void ipcRef.current.files.setDirectories({ directories: dirs as string[] });
    }
  }, [dirsData]);

  // ─── Data Provider ────────────────────────────────────────────────

  const searchFiles = useCallback(async (query: string, limit: number): Promise<Entity[]> => {
    if (!query.trim()) return [];
    const { results } = await ipcRef.current.files.searchFiles({ query, limit });
    return results.map(fileToEntity);
  }, []);

  const searchEntities = useCallback(async (
    query: string,
    typeFilter: string | undefined,
    limit: number,
    signal?: AbortSignal,
  ): Promise<Entity[]> => {
    if (typeFilter) {
      const { data } = await client.query({
        query: GET_ENTITIES,
        variables: { type: typeFilter, query: query || undefined, limit },
        fetchPolicy: 'network-only',
        context: { fetchOptions: { signal } },
      });
      return mapGraphqlResults(data.entities ?? []);
    }
    // Cross-type search
    const { data } = await client.query({
      query: SEARCH_ENTITIES,
      variables: { query: query || '', types: null, limit },
      fetchPolicy: 'network-only',
      context: { fetchOptions: { signal } },
    });
    return mapGraphqlResults(data.entitySearch ?? []);
  }, [client]);

  const dataProvider = useMemo<EntityPaletteDataProvider>(() => ({
    search: async (query, typeFilter, _filters, signal) => {
      const limit = 20;

      if (typeFilter === 'local_file') {
        return searchFiles(query, limit);
      }

      if (typeFilter && typeFilter !== 'all') {
        return searchEntities(query, typeFilter, limit, signal);
      }

      // "All" tab: search both entities and files, merge results
      if (!query.trim()) {
        // No query on "all" — return empty (recents are shown separately)
        return [];
      }

      const [entities, files] = await Promise.all([
        searchEntities(query, undefined, limit, signal),
        searchFiles(query, 10),
      ]);

      return [...entities, ...files];
    },

    getRecents: async (limit = 10) => {
      return loadRecents().slice(0, limit).map(recentToEntity);
    },

    markAccessed: (entity) => {
      saveRecent(entity);
    },

    isSourceConnected: (_type: EntityType) => true,
  }), [searchEntities, searchFiles]);

  // ─── Context Value ────────────────────────────────────────────────

  const value = useMemo<EntityContextValue>(
    () => ({ dataProvider, tabs }),
    [dataProvider, tabs]
  );

  return (
    <EntityContext.Provider value={value}>
      {children}
    </EntityContext.Provider>
  );
}

/** Use entity palette context. Must be within EntityProvider. */
export function useEntityPalette(): EntityContextValue {
  const context = useContext(EntityContext);
  if (!context) {
    throw new Error('useEntityPalette must be used within an EntityProvider');
  }
  return context;
}
