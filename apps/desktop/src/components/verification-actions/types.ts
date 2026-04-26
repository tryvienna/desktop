/**
 * Verification Actions — Shared type interfaces.
 *
 * @module verification-actions/types
 */

export interface VerificationActionConfig {
  id: string;
  type: 'builtin' | 'prompt';
  label: string;
  builtinId?: string;
  prompt?: string;
  source: 'custom' | 'registry';
}

/** Shape persisted in localStorage. */
export interface VerificationActionsState {
  actions: VerificationActionConfig[];
  initialized: boolean;
  modified: boolean;
}

/** Generate a short unique ID for new actions. */
export function generateId(): string {
  return `va-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}
