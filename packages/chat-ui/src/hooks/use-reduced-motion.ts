/**
 * useReducedMotion — Detects user's prefers-reduced-motion preference
 *
 * @ai-context
 * - Returns boolean; true when user prefers reduced motion
 * - Listens to mediaQuery change events for reactive updates
 * - Used by animation components to disable/simplify animations
 *
 * @example
 * const prefersReduced = useReducedMotion();
 */

import { useEffect, useState } from 'react';

/** Returns true if user prefers reduced motion. */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersReducedMotion;
}
