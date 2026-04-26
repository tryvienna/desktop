/**
 * PermissionTemplatesSection — Manage reusable permission templates.
 *
 * Templates are named sets of permission rules that can be applied to
 * workstreams or groups during creation. Displayed in the Permissions
 * settings page below the global permission controls.
 */

import { useState, useCallback, useMemo } from 'react';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { Button, Input } from '@tryvienna/ui';
import { usePermissionTemplates } from './usePermissionTemplates';
import { PermissionToolGroup } from './PermissionToolGroup';
import { TOOL_GROUP_DISPLAY, ALL_STATIC_TOOLS } from './constants';

interface PermissionRuleConfig {
  tool: string;
  behavior: 'allow' | 'ask';
  entityType?: string;
}

function ruleKey(tool: string): string {
  return `${tool}:*:*`;
}

function buildRulesMap(rules: PermissionRuleConfig[]): Map<string, PermissionRuleConfig> {
  const map = new Map<string, PermissionRuleConfig>();
  for (const rule of rules) {
    map.set(ruleKey(rule.tool), rule);
  }
  return map;
}

function getPermissionFromMap(map: Map<string, PermissionRuleConfig>, tool: string): 'allow' | 'ask' {
  const exact = map.get(ruleKey(tool));
  if (exact) return exact.behavior;
  const wildcard = map.get(ruleKey('*'));
  if (wildcard) return wildcard.behavior;
  return 'ask';
}

function toggleToolInRules(rules: PermissionRuleConfig[], tool: string, behavior: 'allow' | 'ask'): PermissionRuleConfig[] {
  const key = ruleKey(tool);
  const existing = rules.findIndex((r) => ruleKey(r.tool) === key);
  const newRules = [...rules];

  if (existing >= 0) {
    if (behavior === 'ask') {
      newRules.splice(existing, 1);
    } else {
      newRules[existing] = { tool, behavior };
    }
  } else if (behavior === 'allow') {
    newRules.push({ tool, behavior });
  }

  return newRules;
}

function countAllowed(rules: PermissionRuleConfig[]): number {
  const map = buildRulesMap(rules);
  let count = 0;
  for (const tool of ALL_STATIC_TOOLS) {
    if (getPermissionFromMap(map, tool) === 'allow') count++;
  }
  return count;
}

// ─── Template Editor ─────────────────────────────────────────────────────────

interface TemplateEditorProps {
  initialName: string;
  initialDescription: string;
  initialRules: PermissionRuleConfig[];
  onSave: (name: string, description: string, rules: PermissionRuleConfig[]) => void;
  onCancel: () => void;
  saveLabel: string;
}

function TemplateEditor({ initialName, initialDescription, initialRules, onSave, onCancel, saveLabel }: TemplateEditorProps) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [rules, setRules] = useState<PermissionRuleConfig[]>(initialRules);

  const rulesMap = useMemo(() => buildRulesMap(rules), [rules]);

  const getPermission = useCallback(
    (tool: string) => getPermissionFromMap(rulesMap, tool),
    [rulesMap],
  );

  const handleToggle = useCallback(
    (tool: string, behavior: 'allow' | 'ask') => {
      setRules((prev) => toggleToolInRules(prev, tool, behavior));
    },
    [],
  );

  const handleSave = useCallback(() => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave(trimmed, description.trim(), rules);
  }, [name, description, rules, onSave]);

  const allowed = countAllowed(rules);

  return (
    <div className="grid gap-4 rounded-lg border border-border p-4">
      <div className="grid gap-3">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Template name (e.g. Bug Fixing, Research)"
          className="text-sm"
          autoFocus
        />
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          className="text-sm"
        />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {allowed} of {ALL_STATIC_TOOLS.length} tools auto-allowed
        </p>
      </div>

      <div className="grid gap-2">
        {TOOL_GROUP_DISPLAY.map((group) => (
          <PermissionToolGroup
            key={group.id}
            group={group}
            getPermission={getPermission}
            onToggle={handleToggle}
          />
        ))}
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X size={14} className="mr-1" />
          Cancel
        </Button>
        <Button size="sm" onClick={handleSave} disabled={!name.trim()}>
          <Check size={14} className="mr-1" />
          {saveLabel}
        </Button>
      </div>
    </div>
  );
}

// ─── Template Card ───────────────────────────────────────────────────────────

interface TemplateCardProps {
  template: {
    id: string;
    name: string;
    description: string;
    rules: PermissionRuleConfig[];
  };
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

function TemplateCard({ template, onEdit, onDelete }: TemplateCardProps) {
  const allowed = countAllowed(template.rules);

  return (
    <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
      <div className="flex items-center gap-3">
        <div>
          <span className="text-sm font-medium">{template.name}</span>
          {template.description && (
            <p className="text-xs text-muted-foreground">{template.description}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {allowed} of {ALL_STATIC_TOOLS.length} tools allowed
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(template.id)}>
          <Pencil size={14} />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDelete(template.id)}>
          <Trash2 size={14} />
        </Button>
      </div>
    </div>
  );
}

// ─── Main Section ────────────────────────────────────────────────────────────

export function PermissionTemplatesSection() {
  const { loading, templates, createTemplate, updateTemplate, deleteTemplate } = usePermissionTemplates();
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleCreate = useCallback(
    (name: string, description: string, rules: PermissionRuleConfig[]) => {
      void createTemplate(name, description, rules);
      setIsCreating(false);
    },
    [createTemplate],
  );

  const handleUpdate = useCallback(
    (name: string, description: string, rules: PermissionRuleConfig[]) => {
      if (!editingId) return;
      void updateTemplate(editingId, { name, description, rules });
      setEditingId(null);
    },
    [editingId, updateTemplate],
  );

  const handleDelete = useCallback(
    (id: string) => {
      void deleteTemplate(id);
    },
    [deleteTemplate],
  );

  if (loading) return null;

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Permission Templates</h3>
          <p className="text-xs text-muted-foreground">
            Reusable permission sets applied when creating workstreams or groups
          </p>
        </div>
        {!isCreating && (
          <Button variant="outline" size="sm" onClick={() => setIsCreating(true)}>
            <Plus size={14} className="mr-1" />
            New Template
          </Button>
        )}
      </div>

      {isCreating && (
        <TemplateEditor
          initialName=""
          initialDescription=""
          initialRules={[]}
          onSave={handleCreate}
          onCancel={() => setIsCreating(false)}
          saveLabel="Create"
        />
      )}

      {templates.map((template) =>
        editingId === template.id ? (
          <TemplateEditor
            key={template.id}
            initialName={template.name}
            initialDescription={template.description}
            initialRules={template.rules}
            onSave={handleUpdate}
            onCancel={() => setEditingId(null)}
            saveLabel="Save"
          />
        ) : (
          <TemplateCard
            key={template.id}
            template={template}
            onEdit={setEditingId}
            onDelete={handleDelete}
          />
        ),
      )}

      {templates.length === 0 && !isCreating && (
        <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center">
          <p className="text-sm text-muted-foreground">
            No templates yet. Create one to quickly apply permissions when creating workstreams.
          </p>
        </div>
      )}
    </div>
  );
}
