/**
 * Action Form system — Declarative quick forms that replace the chat input
 *
 * @ai-context
 * - defineActionForm: Factory for creating form definitions (like defineEntity)
 * - ActionFormBar: Runtime component that renders the form
 * - useActionFormState: State management hook
 * - Step types: text, select, multi-select, combobox, confirm, display
 * - Supports async option resolution, step customization, keyboard navigation
 */

export { defineActionForm, ActionFormDefinitionError } from './define-action-form';
export type {
  ActionFormConfig,
  ActionFormDefinition,
  ActionFormStep,
  ActionFormOption,
  TextStep,
  SelectStep,
  MultiSelectStep,
  ComboboxStep,
  ConfirmStep,
  DisplayStep,
} from './define-action-form';

export { ActionFormBar } from './action-form-bar';
export type { ActionFormBarProps } from './action-form-bar';

export { useActionFormState } from './use-action-form-state';
export type { ActionFormState, ActionFormActions } from './use-action-form-state';
