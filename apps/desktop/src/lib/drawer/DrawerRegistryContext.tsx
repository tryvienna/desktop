/**
 * DrawerRegistryContext — React integration for the DrawerRegistry.
 *
 * @ai-context
 * - DrawerRegistryProvider wraps tree with registry context (defaults to globalDrawerRegistry)
 * - useDrawerRegistry() returns registry instance (does NOT re-render on registration changes)
 * - useDrawerRegistrySnapshot() uses useSyncExternalStore to re-render on version changes
 * - useDrawerRegistration() registers a single renderer, auto-unregisters on unmount
 * - useDrawerRegistrations() batch version for registering multiple renderers
 * - useHasDrawerRenderer() checks if content has a registered renderer
 */

import {
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
  useCallback,
  type ReactNode,
} from 'react';
import type { DrawerRegistration, DrawerContentDescriptor } from './types';
import { DrawerRegistry, globalDrawerRegistry } from './DrawerRegistry';

const DrawerRegistryContext = createContext<DrawerRegistry>(globalDrawerRegistry);

export interface DrawerRegistryProviderProps {
  children: ReactNode;
  registry?: DrawerRegistry;
}

export function DrawerRegistryProvider({
  children,
  registry = globalDrawerRegistry,
}: DrawerRegistryProviderProps) {
  return (
    <DrawerRegistryContext.Provider value={registry}>
      {children}
    </DrawerRegistryContext.Provider>
  );
}

/** Access the registry instance (does NOT re-render on registration changes) */
export function useDrawerRegistry(): DrawerRegistry {
  return useContext(DrawerRegistryContext);
}

/** Snapshot that re-renders when registrations change (via useSyncExternalStore) */
export function useDrawerRegistrySnapshot(): DrawerRegistry {
  const registry = useContext(DrawerRegistryContext);

  const subscribe = useCallback(
    (onStoreChange: () => void) => registry.subscribe(onStoreChange),
    [registry]
  );

  const getSnapshot = useCallback(() => registry.getVersion(), [registry]);

  useSyncExternalStore(subscribe, getSnapshot);

  return registry;
}

/** Register a single renderer, auto-unregister on unmount */
export function useDrawerRegistration(registration: DrawerRegistration): void {
  const registry = useDrawerRegistry();

  useEffect(() => {
    return registry.register(registration);
    // Intentionally exclude registration from deps — caller must provide stable reference
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registry]);
}

/** Register multiple renderers, auto-unregister on unmount */
export function useDrawerRegistrations(registrations: DrawerRegistration[]): void {
  const registry = useDrawerRegistry();

  useEffect(() => {
    return registry.registerAll(registrations);
    // Intentionally exclude registrations from deps — caller must provide stable reference
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registry]);
}

/** Check if a renderer exists for the given content */
export function useHasDrawerRenderer(content: DrawerContentDescriptor): boolean {
  const registry = useDrawerRegistrySnapshot();
  return registry.hasRenderer(content);
}
