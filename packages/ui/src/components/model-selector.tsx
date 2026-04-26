/**
 * ModelSelector — Model picker built on RichSelect
 *
 * @ai-context
 * - Wraps RichSelect with a configurable set of model options
 * - Each model has id, name, description, accent color, and badge letter
 * - ModelDot renders a colored circle indicator for the selected model
 * - MODEL_REGISTRY is the single source of truth — add new models/providers here
 * - Exports helpers: getModel, getModelDisplayName, getModelColor, getModelBadge
 * - Default model is "sonnet"
 *
 * @example
 * <ModelSelector value="sonnet" onChange={(id) => setModel(id)} />
 */
import { cn } from '../utils/cn';
import { RichSelect } from './rich-select';

// ─── Model Registry ──────────────────────────────────────────────────────────
// Single source of truth for all supported models. To add a new model or
// provider, add an entry here — the badge, selector, and helpers all derive
// from this registry automatically.

interface ModelInfo {
  id: string;
  name: string;
  /** Short label for the top-bar badge (1-2 chars) */
  badge: string;
  description: string;
  color: string;
}

const MODEL_REGISTRY: Record<string, ModelInfo> = {
  haiku: {
    id: 'haiku',
    name: 'Haiku',
    badge: 'H',
    description: 'Fast and efficient',
    color: 'var(--color-emerald-500)',
  },
  sonnet: {
    id: 'sonnet',
    name: 'Sonnet',
    badge: 'S',
    description: 'Balanced performance',
    color: 'var(--color-violet-500)',
  },
  opus: {
    id: 'opus',
    name: 'Opus',
    badge: 'O',
    description: 'Most capable',
    color: 'var(--color-amber-500)',
  },
  'opus[1m]': {
    id: 'opus[1m]',
    name: 'Opus [1M]',
    badge: 'O',
    description: 'Opus with 1M context window',
    color: 'var(--color-amber-500)',
  },
};

const MODEL_LIST: ModelInfo[] = Object.values(MODEL_REGISTRY);
const DEFAULT_MODEL = 'sonnet';

// ─── Backwards-compatible type aliases ────────────────────────────────────────
type ClaudeModelId = keyof typeof MODEL_REGISTRY;
type ClaudeModel = ModelInfo;
const CLAUDE_MODELS = MODEL_REGISTRY as Record<ClaudeModelId, ModelInfo>;
const CLAUDE_MODEL_LIST = MODEL_LIST;

function getModel(id: string): ModelInfo {
  return MODEL_REGISTRY[id] ?? fuzzyMatchModel(id) ?? MODEL_REGISTRY[DEFAULT_MODEL];
}

/** Fuzzy-match a full model ID (e.g. "claude-opus-4-6") to a registry entry. */
function fuzzyMatchModel(modelId: string): ModelInfo | undefined {
  // Check most specific first to avoid "opus" matching before "opusplan"
  if (modelId.includes('haiku')) return MODEL_REGISTRY['haiku'];
  if (modelId.includes('sonnet')) return MODEL_REGISTRY['sonnet'];
  if (modelId.includes('opus')) return MODEL_REGISTRY['opus'];
  return undefined;
}

function getModelDisplayName(modelId: string): string {
  const model = MODEL_REGISTRY[modelId] ?? fuzzyMatchModel(modelId);
  if (model) return model.name;
  return modelId.charAt(0).toUpperCase() + modelId.slice(1);
}

function getModelColor(modelId: string): string {
  const model = MODEL_REGISTRY[modelId] ?? fuzzyMatchModel(modelId);
  return model?.color ?? 'var(--color-gray-500)';
}

function getModelBadge(modelId: string): string {
  const model = MODEL_REGISTRY[modelId] ?? fuzzyMatchModel(modelId);
  return model?.badge ?? modelId.charAt(0).toUpperCase();
}

function ModelDot({ color, className }: { color: string; className?: string }) {
  return (
    <span
      data-slot="model-dot"
      className={cn('inline-block size-2 rounded-full shrink-0', className)}
      style={{ backgroundColor: color }}
    />
  );
}

interface ModelSelectorProps {
  value: string;
  onChange: (modelId: string) => void;
  disabled?: boolean;
  className?: string;
  side?: 'top' | 'bottom';
}

const MODEL_OPTIONS = MODEL_LIST.map((m) => ({
  value: m.id,
  label: m.name,
  description: m.description,
  color: m.color,
}));

function ModelSelector({
  value,
  onChange,
  disabled = false,
  className,
  side = 'bottom',
}: ModelSelectorProps) {
  return (
    <RichSelect
      value={value}
      onValueChange={onChange}
      options={MODEL_OPTIONS}
      disabled={disabled}
      side={side}
      className={className}
      renderValue={(opt) => (
        <span className="flex items-center gap-2">
          <ModelDot color={opt.color as string} />
          <span className="font-medium text-foreground">{opt.label}</span>
        </span>
      )}
      renderOption={(opt) => (
        <span className="flex items-center gap-2">
          <ModelDot color={opt.color as string} />
          <span className="flex flex-col">
            <span className="font-medium leading-tight text-foreground">{opt.label}</span>
            <span className="text-xs text-muted-foreground leading-tight mt-1">
              {opt.description as string}
            </span>
          </span>
        </span>
      )}
    />
  );
}

export {
  ModelSelector,
  ModelDot,
  MODEL_REGISTRY,
  MODEL_LIST,
  CLAUDE_MODELS,
  CLAUDE_MODEL_LIST,
  DEFAULT_MODEL,
  getModel,
  getModelDisplayName,
  getModelColor,
  getModelBadge,
};
export type { ModelSelectorProps, ModelInfo, ClaudeModelId, ClaudeModel };
