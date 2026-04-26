/**
 * @module @tryvienna/ui
 * @description Vienna UI Component System — production-ready, accessible component library
 * built on Radix UI + Tailwind CSS v4 + CVA.
 *
 * ## Import Patterns
 *
 * ```tsx
 * // Import components
 * import { Button, Dialog, Card } from "@tryvienna/ui"
 *
 * // Import by category (tree-shakeable)
 * import { Button, Input } from "@tryvienna/ui/components"
 * import { useCompactMode } from "@tryvienna/ui/hooks"
 * import { cn } from "@tryvienna/ui/utils"
 *
 * // Import styles (required in app root)
 * import "@tryvienna/ui/styles.css"
 * ```
 *
 * @ai-context
 * - All spacing on strict 8pt grid (4px sub-steps)
 * - OKLCH color system with 3 themes: Light, Dark Gold, VS Code Dark
 * - data-slot attributes on every component for CSS targeting
 * - WCAG AAA accessible via Radix UI primitives
 */

export * from './components';
export * from './hooks';
export * from './utils';
