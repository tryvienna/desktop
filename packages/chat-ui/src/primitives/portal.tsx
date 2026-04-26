/**
 * Portal — Renders children into a DOM node outside the parent hierarchy
 *
 * @ai-context
 * - Creates a portal div appended to container (default: document.body)
 * - Used for modals, popovers, tooltips, and dropdowns
 * - data-slot="portal" on the created wrapper element
 *
 * @example
 * <Portal><Tooltip>Hello</Tooltip></Portal>
 */

import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export interface PortalProps {
  /** Content to render in the portal */
  children: ReactNode;
  /** Target container (defaults to document.body) */
  container?: Element | null;
}
export function Portal({ children, container }: PortalProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = document.createElement('div');
    element.setAttribute('data-slot', 'portal');
    element.setAttribute('data-portal', 'true');
    element.style.cssText = 'position:absolute;top:0;left:0;z-index:9999;';

    const target = container ?? document.body;
    target.appendChild(element);
    containerRef.current = element;

    return () => {
      target.removeChild(element);
      containerRef.current = null;
    };
  }, [container]);

  return containerRef.current ? createPortal(children, containerRef.current) : null;
}
