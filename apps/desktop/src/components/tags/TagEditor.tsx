/**
 * TagEditor — Shared tag form used by TagSettings, TagManagerDrawer, etc.
 *
 * @ai-context
 * - Extracted from TagSettings for reuse across settings page and drawer
 * - Stateless form: all values and handlers passed via props
 * - ColorPicker renders preset color swatches
 * - Dependencies managed via Combobox + TagChip removables
 * - Spawn workstream toggle with worktree mode select
 * - data-slot="tag-editor"
 */

import {
  Input,
  Switch,
  Combobox,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@tryvienna/ui';
import { TagChip } from './TagChip';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_COLORS = [
  '#3B82F6', // blue
  '#F97316', // orange
  '#10B981', // emerald
  '#EF4444', // red
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#14B8A6', // teal
  '#F59E0B', // amber
  '#6366F1', // indigo
  '#64748B', // slate
];

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface TagData {
  name: string;
  instructions: string;
  color: string;
  maxDepth: number;
  spawnWorkstream: boolean;
  worktreeMode: 'same' | 'fork' | 'from_main';
  dependsOn: string[];
}

export interface TagEditorProps {
  name: string;
  onNameChange: (name: string) => void;
  instructions: string;
  onInstructionsChange: (instructions: string) => void;
  color: string;
  onColorChange: (color: string) => void;
  spawnWorkstream: boolean;
  onSpawnWorkstreamChange: (v: boolean) => void;
  worktreeMode: 'same' | 'fork' | 'from_main';
  onWorktreeModeChange: (v: 'same' | 'fork' | 'from_main') => void;
  dependencies: Array<{ name: string; color: string }>;
  dependents: Array<{ name: string; color: string }>;
  onAddDependency: (depName: string) => void;
  onRemoveDependency: (depName: string) => void;
  depOptions: Array<{ value: string; label: string }>;
  nameEditable?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Color picker
// ─────────────────────────────────────────────────────────────────────────────

export function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {DEFAULT_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={`Select color ${c}`}
          className="h-5 w-5 rounded-full border-2 shrink-0 transition-all"
          style={{
            backgroundColor: c,
            borderColor: c === value ? 'var(--color-foreground)' : 'transparent',
            transform: c === value ? 'scale(1.15)' : 'scale(1)',
          }}
          onClick={() => onChange(c)}
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tag editor form
// ─────────────────────────────────────────────────────────────────────────────

export function TagEditor({
  name,
  onNameChange,
  instructions,
  onInstructionsChange,
  color,
  onColorChange,
  spawnWorkstream,
  onSpawnWorkstreamChange,
  worktreeMode,
  onWorktreeModeChange,
  dependencies,
  dependents,
  onAddDependency,
  onRemoveDependency,
  depOptions,
  nameEditable = true,
}: TagEditorProps) {
  return (
    <div className="space-y-4" data-slot="tag-editor">
      {/* Name */}
      {nameEditable && (
        <div className="space-y-1.5">
          <span className="text-xs text-muted-foreground">Name</span>
          <Input
            value={name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onNameChange(e.target.value)}
            placeholder="Tag name"
          />
        </div>
      )}

      {/* Color */}
      <div className="space-y-1.5">
        <span className="text-xs text-muted-foreground">Color</span>
        <ColorPicker value={color} onChange={onColorChange} />
      </div>

      {/* Instructions */}
      <div className="space-y-1.5">
        <span className="text-xs text-muted-foreground">Instructions</span>
        <textarea
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm min-h-[5rem] resize-y focus:outline-none focus:ring-1 focus:ring-ring"
          value={instructions}
          onChange={(e) => onInstructionsChange(e.target.value)}
          placeholder="Instructions for the agent when this tag is applied..."
        />
      </div>

      {/* Dependencies */}
      <div className="space-y-1.5">
        <span className="text-xs text-muted-foreground">Runs after</span>
        {dependencies.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {dependencies.map((dep) => (
              <TagChip
                key={dep.name}
                name={dep.name}
                color={dep.color}
                onRemove={() => onRemoveDependency(dep.name)}
              />
            ))}
          </div>
        )}
        {depOptions.length > 0 && (
          <Combobox
            options={depOptions}
            value=""
            onValueChange={(val: string) => {
              if (val) onAddDependency(val);
            }}
            placeholder="Add dependency..."
            searchPlaceholder="Search tags..."
            emptyText="No available tags."
          />
        )}
        {dependencies.length === 0 && depOptions.length === 0 && (
          <p className="text-xs text-muted-foreground/60">No other tags to depend on</p>
        )}
      </div>

      {/* Dependents (read-only) */}
      {dependents.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-xs text-muted-foreground">Required by</span>
          <div className="flex flex-wrap gap-1.5">
            {dependents.map((dep) => (
              <TagChip key={dep.name} name={dep.name} color={dep.color} />
            ))}
          </div>
        </div>
      )}

      {/* Spawn workstream */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <div className="grid gap-0.5">
            <span className="text-xs font-medium">Spawn workstream</span>
            <span className="text-[11px] text-muted-foreground">
              Run in a separate workstream
            </span>
          </div>
          <Switch
            checked={spawnWorkstream}
            onCheckedChange={onSpawnWorkstreamChange}
          />
        </div>
        {spawnWorkstream && (
          <Select
            value={worktreeMode}
            onValueChange={(v: string) => onWorktreeModeChange(v as 'same' | 'fork' | 'from_main')}
          >
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="same">Use parent worktree</SelectItem>
              <SelectItem value="fork">Fork current worktree</SelectItem>
              <SelectItem value="from_main">New worktree from main</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}
