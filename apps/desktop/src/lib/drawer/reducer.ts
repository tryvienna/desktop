/**
 * Drawer Reducer — Pure state transition function for drawer state management.
 *
 * @ai-context
 * - Extracted as a standalone pure function for trivial testability (no React needed)
 * - Handles 10 action types: SET_MODE, SET_WIDTH, SET_ACTIVE_TAB, OPEN_TAB,
 *   CLOSE_TAB, REORDER_TABS, UPDATE_TAB_STACK, UPDATE_TAB_LABEL, UPDATE_TAB_DIRTY, RESTORE_STATE
 * - Width clamping uses DRAWER_WIDTH_MIN/MAX from constants
 * - CLOSE_TAB picks adjacent tab (prefers right neighbor, then left)
 * - CLOSE_TAB on last tab transitions to mode: closed
 * - OPEN_TAB with existing ID focuses the existing tab instead of duplicating
 * - REORDER_TABS validates bounds before splicing
 */

import type { DrawerState, DrawerAction } from './types';
import { DRAWER_WIDTH_MIN, DRAWER_WIDTH_MAX, DRAWER_WIDTH_DEFAULT } from './constants';

export const INITIAL_DRAWER_STATE: DrawerState = {
  mode: { type: 'closed' },
  width: DRAWER_WIDTH_DEFAULT,
  activeTabId: null,
  tabs: [],
};

export function drawerReducer(state: DrawerState, action: DrawerAction): DrawerState {
  switch (action.type) {
    case 'SET_MODE':
      return { ...state, mode: action.mode };

    case 'SET_WIDTH': {
      const width = Math.min(Math.max(action.width, DRAWER_WIDTH_MIN), DRAWER_WIDTH_MAX);
      return { ...state, width };
    }

    case 'SET_ACTIVE_TAB': {
      const tabExists = state.tabs.some((t) => t.id === action.tabId);
      if (!tabExists) return state;
      return { ...state, activeTabId: action.tabId };
    }

    case 'OPEN_TAB': {
      const existingTab = state.tabs.find((t) => t.id === action.tab.id);
      if (existingTab) {
        return { ...state, activeTabId: existingTab.id };
      }
      return {
        ...state,
        tabs: [...state.tabs, action.tab],
        activeTabId: action.tab.id,
      };
    }

    case 'CLOSE_TAB': {
      const tabIndex = state.tabs.findIndex((t) => t.id === action.tabId);
      if (tabIndex === -1) return state;

      const tab = state.tabs[tabIndex]!;
      if (tab.closable === false) return state;

      const newTabs = state.tabs.filter((t) => t.id !== action.tabId);

      if (newTabs.length === 0) {
        return {
          ...state,
          mode: { type: 'closed' },
          tabs: [],
          activeTabId: null,
        };
      }

      let newActiveTabId = state.activeTabId;
      if (state.activeTabId === action.tabId) {
        const newIndex = Math.min(tabIndex, newTabs.length - 1);
        newActiveTabId = newTabs[newIndex]!.id;
      }

      return {
        ...state,
        tabs: newTabs,
        activeTabId: newActiveTabId,
      };
    }

    case 'REORDER_TABS': {
      const { fromIndex, toIndex } = action;
      if (
        fromIndex < 0 ||
        fromIndex >= state.tabs.length ||
        toIndex < 0 ||
        toIndex >= state.tabs.length
      ) {
        return state;
      }

      const newTabs = [...state.tabs];
      const [movedTab] = newTabs.splice(fromIndex, 1);
      newTabs.splice(toIndex, 0, movedTab!);
      return { ...state, tabs: newTabs };
    }

    case 'UPDATE_TAB_STACK': {
      const tabIndex = state.tabs.findIndex((t) => t.id === action.tabId);
      if (tabIndex === -1) return state;

      const newTabs = [...state.tabs];
      newTabs[tabIndex] = { ...newTabs[tabIndex]!, stack: action.stack };
      return { ...state, tabs: newTabs };
    }

    case 'UPDATE_TAB_LABEL': {
      const tabIndex = state.tabs.findIndex((t) => t.id === action.tabId);
      if (tabIndex === -1) return state;

      const newTabs = [...state.tabs];
      newTabs[tabIndex] = { ...newTabs[tabIndex]!, label: action.label };
      return { ...state, tabs: newTabs };
    }

    case 'UPDATE_TAB_DIRTY': {
      const tabIndex = state.tabs.findIndex((t) => t.id === action.tabId);
      if (tabIndex === -1) return state;
      const current = state.tabs[tabIndex]!;
      if (current.isDirty === action.isDirty) return state;

      const newTabs = [...state.tabs];
      newTabs[tabIndex] = { ...current, isDirty: action.isDirty };
      return { ...state, tabs: newTabs };
    }

    case 'RESTORE_STATE':
      return { ...state, ...action.state };

    default:
      return state;
  }
}
