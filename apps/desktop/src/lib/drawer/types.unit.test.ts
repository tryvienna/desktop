import { describe, it, expect } from 'vitest';
import {
  DrawerContentDescriptorSchema,
  DrawerStackItemSchema,
  DrawerModeSchema,
  SerializableDrawerTabSchema,
  SerializableDrawerStateSchema,
} from './types';

describe('DrawerContentDescriptorSchema', () => {
  it('accepts a valid descriptor with contentId', () => {
    const result = DrawerContentDescriptorSchema.safeParse({
      contentId: 'workstream-settings',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a descriptor with payload', () => {
    const result = DrawerContentDescriptorSchema.safeParse({
      contentId: 'workstream-settings',
      payload: { autoEditTitle: true },
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty contentId', () => {
    const result = DrawerContentDescriptorSchema.safeParse({
      contentId: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing contentId', () => {
    const result = DrawerContentDescriptorSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('strips unknown fields', () => {
    const result = DrawerContentDescriptorSchema.safeParse({
      contentId: 'test',
      unknownField: 'value',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty('unknownField');
    }
  });
});

describe('DrawerStackItemSchema', () => {
  it('accepts a valid stack item', () => {
    const result = DrawerStackItemSchema.safeParse({
      content: { contentId: 'test' },
      title: 'Test Title',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a stack item with titleLoading', () => {
    const result = DrawerStackItemSchema.safeParse({
      content: { contentId: 'test' },
      title: 'Loading...',
      titleLoading: true,
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing title', () => {
    const result = DrawerStackItemSchema.safeParse({
      content: { contentId: 'test' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing content', () => {
    const result = DrawerStackItemSchema.safeParse({
      title: 'Test',
    });
    expect(result.success).toBe(false);
  });
});

describe('DrawerModeSchema', () => {
  it('accepts closed mode', () => {
    const result = DrawerModeSchema.safeParse({ type: 'closed' });
    expect(result.success).toBe(true);
  });

  it('accepts tabbed mode', () => {
    const result = DrawerModeSchema.safeParse({ type: 'tabbed' });
    expect(result.success).toBe(true);
  });

  it('accepts full mode with content', () => {
    const result = DrawerModeSchema.safeParse({
      type: 'full',
      content: { contentId: 'workstream-settings' },
    });
    expect(result.success).toBe(true);
  });

  it('rejects full mode without content', () => {
    const result = DrawerModeSchema.safeParse({ type: 'full' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid mode type', () => {
    const result = DrawerModeSchema.safeParse({ type: 'invalid' });
    expect(result.success).toBe(false);
  });
});

describe('SerializableDrawerTabSchema', () => {
  it('accepts a valid tab', () => {
    const result = SerializableDrawerTabSchema.safeParse({
      id: 'tab-1',
      label: 'Tab 1',
      stack: [{ content: { contentId: 'test' }, title: 'Test' }],
    });
    expect(result.success).toBe(true);
  });

  it('accepts a tab with optional fields', () => {
    const result = SerializableDrawerTabSchema.safeParse({
      id: 'tab-1',
      label: 'Tab 1',
      stack: [],
      closable: false,
      labelLoading: true,
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing id', () => {
    const result = SerializableDrawerTabSchema.safeParse({
      label: 'Tab',
      stack: [],
    });
    expect(result.success).toBe(false);
  });
});

describe('SerializableDrawerStateSchema', () => {
  it('accepts a complete valid state', () => {
    const result = SerializableDrawerStateSchema.safeParse({
      mode: { type: 'closed' },
      width: 400,
      activeTabId: null,
      tabs: [],
    });
    expect(result.success).toBe(true);
  });

  it('accepts state with tabs', () => {
    const result = SerializableDrawerStateSchema.safeParse({
      mode: { type: 'tabbed' },
      width: 500,
      activeTabId: 'tab-1',
      tabs: [
        {
          id: 'tab-1',
          label: 'Tab 1',
          stack: [{ content: { contentId: 'test' }, title: 'Title' }],
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects non-integer width', () => {
    const result = SerializableDrawerStateSchema.safeParse({
      mode: { type: 'closed' },
      width: 400.5,
      activeTabId: null,
      tabs: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative width', () => {
    const result = SerializableDrawerStateSchema.safeParse({
      mode: { type: 'closed' },
      width: -100,
      activeTabId: null,
      tabs: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects zero width', () => {
    const result = SerializableDrawerStateSchema.safeParse({
      mode: { type: 'closed' },
      width: 0,
      activeTabId: null,
      tabs: [],
    });
    expect(result.success).toBe(false);
  });
});
