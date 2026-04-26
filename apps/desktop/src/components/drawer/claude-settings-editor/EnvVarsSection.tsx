import { useMemo, useState } from 'react';
import { Input, Tooltip, TooltipTrigger, TooltipContent, TooltipProvider, Checkbox, Label } from '@tryvienna/ui';
import { Info, Plus, Search, X } from 'lucide-react';
import { CollapsibleSection } from './CollapsibleSection';
import { deepGet } from './useClaudeSettingsFile';
import type { SectionProps } from './types';
import { matchesFilter } from './types';

interface EnvVar {
  name: string;
  description: string;
}

interface EnvVarCategory {
  label: string;
  items: EnvVar[];
}

const INITIAL_VISIBLE = 15;

const ENV_VAR_CATEGORIES: EnvVarCategory[] = [
  {
    label: 'API & Authentication',
    items: [
      { name: 'ANTHROPIC_API_KEY', description: 'API key for Anthropic services' },
      { name: 'ANTHROPIC_AUTH_TOKEN', description: 'Alternative bearer token' },
      { name: 'ANTHROPIC_BASE_URL', description: 'Custom Anthropic API endpoint' },
      { name: 'ANTHROPIC_CUSTOM_HEADERS', description: 'Custom HTTP headers (newline-separated Key: Value)' },
      { name: 'API_TIMEOUT_MS', description: 'API request timeout in milliseconds' },
      { name: 'CLAUDE_CODE_MAX_RETRIES', description: 'Max API request retries' },
    ],
  },
  {
    label: 'Model Configuration',
    items: [
      { name: 'ANTHROPIC_MODEL', description: 'Override the default Claude model' },
      { name: 'ANTHROPIC_DEFAULT_OPUS_MODEL', description: 'Pin model for opus alias' },
      { name: 'ANTHROPIC_DEFAULT_SONNET_MODEL', description: 'Pin model for sonnet alias' },
      { name: 'ANTHROPIC_DEFAULT_HAIKU_MODEL', description: 'Pin model for haiku alias' },
      { name: 'CLAUDE_CODE_SUBAGENT_MODEL', description: 'Force model for sub-agents' },
      { name: 'CLAUDE_CODE_MAX_OUTPUT_TOKENS', description: 'Max output tokens' },
      { name: 'MAX_THINKING_TOKENS', description: 'Max tokens for extended thinking' },
      { name: 'CLAUDE_CODE_EFFORT_LEVEL', description: 'Reasoning effort: low, medium, high, max' },
    ],
  },
  {
    label: 'AWS Bedrock',
    items: [
      { name: 'CLAUDE_CODE_USE_BEDROCK', description: 'Route API calls through Bedrock (set to 1)' },
      { name: 'BEDROCK_BASE_URL', description: 'Custom Bedrock endpoint' },
      { name: 'AWS_REGION', description: 'AWS region for Bedrock' },
      { name: 'AWS_PROFILE', description: 'AWS profile for credentials' },
    ],
  },
  {
    label: 'Google Vertex AI',
    items: [
      { name: 'CLAUDE_CODE_USE_VERTEX', description: 'Route API calls through Vertex AI (set to 1)' },
      { name: 'VERTEX_BASE_URL', description: 'Custom Vertex AI endpoint' },
      { name: 'ANTHROPIC_VERTEX_PROJECT_ID', description: 'Google Cloud project ID' },
      { name: 'CLOUD_ML_REGION', description: 'Google Cloud region' },
    ],
  },
  {
    label: 'Proxy & Network',
    items: [
      { name: 'HTTP_PROXY', description: 'HTTP proxy URL' },
      { name: 'HTTPS_PROXY', description: 'HTTPS proxy URL' },
      { name: 'NO_PROXY', description: 'Domains to bypass proxy' },
      { name: 'NODE_EXTRA_CA_CERTS', description: 'Additional CA certificates path' },
      { name: 'CLAUDE_CODE_CLIENT_CERT', description: 'Client TLS certificate for mTLS' },
    ],
  },
  {
    label: 'Shell & Tools',
    items: [
      { name: 'CLAUDE_CODE_SHELL', description: 'Override shell for Bash tool' },
      { name: 'BASH_DEFAULT_TIMEOUT_MS', description: 'Bash command timeout in ms' },
      { name: 'BASH_MAX_OUTPUT_LENGTH', description: 'Max bash output characters (default: 30000)' },
      { name: 'CLAUDE_CODE_MAX_TOOL_USE_CONCURRENCY', description: 'Max concurrent tool executions' },
      { name: 'CLAUDE_CODE_GLOB_TIMEOUT_SECONDS', description: 'Glob operation timeout' },
    ],
  },
  {
    label: 'MCP Servers',
    items: [
      { name: 'MCP_TIMEOUT', description: 'MCP connection timeout in ms (default: 30000)' },
      { name: 'MCP_TOOL_TIMEOUT', description: 'MCP tool execution timeout in ms' },
      { name: 'MAX_MCP_OUTPUT_TOKENS', description: 'Max tokens for MCP output (default: 25000)' },
    ],
  },
  {
    label: 'Feature Flags',
    items: [
      { name: 'DISABLE_TELEMETRY', description: 'Disable telemetry collection' },
      { name: 'CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC', description: 'Disable updates, telemetry, error reporting' },
      { name: 'CLAUDE_CODE_DISABLE_AUTO_MEMORY', description: 'Disable auto MEMORY.md writes' },
      { name: 'DISABLE_AUTO_COMPACT', description: 'Disable automatic context compaction' },
      { name: 'CLAUDE_CODE_DISABLE_FAST_MODE', description: 'Disable fast mode' },
      { name: 'CLAUDE_CODE_DISABLE_THINKING', description: 'Disable extended thinking' },
      { name: 'DISABLE_PROMPT_CACHING', description: 'Disable prompt caching' },
      { name: 'CLAUDE_CODE_ACCESSIBILITY', description: 'Enable accessibility mode' },
    ],
  },
  {
    label: 'Telemetry (OpenTelemetry)',
    items: [
      { name: 'OTEL_EXPORTER_OTLP_ENDPOINT', description: 'OTLP exporter endpoint URL' },
      { name: 'OTEL_EXPORTER_OTLP_HEADERS', description: 'OTLP exporter headers' },
      { name: 'OTEL_LOG_USER_PROMPTS', description: 'Include user prompts in telemetry' },
    ],
  },
  {
    label: 'Directories & Paths',
    items: [
      { name: 'CLAUDE_CONFIG_DIR', description: 'Custom config directory (default: ~/.claude)' },
      { name: 'CLAUDE_CODE_TMPDIR', description: 'Custom temp directory' },
      { name: 'CLAUDE_CODE_DEBUG_LOGS_DIR', description: 'Custom debug log directory' },
    ],
  },
];

// Build a lookup for known var descriptions
const KNOWN_VARS = new Map<string, { description: string; category: string }>();
for (const cat of ENV_VAR_CATEGORIES) {
  for (const item of cat.items) {
    KNOWN_VARS.set(item.name, { description: item.description, category: cat.label });
  }
}

export function EnvVarsSection({ settings, updateField, deleteField, filter }: SectionProps) {
  const env = (deepGet(settings, ['env']) ?? {}) as Record<string, string>;
  const [search, setSearch] = useState('');
  const [draftKey, setDraftKey] = useState('');
  const [draftValue, setDraftValue] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [onlySet, setOnlySet] = useState(false);

  const updateValue = (key: string, value: string) => {
    updateField(['env', key], value);
  };

  const remove = (key: string) => {
    const next = { ...env };
    delete next[key];
    if (Object.keys(next).length === 0) deleteField(['env']);
    else updateField(['env'], next);
  };

  const add = () => {
    const k = draftKey.trim();
    if (!k) return;
    updateField(['env', k], draftValue);
    setDraftKey('');
    setDraftValue('');
  };

  // Combine: custom env vars (ones set but not in known list) shown at top,
  // then known vars by category. Each row shows [label] [input] [info/remove].
  const customEntries = useMemo(() => {
    return Object.entries(env)
      .filter(([k]) => !KNOWN_VARS.has(k))
      .sort(([a], [b]) => a.localeCompare(b));
  }, [env]);

  // Filter categories based on drawer filter + local search + onlySet
  const term = (filter || search).toLowerCase();
  const filteredCategories = useMemo(() => {
    return ENV_VAR_CATEGORIES
      .map((cat) => ({
        ...cat,
        items: cat.items.filter(
          (item) =>
            (!onlySet || item.name in env) &&
            (!term ||
              item.name.toLowerCase().includes(term) ||
              item.description.toLowerCase().includes(term) ||
              cat.label.toLowerCase().includes(term))
        ),
      }))
      .filter((cat) => cat.items.length > 0);
  }, [term, onlySet, env]);

  // Progressive disclosure: flatten for counting
  const flatFiltered = useMemo(() => filteredCategories.flatMap((c) => c.items), [filteredCategories]);
  const totalCount = flatFiltered.length;
  const isFiltering = !!filter || !!search;
  const shouldTruncate = !showAll && !isFiltering && totalCount > INITIAL_VISIBLE;

  // Build visible categories with truncation
  const visibleCategories = useMemo(() => {
    if (!shouldTruncate) return filteredCategories;
    let remaining = INITIAL_VISIBLE;
    return filteredCategories
      .map((cat) => {
        if (remaining <= 0) return null;
        const items = cat.items.slice(0, remaining);
        remaining -= items.length;
        return { ...cat, items };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null && c.items.length > 0);
  }, [filteredCategories, shouldTruncate]);

  // Filter custom entries too
  const filteredCustom = useMemo(() => {
    if (!term) return customEntries;
    return customEntries.filter(([k]) => k.toLowerCase().includes(term));
  }, [customEntries, term]);

  const allNames = useMemo(() => flatFiltered.map((v) => v.name), [flatFiltered]);
  if (!matchesFilter(filter, 'Environment Variables', 'env', 'ENV', 'variable', ...allNames)) return null;

  return (
    <CollapsibleSection title="Environment Variables" defaultOpen={false} forceOpen={filter ? true : undefined}>
      {/* Search + filter */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search variables..."
            className="h-7 pl-7 text-xs"
          />
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Checkbox
            id="env-only-set"
            checked={onlySet}
            onCheckedChange={(v) => setOnlySet(v === true)}
            className="h-3.5 w-3.5"
          />
          <Label htmlFor="env-only-set" className="cursor-pointer text-xs text-muted-foreground">Set</Label>
        </div>
      </div>

      <TooltipProvider delayDuration={200}>
        {/* Custom (non-known) set variables */}
        {filteredCustom.length > 0 && (
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium text-muted-foreground">Custom Variables</p>
            {filteredCustom.map(([k, v]) => (
              <div key={k} className="flex items-center gap-2">
                <code className="w-1/3 shrink-0 truncate text-xs" title={k}>{k}</code>
                <Input
                  value={v}
                  onChange={(e) => updateValue(k, e.target.value)}
                  className="h-7 flex-1 text-xs"
                />
                <button
                  type="button"
                  className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground"
                  onClick={() => remove(k)}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add custom variable */}
        <div className="flex items-center gap-2 border-t border-border pt-2">
          <Input
            value={draftKey}
            onChange={(e) => setDraftKey(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
            placeholder="CUSTOM_VAR"
            className="h-7 w-1/3 shrink-0 font-mono text-xs"
          />
          <Input
            value={draftValue}
            onChange={(e) => setDraftValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
            placeholder="value"
            className="h-7 flex-1 text-xs"
          />
          <button
            type="button"
            className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground"
            onClick={add}
          >
            <Plus size={14} />
          </button>
        </div>

        {/* Known variables by category — all shown inline as rows */}
        {visibleCategories.map((cat) => (
          <div key={cat.label} className="flex flex-col gap-1 border-t border-border pt-2">
            <p className="text-xs font-medium text-muted-foreground">{cat.label}</p>
            {cat.items.map((item) => {
              const value = env[item.name] ?? '';
              const isSet = item.name in env;
              return (
                <div key={item.name} className="flex items-center gap-2">
                  <code className="w-1/3 shrink-0 truncate text-xs" title={item.name}>{item.name}</code>
                  <Input
                    value={value}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v || isSet) updateValue(item.name, v);
                    }}
                    placeholder="Not set"
                    className="h-7 flex-1 text-xs"
                  />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="shrink-0 rounded p-0.5 text-muted-foreground">
                        <Info size={12} />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-64 text-xs">
                      {item.description}
                    </TooltipContent>
                  </Tooltip>
                  {isSet && (
                    <button
                      type="button"
                      className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground"
                      onClick={() => remove(item.name)}
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {shouldTruncate && (
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setShowAll(true)}
          >
            Show all {totalCount} variables...
          </button>
        )}
      </TooltipProvider>
    </CollapsibleSection>
  );
}
