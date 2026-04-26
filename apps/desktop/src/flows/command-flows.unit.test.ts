import { describe, it, expect, vi } from 'vitest';
import {
  createModelPickerFlow,
  createClearConversationFlow,
  createWorkstreamArchiveFlow,
  createWorkstreamDeleteFlow,
  createWorkstreamPinFlow,
  createWorkstreamUnpinFlow,
  createFlowRegistry,
} from './command-flows';
import type { WorkstreamActionOptions } from './command-flows';
import type { WorkstreamStatus } from '../components/domain';

describe('createModelPickerFlow', () => {
  it('creates a flow with one screen', () => {
    const flow = createModelPickerFlow({
      onModelChange: vi.fn(),
    });
    expect(flow.id).toBe('claude:switch-model');
    expect(flow.screens).toHaveLength(1);
    expect(flow.screens[0].id).toBe('select-model');
  });

  it('calls onModelChange on complete', async () => {
    const onModelChange = vi.fn();
    const flow = createModelPickerFlow({ onModelChange });

    await flow.onComplete({ model: 'opus' });
    expect(onModelChange).toHaveBeenCalledWith('opus');
  });

  it('accepts custom models', () => {
    const flow = createModelPickerFlow({
      models: [{ id: 'custom', name: 'Custom Model' }],
      onModelChange: vi.fn(),
    });
    expect(flow.screens).toHaveLength(1);
  });
});

describe('createClearConversationFlow', () => {
  it('creates a flow with one confirmation screen', () => {
    const flow = createClearConversationFlow({ onClear: vi.fn() });
    expect(flow.id).toBe('claude:clear-conversation');
    expect(flow.screens).toHaveLength(1);
    expect(flow.screens[0].id).toBe('confirm');
  });

  it('calls onClear on complete', async () => {
    const onClear = vi.fn();
    const flow = createClearConversationFlow({ onClear });

    await flow.onComplete({});
    expect(onClear).toHaveBeenCalled();
  });

  it('onCancel does not throw', () => {
    const flow = createClearConversationFlow({ onClear: vi.fn() });
    expect(() => flow.onCancel()).not.toThrow();
  });
});

function makeActionOptions(overrides?: Partial<WorkstreamActionOptions>): WorkstreamActionOptions {
  return {
    getWorkstreams: () => [
      { id: 'ws-1', title: 'Test WS', status: 'active', isPinned: false, lastActivityAt: null, archivedAt: null },
    ],
    getActiveWorkstreamId: () => 'ws-1',
    onAction: vi.fn(),
    toUIStatus: (s: string) => s as WorkstreamStatus,
    formatRelativeTime: () => 'just now',
    fuzzyMatch: () => true,
    ...overrides,
  };
}

describe('createWorkstreamArchiveFlow', () => {
  it('creates a two-screen flow with picker and confirmation', () => {
    const flow = createWorkstreamArchiveFlow(makeActionOptions());
    expect(flow.id).toBe('workstream:archive');
    expect(flow.screens).toHaveLength(2);
    expect(flow.screens[0].id).toBe('pick');
    expect(flow.screens[1].id).toBe('confirm');
  });

  it('calls onAction on complete', async () => {
    const onAction = vi.fn();
    const flow = createWorkstreamArchiveFlow(makeActionOptions({ onAction }));
    await flow.onComplete({ workstreamId: 'ws-1' });
    expect(onAction).toHaveBeenCalledWith('ws-1');
  });
});

describe('createWorkstreamDeleteFlow', () => {
  it('creates a two-screen flow with picker and confirmation', () => {
    const flow = createWorkstreamDeleteFlow(makeActionOptions());
    expect(flow.id).toBe('workstream:delete');
    expect(flow.screens).toHaveLength(2);
    expect(flow.screens[0].id).toBe('pick');
    expect(flow.screens[1].id).toBe('confirm');
  });

  it('calls onAction on complete', async () => {
    const onAction = vi.fn();
    const flow = createWorkstreamDeleteFlow(makeActionOptions({ onAction }));
    await flow.onComplete({ workstreamId: 'ws-1' });
    expect(onAction).toHaveBeenCalledWith('ws-1');
  });
});

describe('createWorkstreamPinFlow', () => {
  it('creates a single-screen picker flow', () => {
    const flow = createWorkstreamPinFlow(makeActionOptions());
    expect(flow.id).toBe('workstream:pin');
    expect(flow.screens).toHaveLength(1);
    expect(flow.screens[0].id).toBe('pick');
  });

  it('calls onAction on complete', async () => {
    const onAction = vi.fn();
    const flow = createWorkstreamPinFlow(makeActionOptions({ onAction }));
    await flow.onComplete({ workstreamId: 'ws-1' });
    expect(onAction).toHaveBeenCalledWith('ws-1');
  });
});

describe('createWorkstreamUnpinFlow', () => {
  it('creates a single-screen picker flow', () => {
    const flow = createWorkstreamUnpinFlow(makeActionOptions());
    expect(flow.id).toBe('workstream:unpin');
    expect(flow.screens).toHaveLength(1);
    expect(flow.screens[0].id).toBe('pick');
  });

  it('calls onAction on complete', async () => {
    const onAction = vi.fn();
    const flow = createWorkstreamUnpinFlow(makeActionOptions({ onAction }));
    await flow.onComplete({ workstreamId: 'ws-1' });
    expect(onAction).toHaveBeenCalledWith('ws-1');
  });
});

describe('createFlowRegistry', () => {
  it('creates empty registry when no callbacks provided', () => {
    const registry = createFlowRegistry({});
    expect(Object.keys(registry)).toHaveLength(0);
  });

  it('includes model picker when onModelChange provided', () => {
    const registry = createFlowRegistry({
      onModelChange: vi.fn(),
    });
    expect(registry['claude:switch-model']).toBeDefined();
  });

  it('includes clear flow when onClear provided', () => {
    const registry = createFlowRegistry({
      onClear: vi.fn(),
    });
    expect(registry['claude:clear-conversation']).toBeDefined();
  });

  it('includes workstream action flows when options provided', () => {
    const opts = makeActionOptions();
    const registry = createFlowRegistry({
      workstreamArchive: opts,
      workstreamPin: opts,
      workstreamUnpin: opts,
    });
    expect(registry['workstream:archive']).toBeDefined();
    expect(registry['workstream:pin']).toBeDefined();
    expect(registry['workstream:unpin']).toBeDefined();
  });

  it('includes all flows when all callbacks provided', () => {
    const opts = makeActionOptions();
    const registry = createFlowRegistry({
      onModelChange: vi.fn(),
      onClear: vi.fn(),
      workstreamArchive: opts,
      workstreamPin: opts,
      workstreamUnpin: opts,
    });
    // model + clear + browse (not provided) + archive + pin + unpin = 5
    expect(Object.keys(registry)).toHaveLength(5);
  });
});
