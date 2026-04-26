/**
 * useCompactMode — Responsive window width detection for Electron
 *
 * @ai-context
 * - Replaces drift-v2's useIsMobile (which was hardcoded to 768px)
 * - Adapted for Electron: uses window resize events, no touch detection
 * - Configurable breakpoint (default 768px) for compact/full mode switching
 * - Returns true when window width is below the breakpoint
 * - Used by Sidebar to switch between collapsed and expanded modes
 *
 * @example
 * const isCompact = useCompactMode()       // default 768px breakpoint
 * const isCompact = useCompactMode(1024)   // custom breakpoint
 */
import { useState, useEffect } from 'react';

const DEFAULT_BREAKPOINT = 768;

export function useCompactMode(breakpoint: number = DEFAULT_BREAKPOINT) {
  const [isCompact, setIsCompact] = useState(
    typeof window !== 'undefined' ? window.innerWidth < breakpoint : false
  );

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const onChange = (e: MediaQueryListEvent) => setIsCompact(e.matches);

    setIsCompact(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [breakpoint]);

  return isCompact;
}
