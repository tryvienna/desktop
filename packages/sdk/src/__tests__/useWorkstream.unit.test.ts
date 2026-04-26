// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createElement } from 'react';
import { renderHook, act } from '@testing-library/react';

import { PluginDataProvider } from '../react/PluginDataProvider';
import { useActiveWorkstreamId } from '../react/PluginDataContext';
import { useWorkstream } from '../react/useWorkstream';
import type { PluginHostApi } from '../canvas';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockMutate = vi.fn().mockResolvedValue({ data: { sendWorkstreamMessage: { workstream: { id: 'ws-1', status: 'running', messageCount: 5, lastActivityAt: '2026-01-01', updatedAt: '2026-01-01' } } } });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fakeClient = { mutate: mockMutate, cache: {}, link: {} } as any;

const fakeHostApi: PluginHostApi = {
  getCredentialStatus: vi.fn(),
  setCredential: vi.fn(),
  removeCredential: vi.fn(),
  startOAuthFlow: vi.fn(),
  getOAuthStatus: vi.fn(),
  revokeOAuthToken: vi.fn(),
  fetch: vi.fn(),
};

function createWrapper(activeWorkstreamId: string | null = 'ws-1') {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(
      PluginDataProvider,
      { client: fakeClient, hostApi: fakeHostApi, activeWorkstreamId },
      children,
    );
  };
}

// ---------------------------------------------------------------------------
// useActiveWorkstreamId
// ---------------------------------------------------------------------------

describe('useActiveWorkstreamId', () => {
  it('returns the active workstream ID from context', () => {
    const { result } = renderHook(() => useActiveWorkstreamId(), {
      wrapper: createWrapper('ws-123'),
    });
    expect(result.current).toBe('ws-123');
  });

  it('returns null when no workstream is active', () => {
    const { result } = renderHook(() => useActiveWorkstreamId(), {
      wrapper: createWrapper(null),
    });
    expect(result.current).toBeNull();
  });

  it('returns null when activeWorkstreamId is not provided', () => {
    function WrapperNoWorkstream({ children }: { children: React.ReactNode }) {
      return createElement(PluginDataProvider, { client: fakeClient }, children);
    }
    const { result } = renderHook(() => useActiveWorkstreamId(), {
      wrapper: WrapperNoWorkstream,
    });
    expect(result.current).toBeNull();
  });

  it('throws when used outside PluginDataProvider', () => {
    expect(() => {
      renderHook(() => useActiveWorkstreamId());
    }).toThrow(/useActiveWorkstreamId must be used within a <PluginDataProvider>/);
  });

  it('re-renders when activeWorkstreamId changes', () => {
    let wsId: string | null = 'ws-1';

    function DynamicWrapper({ children }: { children: React.ReactNode }) {
      return createElement(
        PluginDataProvider,
        { client: fakeClient, activeWorkstreamId: wsId },
        children,
      );
    }

    const { result, rerender } = renderHook(() => useActiveWorkstreamId(), {
      wrapper: DynamicWrapper,
    });
    expect(result.current).toBe('ws-1');

    wsId = 'ws-2';
    rerender();
    expect(result.current).toBe('ws-2');

    wsId = null;
    rerender();
    expect(result.current).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// useWorkstream
// ---------------------------------------------------------------------------

describe('useWorkstream', () => {
  beforeEach(() => {
    mockMutate.mockClear();
  });

  it('returns the workstream ID', () => {
    const { result } = renderHook(() => useWorkstream('ws-1'), {
      wrapper: createWrapper(),
    });
    expect(result.current.id).toBe('ws-1');
  });

  it('returns null id when given null', () => {
    const { result } = renderHook(() => useWorkstream(null), {
      wrapper: createWrapper(null),
    });
    expect(result.current.id).toBeNull();
  });

  it('sendMessage calls the GraphQL mutation with correct variables', async () => {
    const { result } = renderHook(() => useWorkstream('ws-42'), {
      wrapper: createWrapper('ws-42'),
    });

    await act(async () => {
      await result.current.sendMessage('Hello world');
    });

    expect(mockMutate).toHaveBeenCalledTimes(1);
    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: { workstreamId: 'ws-42', text: 'Hello world' },
      }),
    );
  });

  it('sendMessage throws when workstreamId is null', async () => {
    const { result } = renderHook(() => useWorkstream(null), {
      wrapper: createWrapper(null),
    });

    await expect(
      act(async () => {
        await result.current.sendMessage('test');
      }),
    ).rejects.toThrow(/Cannot send message: no workstream ID provided/);

    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('sendMessage propagates mutation errors', async () => {
    mockMutate.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useWorkstream('ws-1'), {
      wrapper: createWrapper(),
    });

    await expect(
      act(async () => {
        await result.current.sendMessage('test');
      }),
    ).rejects.toThrow('Network error');
  });

  it('sendMessage uses the mutation DocumentNode', async () => {
    const { result } = renderHook(() => useWorkstream('ws-1'), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.sendMessage('test');
    });

    const call = mockMutate.mock.calls[0]![0];
    expect(call.mutation).toBeDefined();
    expect(call.mutation.kind).toBe('Document');
    // Verify it contains the sendWorkstreamMessage operation
    const opDef = call.mutation.definitions[0];
    expect(opDef.operation).toBe('mutation');
    expect(opDef.name.value).toBe('SendWorkstreamMessage');
  });

  it('returns stable references when workstreamId does not change', () => {
    const { result, rerender } = renderHook(() => useWorkstream('ws-1'), {
      wrapper: createWrapper(),
    });

    const first = result.current;
    rerender();
    const second = result.current;

    expect(first.sendMessage).toBe(second.sendMessage);
  });
});

// ---------------------------------------------------------------------------
// GraphQL operations export
// ---------------------------------------------------------------------------

describe('@tryvienna/sdk/graphql operations', () => {
  it('SEND_WORKSTREAM_MESSAGE is a valid DocumentNode', async () => {
    const { SEND_WORKSTREAM_MESSAGE } = await import('../graphql/operations');

    expect(SEND_WORKSTREAM_MESSAGE).toBeDefined();
    expect(SEND_WORKSTREAM_MESSAGE.kind).toBe('Document');
    const opDef = SEND_WORKSTREAM_MESSAGE.definitions[0]!;
    expect((opDef as { operation: string }).operation).toBe('mutation');
    expect((opDef as { name: { value: string } }).name.value).toBe('SendWorkstreamMessage');
  });
});
