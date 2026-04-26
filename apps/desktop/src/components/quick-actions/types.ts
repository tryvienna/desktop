/**
 * Quick Actions — Shared type interfaces.
 *
 * @module quick-actions/types
 */

export interface QuickActionOption {
  id: string;
  label: string;
  prompt: string;
}

export interface QuickActionCategory {
  id: string;
  label: string;
  icon: string;
  options: QuickActionOption[];
}

export interface QuickActionCategoryWithSource extends QuickActionCategory {
  source: 'custom' | 'registry';
}

/** Shape persisted in localStorage. */
export interface QuickActionsState {
  categories: QuickActionCategoryWithSource[];
  initialized: boolean;
}

/** Shape returned by the registryQuickActions GraphQL query. */
export interface RegistryQuickAction {
  id: string;
  label: string;
  icon: string;
  description: string;
  author: { name: string };
  tags: string[];
  options: QuickActionOption[];
}

/** Generate a short unique ID for new categories/options. */
export function generateId(): string {
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}
