/**
 * Drawer System — Public API barrel export.
 *
 * @ai-context
 * - Re-exports all types, hooks, components, and constants for the drawer infrastructure
 * - Consumers import from this barrel: import { useDrawerState, DrawerContainer } from '../lib/drawer'
 */

// Types
export type {
  DrawerContentDescriptor,
  DrawerStackItem,
  DrawerMode,
  DrawerTab,
  DrawerState,
  OpenTabOptions,
  DrawerAction,
  DrawerStateContextValue,
  DrawerActionsContextValue,
  DrawerNavigationContextValue,
  DrawerRenderFn,
  DrawerContentMatcher,
  DrawerRegistration,
  DrawerDisplayMode,
  SerializableDrawerState,
  SerializableDrawerTab,
} from './types';

// Zod schemas
export {
  DrawerContentDescriptorSchema,
  DrawerStackItemSchema,
  DrawerModeSchema,
  SerializableDrawerTabSchema,
  SerializableDrawerStateSchema,
} from './types';

// Constants
export * from './constants';

// Reducer
export { drawerReducer, INITIAL_DRAWER_STATE } from './reducer';

// State context
export { useDrawerState, useDrawerStateOptional } from './DrawerStateContext';

// Actions context
export { useDrawerActions, useDrawerActionsOptional } from './DrawerActionsContext';

// Provider
export { DrawerProvider } from './DrawerProvider';

// Navigation context
export {
  DrawerNavigationProvider,
  StandaloneDrawerNavigationProvider,
  useDrawerNavigation,
  useDrawerNavigationOptional,
} from './DrawerNavigationContext';

// Registry
export { DrawerRegistry, globalDrawerRegistry } from './DrawerRegistry';
export {
  DrawerRegistryProvider,
  useDrawerRegistry,
  useDrawerRegistrySnapshot,
  useDrawerRegistration,
  useDrawerRegistrations,
  useHasDrawerRenderer,
} from './DrawerRegistryContext';

// UI Components
export { DrawerContainer } from './DrawerContainer';
export type { DrawerContainerProps } from './DrawerContainer';
export { ContainerHeader } from './ContainerHeader';
export type { ContainerHeaderProps } from './ContainerHeader';
export { TabbedDrawer } from './TabbedDrawer';
export type { TabbedDrawerProps } from './TabbedDrawer';
export { DrawerTabBar, DrawerTabContent } from './DrawerTabBar';
export { DrawerContentRenderer } from './DrawerContentRenderer';

// Primitives
export {
  ShellContainer,
  ResizeHandle,
  TabBarContainer,
  HeaderContainer,
  HeaderTitle,
  ContentContainer,
  IconButton,
  TabCloseButton,
  SavingIndicator,
  DrawerPill,
} from './primitives';

// Hooks
export { useDrawerKeyboard } from './useDrawerKeyboard';
export { useFocusTrap } from './useFocusTrap';
export { useDrawerPersistence } from './useDrawerPersistence';
