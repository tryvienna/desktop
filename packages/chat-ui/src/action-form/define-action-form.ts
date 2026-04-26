/**
 * defineActionForm() — Factory for creating validated, immutable action form definitions.
 *
 * @ai-context
 * - Follows the same pattern as defineEntity: declarative config in, frozen definition out
 * - Each form has ordered steps (text, select, multi-select, confirm)
 * - Steps can have async `resolve` handlers to populate options dynamically
 * - Steps can be toggled on/off by users via the customize overlay
 * - `deriveContext` allows later steps to reference earlier answers
 * - Validated at definition time; frozen for immutability
 *
 * @example
 * const newWorkstreamForm = defineActionForm({
 *   id: 'new-workstream',
 *   title: 'New Workstream',
 *   steps: [
 *     { id: 'name', header: 'Name', question: 'What should we call this?', type: 'text', required: true },
 *     { id: 'model', header: 'Model', question: 'Which model?', type: 'select', resolve: async () => [...] },
 *   ],
 *   onSubmit: async (answers) => { ... },
 * });
 */

// ─────────────────────────────────────────────────────────────────────────────
// Step Option (returned by resolve handlers)
// ─────────────────────────────────────────────────────────────────────────────

export interface ActionFormOption {
  /** Unique value identifier */
  value: string;
  /** Display label */
  label: string;
  /** Optional description shown below label */
  description?: string;
  /** Optional accent color (CSS value) */
  color?: string;
  /** Optional icon name (Lucide) */
  icon?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Step Types
// ─────────────────────────────────────────────────────────────────────────────

interface StepBase {
  /** Unique step ID within the form */
  id: string;
  /** Short header label (shown as badge, e.g. "Name", "Model") */
  header: string;
  /** The question text presented to the user */
  question: string;
  /** Whether this step is required (cannot be skipped) */
  required?: boolean;
  /** Whether this step is enabled by default */
  defaultEnabled?: boolean;
  /** Whether the user can toggle this step on/off via customize */
  skippable?: boolean;
  /** When set, shows a [?] help icon next to the question that triggers onHelpClick with this ID */
  helpDocId?: string;
  /**
   * Derive additional context from previous answers.
   * Useful for pre-filling values (e.g. worktree name from workstream name).
   */
  deriveContext?: (answers: Record<string, string>) => Record<string, string>;
  /**
   * When set, this step is only included when the condition returns true
   * given the current answers. Evaluated dynamically as answers change.
   */
  condition?: (answers: Record<string, string>) => boolean;
}

export interface TextStep extends StepBase {
  type: 'text';
  /** Placeholder text for the input */
  placeholder?: string;
  /** Default value (static or derived from context) */
  defaultValue?: string | ((context: Record<string, string>) => string);
  /** Optional validation — may be async (e.g. to check filesystem) */
  validate?: (value: string, answers: Record<string, string>) => string | null | Promise<string | null>;
}

export interface SelectStep extends StepBase {
  type: 'select';
  /** Static options, or async resolver to load them */
  options?: ActionFormOption[];
  resolve?: () => Promise<ActionFormOption[]>;
  /** Default selected value */
  defaultValue?: string | ((context: Record<string, string>) => string);
  /**
   * Freeform option config. When set, selecting the specified option reveals an
   * inline text input instead of auto-advancing. The answer stored is the typed
   * text, not the option value.
   *
   * Use case: a "Yes/No" select where "Yes" expands into a text field
   * (e.g. "create worktree?" → Yes shows a branch name input).
   */
  freeformOption?: {
    /** Which option value triggers the freeform text input */
    optionValue: string;
    /** Default text for the freeform input (static or derived from context) */
    defaultText?: string | ((context: Record<string, string>) => string);
    /** Placeholder for the freeform input */
    placeholder?: string;
  };
}

export interface MultiSelectStep extends StepBase {
  type: 'multi-select';
  /** Static options, or async resolver to load them */
  options?: ActionFormOption[];
  resolve?: () => Promise<ActionFormOption[]>;
  /** Default selected values */
  defaultValue?: string[] | ((context: Record<string, string>) => string[]);
  /**
   * When set, shows a search/create input above the options list.
   * If the user types text that doesn't match any existing option and presses Enter,
   * this callback is called to create a new option. The returned option is added
   * to the list and automatically selected.
   */
  onCreateOption?: (text: string) => Promise<ActionFormOption>;
  /** Placeholder for the search/create input */
  placeholder?: string;
}

export interface ComboboxStep extends StepBase {
  type: 'combobox';
  /** Placeholder text for the input */
  placeholder?: string;
  /** Static options, or async resolver to load them */
  options?: ActionFormOption[];
  resolve?: () => Promise<ActionFormOption[]>;
  /** Default value (static or derived from context) */
  defaultValue?: string | ((context: Record<string, string>) => string);
  /**
   * Value used when user wants to skip / select nothing.
   * Rendered as the first option with label "None".
   * When set, the combobox shows a "None" option at the top.
   */
  noneValue?: string;
  /** Label for the none option (default: "None") */
  noneLabel?: string;
  /**
   * Dynamic option resolver called as the user types. Results are merged
   * with (and shown below) the static/resolve options. Called with debounce.
   */
  resolveOnInput?: (text: string) => Promise<ActionFormOption[]>;
  /**
   * Intercept an option selection before the step advances.
   * Return a replacement value string to use as the answer and advance,
   * or return `null` to cancel advancement (e.g. user cancelled a picker).
   * Use for options like "Browse…" that trigger async side-effects.
   */
  onSelectOption?: (value: string) => Promise<string | null>;
  /** Optional validation — may be async (e.g. to check if directory exists) */
  validate?: (value: string, answers: Record<string, string>) => string | null | Promise<string | null>;
}

export interface ConfirmStep extends StepBase {
  type: 'confirm';
  /** Label for the confirm button (default: "Yes") */
  confirmLabel?: string;
  /** Label for the deny button (default: "No") */
  denyLabel?: string;
  /** Default value */
  defaultValue?: boolean | ((context: Record<string, string>) => boolean);
  /** Pre-filled text shown alongside (e.g. sanitized worktree name) */
  previewText?: (context: Record<string, string>) => string;
}

export interface DisplayStep extends StepBase {
  type: 'display';
  /** Static items to display, or async resolver to load them */
  items?: ActionFormOption[];
  resolve?: () => Promise<ActionFormOption[]>;
  /**
   * The value stored as the answer (auto-set, not user-editable).
   * If omitted, defaults to comma-separated item values.
   */
  value?: string;
}

export type ActionFormStep = TextStep | SelectStep | MultiSelectStep | ComboboxStep | ConfirmStep | DisplayStep;

// ─────────────────────────────────────────────────────────────────────────────
// Form Config (input to defineActionForm)
// ─────────────────────────────────────────────────────────────────────────────

export interface ActionFormConfig {
  /** Unique form identifier */
  id: string;
  /** Display title (shown in header) */
  title: string;
  /** Optional description */
  description?: string;
  /** Optional icon name (Lucide) */
  icon?: string;
  /** Keyboard shortcut that triggers this form (e.g. "mod+n") */
  shortcut?: string;
  /** Ordered list of form steps */
  steps: ActionFormStep[];
  /** Called when the form is submitted with all answers */
  onSubmit: (answers: Record<string, string>) => Promise<void> | void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Form Definition (output of defineActionForm)
// ─────────────────────────────────────────────────────────────────────────────

export interface ActionFormDefinition {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly icon?: string;
  readonly shortcut?: string;
  readonly steps: ReadonlyArray<ActionFormStep>;
  readonly onSubmit: (answers: Record<string, string>) => Promise<void> | void;
  /** Get a step by ID */
  getStep(stepId: string): ActionFormStep | undefined;
  /** Get the list of steps that are enabled given user preferences */
  getActiveSteps(disabledStepIds?: string[], answers?: Record<string, string>): ActionFormStep[];
  /** Get step IDs that are skippable (user can toggle) */
  getSkippableStepIds(): string[];
  /** Get step IDs that are required (cannot be toggled off) */
  getRequiredStepIds(): string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Errors
// ─────────────────────────────────────────────────────────────────────────────

export class ActionFormDefinitionError extends Error {
  constructor(
    readonly formId: string,
    readonly field: string,
    message: string,
  ) {
    super(`ActionForm '${formId}' — ${field}: ${message}`);
    this.name = 'ActionFormDefinitionError';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Factory
// ─────────────────────────────────────────────────────────────────────────────

export function defineActionForm(config: ActionFormConfig): ActionFormDefinition {
  // Validate form ID
  if (!config.id?.trim()) {
    throw new ActionFormDefinitionError(config.id ?? '', 'id', 'id is required');
  }
  if (!/^[a-z][a-z0-9_-]*$/.test(config.id)) {
    throw new ActionFormDefinitionError(
      config.id,
      'id',
      'id must be lowercase alphanumeric with hyphens/underscores, starting with a letter',
    );
  }

  // Validate title
  if (!config.title?.trim()) {
    throw new ActionFormDefinitionError(config.id, 'title', 'title is required');
  }

  // Validate steps
  if (!config.steps?.length) {
    throw new ActionFormDefinitionError(config.id, 'steps', 'at least one step is required');
  }

  // Validate unique step IDs
  const seen = new Set<string>();
  for (const step of config.steps) {
    if (!step.id?.trim()) {
      throw new ActionFormDefinitionError(config.id, 'steps', 'every step must have an id');
    }
    if (seen.has(step.id)) {
      throw new ActionFormDefinitionError(config.id, 'steps', `duplicate step id: '${step.id}'`);
    }
    seen.add(step.id);
  }

  // Validate select/multi-select/combobox steps have options or resolve
  for (const step of config.steps) {
    if ((step.type === 'select' || step.type === 'multi-select') && !step.options && !step.resolve) {
      throw new ActionFormDefinitionError(
        config.id,
        'steps',
        `step '${step.id}' (${step.type}) must have either 'options' or 'resolve'`,
      );
    }
    if (step.type === 'combobox' && !step.options && !step.resolve && !step.resolveOnInput) {
      throw new ActionFormDefinitionError(
        config.id,
        'steps',
        `step '${step.id}' (${step.type}) must have either 'options' or 'resolve'`,
      );
    }
    if (step.type === 'display' && !step.items && !step.resolve) {
      throw new ActionFormDefinitionError(
        config.id,
        'steps',
        `step '${step.id}' (display) must have either 'items' or 'resolve'`,
      );
    }
  }

  // Normalize step defaults
  const steps: ReadonlyArray<ActionFormStep> = Object.freeze(
    config.steps.map((s) =>
      Object.freeze({
        ...s,
        required: s.required ?? false,
        defaultEnabled: s.defaultEnabled ?? true,
        skippable: s.skippable ?? !s.required,
      }),
    ),
  );

  const definition: ActionFormDefinition = {
    id: config.id,
    title: config.title,
    description: config.description,
    icon: config.icon,
    shortcut: config.shortcut,
    steps,
    onSubmit: config.onSubmit,

    getStep(stepId: string) {
      return steps.find((s) => s.id === stepId);
    },

    getActiveSteps(disabledStepIds?: string[], answers?: Record<string, string>) {
      // disabledStepIds acts as a toggle override from defaultEnabled.
      // If a step is in the set, its enabled state is flipped from its default.
      const overrides = new Set(disabledStepIds ?? []);
      return steps.filter((s) => {
        // Conditional steps are excluded when their condition is not met
        if (s.condition && !s.condition(answers ?? {})) return false;
        if (s.required) return true;
        const isOverridden = overrides.has(s.id);
        return isOverridden ? !s.defaultEnabled : s.defaultEnabled;
      });
    },

    getSkippableStepIds() {
      return steps.filter((s) => s.skippable && !s.required).map((s) => s.id);
    },

    getRequiredStepIds() {
      return steps.filter((s) => s.required).map((s) => s.id);
    },
  };

  return Object.freeze(definition);
}
