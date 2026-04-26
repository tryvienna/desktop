// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createElement } from 'react';
import { renderHook } from '@testing-library/react';
import type { DocumentNode } from 'graphql';

// Mock Apollo hooks before importing the modules under test
const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();

vi.mock('@apollo/client/react/hooks', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
}));

import { PluginDataProvider } from '../react/PluginDataProvider';
import { usePluginClient, useHostApi } from '../react/PluginDataContext';
import { useEntity } from '../react/useEntity';
import { useEntities } from '../react/useEntities';
import { usePluginQuery } from '../react/usePluginQuery';
import { usePluginMutation } from '../react/usePluginMutation';
import type { PluginHostApi } from '../canvas';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Apollo's ApolloClient type requires `any` for the cache shape in tests
const fakeClient = { cache: {}, link: {} } as any;
const fakeHostApi: PluginHostApi = {
  getCredentialStatus: vi.fn(),
  setCredential: vi.fn(),
  removeCredential: vi.fn(),
  startOAuthFlow: vi.fn(),
  getOAuthStatus: vi.fn(),
  revokeOAuthToken: vi.fn(),
  fetch: vi.fn(),
};

function wrapper({ children }: { children: React.ReactNode }) {
  return createElement(PluginDataProvider, { client: fakeClient, hostApi: fakeHostApi }, children);
}

function wrapperWithoutHostApi({ children }: { children: React.ReactNode }) {
  return createElement(PluginDataProvider, { client: fakeClient }, children);
}

// ---------------------------------------------------------------------------
// PluginDataContext — usePluginClient / useHostApi
// ---------------------------------------------------------------------------

describe('usePluginClient', () => {
  it('returns the client from PluginDataProvider', () => {
    const { result } = renderHook(() => usePluginClient(), { wrapper });
    expect(result.current).toBe(fakeClient);
  });

  it('throws when used outside PluginDataProvider', () => {
    expect(() => {
      renderHook(() => usePluginClient());
    }).toThrow(/usePluginClient must be used within a <PluginDataProvider>/);
  });
});

describe('useHostApi', () => {
  it('returns the hostApi from PluginDataProvider', () => {
    const { result } = renderHook(() => useHostApi(), { wrapper });
    expect(result.current).toBe(fakeHostApi);
  });

  it('throws when hostApi is not provided', () => {
    expect(() => {
      renderHook(() => useHostApi(), { wrapper: wrapperWithoutHostApi });
    }).toThrow(/useHostApi must be used within a <PluginDataProvider> that provides a hostApi/);
  });

  it('throws when used outside PluginDataProvider', () => {
    expect(() => {
      renderHook(() => useHostApi());
    }).toThrow(/useHostApi must be used within a <PluginDataProvider>/);
  });
});

// ---------------------------------------------------------------------------
// useEntity
// ---------------------------------------------------------------------------

describe('useEntity', () => {
  beforeEach(() => {
    mockUseQuery.mockReset();
  });

  it('returns entity data when query resolves', () => {
    const entity = { id: '1', type: 'test', uri: '@vienna//test/1', title: 'Test' };
    const refetch = vi.fn();
    mockUseQuery.mockReturnValue({ data: { entity }, loading: false, error: undefined, refetch });

    const { result } = renderHook(() => useEntity('@vienna//test/1'), { wrapper });

    expect(result.current.entity).toEqual(entity);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeUndefined();
    expect(result.current.refetch).toBe(refetch);
  });

  it('returns null entity while loading', () => {
    mockUseQuery.mockReturnValue({ data: undefined, loading: true, error: undefined, refetch: vi.fn() });

    const { result } = renderHook(() => useEntity('@vienna//test/1'), { wrapper });

    expect(result.current.entity).toBeNull();
    expect(result.current.loading).toBe(true);
  });

  it('returns error when query fails', () => {
    const error = new Error('Network error');
    mockUseQuery.mockReturnValue({ data: undefined, loading: false, error, refetch: vi.fn() });

    const { result } = renderHook(() => useEntity('@vienna//test/1'), { wrapper });

    expect(result.current.entity).toBeNull();
    expect(result.current.error).toBe(error);
  });

  it('passes options to useQuery', () => {
    mockUseQuery.mockReturnValue({ data: undefined, loading: false, error: undefined, refetch: vi.fn() });

    renderHook(
      () => useEntity('@vienna//test/1', { fetchPolicy: 'network-only', pollInterval: 5000, skip: true }),
      { wrapper },
    );

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        client: fakeClient,
        variables: { uri: '@vienna//test/1' },
        fetchPolicy: 'network-only',
        pollInterval: 5000,
        skip: true,
      }),
    );
  });

  it('returns null entity when data.entity is null', () => {
    mockUseQuery.mockReturnValue({ data: { entity: null }, loading: false, error: undefined, refetch: vi.fn() });

    const { result } = renderHook(() => useEntity('@vienna//test/1'), { wrapper });
    expect(result.current.entity).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// useEntities
// ---------------------------------------------------------------------------

describe('useEntities', () => {
  beforeEach(() => {
    mockUseQuery.mockReset();
  });

  it('returns entities list', () => {
    const entities = [
      { id: '1', type: 'test', uri: '@vienna//test/1', title: 'Test 1' },
      { id: '2', type: 'test', uri: '@vienna//test/2', title: 'Test 2' },
    ];
    mockUseQuery.mockReturnValue({ data: { entities }, loading: false, error: undefined });

    const { result } = renderHook(() => useEntities({ type: 'test' }), { wrapper });

    expect(result.current.entities).toEqual(entities);
    expect(result.current.loading).toBe(false);
  });

  it('returns empty array while loading', () => {
    mockUseQuery.mockReturnValue({ data: undefined, loading: true, error: undefined });

    const { result } = renderHook(() => useEntities({ type: 'test' }), { wrapper });
    expect(result.current.entities).toEqual([]);
    expect(result.current.loading).toBe(true);
  });

  it('returns error when query fails', () => {
    const error = new Error('Fetch failed');
    mockUseQuery.mockReturnValue({ data: undefined, loading: false, error });

    const { result } = renderHook(() => useEntities({ type: 'test' }), { wrapper });
    expect(result.current.error).toBe(error);
  });

  it('passes all options to useQuery', () => {
    mockUseQuery.mockReturnValue({ data: undefined, loading: false, error: undefined });

    renderHook(
      () =>
        useEntities({
          type: 'test',
          query: 'search term',
          filters: { status: 'open' },
          limit: 10,
          fetchPolicy: 'cache-first',
          pollInterval: 3000,
          skip: true,
        }),
      { wrapper },
    );

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        client: fakeClient,
        variables: {
          type: 'test',
          query: 'search term',
          filters: { status: 'open' },
          limit: 10,
        },
        fetchPolicy: 'cache-first',
        pollInterval: 3000,
        skip: true,
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// usePluginQuery
// ---------------------------------------------------------------------------

describe('usePluginQuery', () => {
  beforeEach(() => {
    mockUseQuery.mockReset();
  });

  it('passes the query and injects client from context', () => {
    const fakeResult = { data: { hello: 'world' }, loading: false, error: undefined };
    mockUseQuery.mockReturnValue(fakeResult);
    const fakeQuery = { kind: 'Document', definitions: [] } as unknown as DocumentNode;

    const { result } = renderHook(() => usePluginQuery(fakeQuery, { variables: { id: '1' } }), {
      wrapper,
    });

    expect(mockUseQuery).toHaveBeenCalledWith(fakeQuery, { variables: { id: '1' }, client: fakeClient });
    expect(result.current).toBe(fakeResult);
  });

  it('works without options', () => {
    mockUseQuery.mockReturnValue({ data: null, loading: false, error: undefined });
    const fakeQuery = { kind: 'Document', definitions: [] } as unknown as DocumentNode;

    renderHook(() => usePluginQuery(fakeQuery), { wrapper });

    expect(mockUseQuery).toHaveBeenCalledWith(fakeQuery, { client: fakeClient });
  });
});

// ---------------------------------------------------------------------------
// usePluginMutation
// ---------------------------------------------------------------------------

describe('usePluginMutation', () => {
  beforeEach(() => {
    mockUseMutation.mockReset();
  });

  it('passes the mutation and injects client from context', () => {
    const mutateFn = vi.fn();
    const fakeResult = [mutateFn, { data: null, loading: false, error: undefined }];
    mockUseMutation.mockReturnValue(fakeResult);
    const fakeMutation = { kind: 'Document', definitions: [] } as unknown as DocumentNode;

    const { result } = renderHook(() => usePluginMutation(fakeMutation), { wrapper });

    expect(mockUseMutation).toHaveBeenCalledWith(fakeMutation, { client: fakeClient });
    expect(result.current).toBe(fakeResult);
  });

  it('passes additional options', () => {
    mockUseMutation.mockReturnValue([vi.fn(), {}]);
    const fakeMutation = { kind: 'Document', definitions: [] } as unknown as DocumentNode;
    const onCompleted = vi.fn();

    renderHook(() => usePluginMutation(fakeMutation, { onCompleted }), { wrapper });

    expect(mockUseMutation).toHaveBeenCalledWith(fakeMutation, { onCompleted, client: fakeClient });
  });
});

// ---------------------------------------------------------------------------
// PluginDataProvider
// ---------------------------------------------------------------------------

describe('PluginDataProvider', () => {
  it('renders children and provides context', () => {
    mockUseQuery.mockReturnValue({ data: undefined, loading: false, error: undefined, refetch: vi.fn() });

    // If useEntity works inside the provider, the provider is working
    const { result } = renderHook(() => useEntity('@vienna//test/1'), { wrapper });
    expect(result.current).toBeDefined();
  });
});
