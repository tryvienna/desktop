/**
 * cn — Class name composition utility
 *
 * Combines clsx (conditional class joining) with tailwind-merge
 * (intelligent Tailwind class deduplication). This is the foundational
 * utility used by every component for className composition.
 *
 * @ai-context
 * - Always use cn() instead of raw string concatenation for classNames
 * - Later classes win over earlier ones for conflicting Tailwind utilities
 * - Supports conditionals: cn("base", condition && "active", className)
 * - Handles undefined/null/false values gracefully
 *
 * @example
 * cn("px-4 py-2", "px-8")           // → "py-2 px-8" (px-8 wins)
 * cn("flex", isActive && "bg-blue")  // → "flex bg-blue" or "flex"
 * cn(buttonVariants({ variant }), className) // → merged variant + overrides
 */
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
