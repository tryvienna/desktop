/**
 * useDrawerPersistence — Debounced localStorage persistence for drawer width.
 *
 * @ai-context
 * - Uses Vienna's usePersistedState for Zod-validated localStorage access
 * - Only persists drawer width (not tabs/mode — those are transient)
 * - Debounces writes (300ms) to avoid localStorage thrashing during resize
 * - Returns loadInitialWidth for DrawerProvider initialState
 * - Returns handleStateChange callback for DrawerProvider onStateChange
 */

import { useCallback, useRef, useEffect } from 'react';
import { usePersistedState } from '../../storage';
import type { DrawerState } from './types';
import { PERSISTENCE_DEBOUNCE_MS } from './constants';

export function useDrawerPersistence() {
  const [persistedWidth, setPersistedWidth] = usePersistedState('drawerWidth');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestWidthRef = useRef(persistedWidth);

  const handleStateChange = useCallback(
    (state: DrawerState) => {
      if (state.width === latestWidthRef.current) return;
      latestWidthRef.current = state.width;

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        setPersistedWidth(state.width);
        timerRef.current = null;
      }, PERSISTENCE_DEBOUNCE_MS);
    },
    [setPersistedWidth]
  );

  // Flush pending writes on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        setPersistedWidth(latestWidthRef.current);
      }
    };
  }, [setPersistedWidth]);

  return {
    initialWidth: persistedWidth,
    handleStateChange,
  };
}
