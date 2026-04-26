import { describe, it, expect } from 'vitest';
import { drawerReducer, INITIAL_DRAWER_STATE } from './reducer';
import type { DrawerAction, DrawerState, DrawerTab } from './types';
import { DRAWER_WIDTH_MIN, DRAWER_WIDTH_MAX } from './constants';

function makeTab(id: string, overrides?: Partial<DrawerTab>): DrawerTab {
  return {
    id,
    label: `Tab ${id}`,
    stack: [{ content: { contentId: `content-${id}` }, title: `Title ${id}` }],
    ...overrides,
  };
}

function stateWithTabs(...tabs: DrawerTab[]): DrawerState {
  return {
    ...INITIAL_DRAWER_STATE,
    mode: { type: 'tabbed' },
    tabs,
    activeTabId: tabs[0]?.id ?? null,
  };
}

describe('drawerReducer', () => {
  describe('SET_MODE', () => {
    it('transitions from closed to tabbed', () => {
      const result = drawerReducer(INITIAL_DRAWER_STATE, {
        type: 'SET_MODE',
        mode: { type: 'tabbed' },
      });
      expect(result.mode).toEqual({ type: 'tabbed' });
    });

    it('transitions from closed to full', () => {
      const content = { contentId: 'test' };
      const result = drawerReducer(INITIAL_DRAWER_STATE, {
        type: 'SET_MODE',
        mode: { type: 'full', content },
      });
      expect(result.mode).toEqual({ type: 'full', content });
    });

    it('transitions from tabbed to closed', () => {
      const state = stateWithTabs(makeTab('1'));
      const result = drawerReducer(state, {
        type: 'SET_MODE',
        mode: { type: 'closed' },
      });
      expect(result.mode).toEqual({ type: 'closed' });
    });

    it('preserves tabs when changing mode', () => {
      const tabs = [makeTab('1'), makeTab('2')];
      const state = stateWithTabs(...tabs);
      const result = drawerReducer(state, {
        type: 'SET_MODE',
        mode: { type: 'full', content: { contentId: 'x' } },
      });
      expect(result.tabs).toHaveLength(2);
    });
  });

  describe('SET_WIDTH', () => {
    it('sets width within bounds', () => {
      const result = drawerReducer(INITIAL_DRAWER_STATE, {
        type: 'SET_WIDTH',
        width: 500,
      });
      expect(result.width).toBe(500);
    });

    it('clamps width to minimum', () => {
      const result = drawerReducer(INITIAL_DRAWER_STATE, {
        type: 'SET_WIDTH',
        width: 100,
      });
      expect(result.width).toBe(DRAWER_WIDTH_MIN);
    });

    it('clamps width to maximum', () => {
      const result = drawerReducer(INITIAL_DRAWER_STATE, {
        type: 'SET_WIDTH',
        width: 2000,
      });
      expect(result.width).toBe(DRAWER_WIDTH_MAX);
    });

    it('clamps width exactly at min boundary', () => {
      const result = drawerReducer(INITIAL_DRAWER_STATE, {
        type: 'SET_WIDTH',
        width: DRAWER_WIDTH_MIN,
      });
      expect(result.width).toBe(DRAWER_WIDTH_MIN);
    });

    it('clamps width exactly at max boundary', () => {
      const result = drawerReducer(INITIAL_DRAWER_STATE, {
        type: 'SET_WIDTH',
        width: DRAWER_WIDTH_MAX,
      });
      expect(result.width).toBe(DRAWER_WIDTH_MAX);
    });
  });

  describe('SET_ACTIVE_TAB', () => {
    it('sets active tab when tab exists', () => {
      const state = stateWithTabs(makeTab('1'), makeTab('2'));
      const result = drawerReducer(state, {
        type: 'SET_ACTIVE_TAB',
        tabId: '2',
      });
      expect(result.activeTabId).toBe('2');
    });

    it('returns same state when tab does not exist', () => {
      const state = stateWithTabs(makeTab('1'));
      const result = drawerReducer(state, {
        type: 'SET_ACTIVE_TAB',
        tabId: 'nonexistent',
      });
      expect(result).toBe(state);
    });
  });

  describe('OPEN_TAB', () => {
    it('adds a new tab and makes it active', () => {
      const state = stateWithTabs(makeTab('1'));
      const newTab = makeTab('2');
      const result = drawerReducer(state, {
        type: 'OPEN_TAB',
        tab: newTab,
      });
      expect(result.tabs).toHaveLength(2);
      expect(result.activeTabId).toBe('2');
    });

    it('focuses existing tab with same ID instead of duplicating', () => {
      const state = stateWithTabs(makeTab('1'), makeTab('2'));
      const result = drawerReducer(state, {
        type: 'OPEN_TAB',
        tab: makeTab('1'),
      });
      expect(result.tabs).toHaveLength(2);
      expect(result.activeTabId).toBe('1');
    });

    it('adds tab to empty state', () => {
      const tab = makeTab('1');
      const result = drawerReducer(INITIAL_DRAWER_STATE, {
        type: 'OPEN_TAB',
        tab,
      });
      expect(result.tabs).toHaveLength(1);
      expect(result.activeTabId).toBe('1');
    });
  });

  describe('CLOSE_TAB', () => {
    it('removes the tab', () => {
      const state = stateWithTabs(makeTab('1'), makeTab('2'));
      const result = drawerReducer(state, {
        type: 'CLOSE_TAB',
        tabId: '1',
      });
      expect(result.tabs).toHaveLength(1);
      expect(result.tabs[0]!.id).toBe('2');
    });

    it('activates right neighbor when closing active tab', () => {
      const state = stateWithTabs(makeTab('1'), makeTab('2'), makeTab('3'));
      const result = drawerReducer(state, {
        type: 'CLOSE_TAB',
        tabId: '1',
      });
      expect(result.activeTabId).toBe('2');
    });

    it('activates left neighbor when closing last active tab', () => {
      const state = {
        ...stateWithTabs(makeTab('1'), makeTab('2')),
        activeTabId: '2',
      };
      const result = drawerReducer(state, {
        type: 'CLOSE_TAB',
        tabId: '2',
      });
      expect(result.activeTabId).toBe('1');
    });

    it('closes drawer when closing last tab', () => {
      const state = stateWithTabs(makeTab('1'));
      const result = drawerReducer(state, {
        type: 'CLOSE_TAB',
        tabId: '1',
      });
      expect(result.mode).toEqual({ type: 'closed' });
      expect(result.tabs).toHaveLength(0);
      expect(result.activeTabId).toBeNull();
    });

    it('preserves activeTabId when closing non-active tab', () => {
      const state = stateWithTabs(makeTab('1'), makeTab('2'), makeTab('3'));
      const result = drawerReducer(state, {
        type: 'CLOSE_TAB',
        tabId: '3',
      });
      expect(result.activeTabId).toBe('1');
    });

    it('returns same state when tab does not exist', () => {
      const state = stateWithTabs(makeTab('1'));
      const result = drawerReducer(state, {
        type: 'CLOSE_TAB',
        tabId: 'nonexistent',
      });
      expect(result).toBe(state);
    });

    it('does not close tab when closable is false', () => {
      const state = stateWithTabs(makeTab('1', { closable: false }));
      const result = drawerReducer(state, {
        type: 'CLOSE_TAB',
        tabId: '1',
      });
      expect(result).toBe(state);
    });
  });

  describe('REORDER_TABS', () => {
    it('reorders tabs', () => {
      const state = stateWithTabs(makeTab('1'), makeTab('2'), makeTab('3'));
      const result = drawerReducer(state, {
        type: 'REORDER_TABS',
        fromIndex: 0,
        toIndex: 2,
      });
      expect(result.tabs.map((t) => t.id)).toEqual(['2', '3', '1']);
    });

    it('returns same state for out-of-bounds fromIndex', () => {
      const state = stateWithTabs(makeTab('1'));
      const result = drawerReducer(state, {
        type: 'REORDER_TABS',
        fromIndex: -1,
        toIndex: 0,
      });
      expect(result).toBe(state);
    });

    it('returns same state for out-of-bounds toIndex', () => {
      const state = stateWithTabs(makeTab('1'));
      const result = drawerReducer(state, {
        type: 'REORDER_TABS',
        fromIndex: 0,
        toIndex: 5,
      });
      expect(result).toBe(state);
    });
  });

  describe('UPDATE_TAB_STACK', () => {
    it('replaces the stack for a tab', () => {
      const state = stateWithTabs(makeTab('1'));
      const newStack = [
        { content: { contentId: 'new' }, title: 'New Title' },
      ];
      const result = drawerReducer(state, {
        type: 'UPDATE_TAB_STACK',
        tabId: '1',
        stack: newStack,
      });
      expect(result.tabs[0]!.stack).toEqual(newStack);
    });

    it('returns same state for nonexistent tab', () => {
      const state = stateWithTabs(makeTab('1'));
      const result = drawerReducer(state, {
        type: 'UPDATE_TAB_STACK',
        tabId: 'nonexistent',
        stack: [],
      });
      expect(result).toBe(state);
    });
  });

  describe('UPDATE_TAB_LABEL', () => {
    it('updates the label for a tab', () => {
      const state = stateWithTabs(makeTab('1'));
      const result = drawerReducer(state, {
        type: 'UPDATE_TAB_LABEL',
        tabId: '1',
        label: 'New Label',
      });
      expect(result.tabs[0]!.label).toBe('New Label');
    });

    it('returns same state for nonexistent tab', () => {
      const state = stateWithTabs(makeTab('1'));
      const result = drawerReducer(state, {
        type: 'UPDATE_TAB_LABEL',
        tabId: 'nonexistent',
        label: 'Whatever',
      });
      expect(result).toBe(state);
    });
  });

  describe('RESTORE_STATE', () => {
    it('merges partial state', () => {
      const result = drawerReducer(INITIAL_DRAWER_STATE, {
        type: 'RESTORE_STATE',
        state: { width: 600 },
      });
      expect(result.width).toBe(600);
      expect(result.mode).toEqual({ type: 'closed' });
    });

    it('can restore mode and tabs together', () => {
      const tabs = [makeTab('1')];
      const result = drawerReducer(INITIAL_DRAWER_STATE, {
        type: 'RESTORE_STATE',
        state: {
          mode: { type: 'tabbed' },
          tabs,
          activeTabId: '1',
        },
      });
      expect(result.mode).toEqual({ type: 'tabbed' });
      expect(result.tabs).toHaveLength(1);
      expect(result.activeTabId).toBe('1');
    });
  });

  describe('unknown action', () => {
    it('returns same state', () => {
      const result = drawerReducer(INITIAL_DRAWER_STATE, {
        type: 'UNKNOWN',
      } as unknown as DrawerAction);
      expect(result).toBe(INITIAL_DRAWER_STATE);
    });
  });
});
