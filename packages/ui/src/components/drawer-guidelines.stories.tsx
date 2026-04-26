/**
 * Drawer UI Guidelines — Interactive reference stories
 *
 * Comprehensive showcase of every drawer composition pattern used in Vienna,
 * rendered with the Enhanced Vienna UI spec: accent badges,
 * semantic surfaces, pinned footers.
 *
 * Pattern categories:
 *   1. Settings Form — multi-section settings (workstream/group)
 *   2. Plugin Settings — credentials, OAuth, filters, toggle groups
 *   3. Entity Detail — metadata display, inline editing, actions
 *   4. Permissions — hierarchical tool toggles with inheritance
 *   5. List / Browse — navigable item lists (store, help docs, skills)
 *   6. Review / Approval — file changes, diff review
 *   7. Simple Form — feedback, quick input
 */
import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import {
  DrawerPanel,
  DrawerPanelContent,
  DrawerPanelFooter,
} from './drawer-layout';
import { Button } from './button';
import { Badge } from './badge';
import { Switch } from './switch';
import { Separator } from './separator';
import { Avatar, AvatarFallback } from './avatar';
import { Label } from './label';
import { Input } from './input';
import { Textarea } from './textarea';
import { RadioGroup, RadioGroupItem } from './radio-group';
import { Checkbox } from './checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';
import {
  GitBranch,
  Folder,
  Brain,
  Shield,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Sparkles,
  X,
  Zap,
  Bell,
  Lock,
  Palette,
  RotateCcw,
  Check,
  Plus,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  Trash2,
  Tag,
  Search,
  FilePlus,
  FileMinus,
  FileEdit,
  AlertCircle,
  CheckCircle,
  CircleDot,
  Unplug,
  Send,
  Archive,
  Pin,
  Globe,
  Package,
  Download,
  Settings,
  Terminal,
  Hash,
} from 'lucide-react';

const meta = {
  title: 'Guidelines/DrawerPatterns',
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/* ═══════════════════════════════════════════════════════════════════════════════
   Shared: Drawer header replicating real ContainerHeader (48px, pl-3 pr-2)
   ═══════════════════════════════════════════════════════════════════════════════ */

function DrawerHeader({
  title,
  showBack,
  onBack,
  onClose,
  actions,
}: {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  onClose?: () => void;
  actions?: React.ReactNode;
}) {
  return (
    <div
      className="flex items-center gap-2 border-b border-border pl-3 pr-2 shrink-0"
      style={{ height: 48 }}
    >
      {showBack && (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:bg-surface-interactive/50 hover:text-foreground transition-colors [&_svg]:size-4"
        >
          <ChevronLeft />
        </button>
      )}
      <span className="flex-1 truncate text-sm font-medium text-foreground min-w-0">
        {title}
      </span>
      {actions}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:bg-surface-interactive/50 hover:text-foreground transition-colors [&_svg]:size-4"
        >
          <X />
        </button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   PATTERN 1: Settings Form
   Workstream / Group settings — the primary drawer pattern.
   Multi-section form with titled groups, separated by dividers.
   ═══════════════════════════════════════════════════════════════════════════════ */

type SettingsView =
  | { view: 'main' }
  | { view: 'model' }
  | { view: 'directory'; name: string }
  | { view: 'permissions' }
  | { view: 'tags' };

function SettingsFormDrawer() {
  const [viewState, setViewState] = React.useState<SettingsView>({
    view: 'main',
  });
  const goBack = () => setViewState({ view: 'main' });

  /* ── Sub-view: Model ────────────────────────────────────────────────── */
  if (viewState.view === 'model') {
    const [selected, setSelected] = React.useState('opus');
    return (
      <DrawerPanel className="w-[400px] h-[700px] bg-background">
        <DrawerHeader title="Model" showBack onBack={goBack} />
        <DrawerPanelContent>
          <div className="p-4 space-y-6">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">
                Select Model
              </h3>
              <RadioGroup value={selected} onValueChange={setSelected}>
                {[
                  {
                    id: 'opus',
                    label: 'Claude Opus',
                    desc: 'Most capable, best for complex tasks',
                    badge: 'Recommended',
                    badgeClass:
                      'bg-violet-500/15 text-violet-400 border-violet-500/20',
                  },
                  {
                    id: 'sonnet',
                    label: 'Claude Sonnet',
                    desc: 'Fast and capable, great balance',
                  },
                  {
                    id: 'haiku',
                    label: 'Claude Haiku',
                    desc: 'Fastest responses, lightweight tasks',
                  },
                ].map((m) => (
                  <label
                    key={m.id}
                    className={`flex items-start gap-3 rounded-lg px-3 py-3 cursor-pointer transition-colors ${
                      selected === m.id ? 'bg-accent/50' : 'hover:bg-accent/30'
                    }`}
                  >
                    <RadioGroupItem value={m.id} className="mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{m.label}</span>
                        {m.badge && (
                          <Badge
                            variant="secondary"
                            className={`text-xs border ${m.badgeClass}`}
                          >
                            {m.badge}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {m.desc}
                      </p>
                    </div>
                  </label>
                ))}
              </RadioGroup>
            </div>
            <Separator />
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">Options</h3>
              <div className="flex items-center justify-between rounded-lg px-1 py-2">
                <div className="flex items-center gap-3">
                  <Zap className="size-4 text-amber-400" />
                  <div>
                    <span className="text-sm font-medium">Fast Mode</span>
                    <p className="text-xs text-muted-foreground">
                      Same model, faster output
                    </p>
                  </div>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between rounded-lg px-1 py-2">
                <div className="flex items-center gap-3">
                  <Sparkles className="size-4 text-cyan-400" />
                  <div>
                    <span className="text-sm font-medium">
                      Extended Thinking
                    </span>
                    <p className="text-xs text-muted-foreground">
                      Deeper reasoning for complex problems
                    </p>
                  </div>
                </div>
                <Switch defaultChecked />
              </div>
            </div>
          </div>
        </DrawerPanelContent>
      </DrawerPanel>
    );
  }

  /* ── Sub-view: Directory ────────────────────────────────────────────── */
  if (viewState.view === 'directory') {
    return (
      <DrawerPanel className="w-[400px] h-[700px] bg-background">
        <DrawerHeader title={viewState.name} showBack onBack={goBack} />
        <DrawerPanelContent>
          <div className="p-4 space-y-6">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">Path</h3>
              <div className="flex items-center gap-3 rounded-lg px-1 py-2">
                <Folder className="size-4 text-blue-400" />
                <span className="text-sm font-mono text-muted-foreground">
                  {viewState.name}
                </span>
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">Branch</h3>
              <Select defaultValue="main">
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="main">main</SelectItem>
                  <SelectItem value="develop">develop</SelectItem>
                  <SelectItem value="feature/drawer-ui">
                    feature/drawer-ui
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">
                Worktree
              </h3>
              <div className="flex items-center gap-2">
                <Checkbox id="wt" />
                <Label htmlFor="wt" className="text-sm">
                  Use isolated worktree
                </Label>
              </div>
              <p className="text-xs text-muted-foreground px-1">
                Creates an isolated copy so changes don&apos;t affect your
                working directory.
              </p>
            </div>
          </div>
        </DrawerPanelContent>
        <DrawerPanelFooter className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={goBack}>
            Cancel
          </Button>
          <Button size="sm" onClick={goBack}>
            Apply
          </Button>
        </DrawerPanelFooter>
      </DrawerPanel>
    );
  }

  /* ── Sub-view: Permissions ──────────────────────────────────────────── */
  if (viewState.view === 'permissions') {
    return (
      <DrawerPanel className="w-[400px] h-[700px] bg-background">
        <DrawerHeader
          title="Permissions"
          showBack
          onBack={goBack}
          actions={
            <Button
              variant="ghost"
              size="xs"
              className="text-muted-foreground"
            >
              <RotateCcw className="size-3" />
              Reset
            </Button>
          }
        />
        <DrawerPanelContent>
          <div className="p-4 space-y-6">
            <div className="rounded-lg border border-blue-500/25 bg-surface-info/30 p-3">
              <p className="text-xs text-muted-foreground">
                Override default tool permissions for this workstream. Unset
                permissions inherit from global defaults.
              </p>
            </div>
            {[
              {
                group: 'File System',
                icon: <Folder className="size-4 text-blue-400" />,
                tools: [
                  { name: 'Read files', state: 'allow' as const },
                  { name: 'Write files', state: 'ask' as const },
                  { name: 'List directories', state: 'allow' as const },
                ],
              },
              {
                group: 'Shell',
                icon: <Terminal className="size-4 text-cyan-400" />,
                tools: [
                  { name: 'Run commands', state: 'ask' as const },
                  { name: 'Background tasks', state: 'deny' as const },
                ],
              },
              {
                group: 'Network',
                icon: <Globe className="size-4 text-red-400" />,
                tools: [
                  { name: 'HTTP requests', state: 'ask' as const },
                  { name: 'WebSocket', state: 'deny' as const },
                ],
              },
            ].map((s) => (
              <div key={s.group} className="space-y-2">
                <div className="flex items-center gap-2">
                  {s.icon}
                  <h3 className="text-sm font-semibold text-foreground">
                    {s.group}
                  </h3>
                </div>
                <div className="space-y-1">
                  {s.tools.map((t) => (
                    <div
                      key={t.name}
                      className="flex items-center justify-between rounded-lg px-1 py-2"
                    >
                      <span className="text-sm font-medium">{t.name}</span>
                      <Badge
                        variant="secondary"
                        className={`text-xs border ${
                          t.state === 'allow'
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
                            : t.state === 'ask'
                              ? 'bg-amber-500/15 text-amber-400 border-amber-500/20'
                              : 'bg-red-500/15 text-red-400 border-red-500/20'
                        }`}
                      >
                        {t.state === 'allow' && <Check className="size-3" />}
                        {t.state === 'allow'
                          ? 'Allow'
                          : t.state === 'ask'
                            ? 'Ask'
                            : 'Deny'}
                      </Badge>
                    </div>
                  ))}
                </div>
                <Separator />
              </div>
            ))}
          </div>
        </DrawerPanelContent>
      </DrawerPanel>
    );
  }

  /* ── Sub-view: Tags ─────────────────────────────────────────────────── */
  if (viewState.view === 'tags') {
    return (
      <DrawerPanel className="w-[400px] h-[700px] bg-background">
        <DrawerHeader title="Tags" showBack onBack={goBack} />
        <DrawerPanelContent>
          <div className="p-4 space-y-6">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">
                Applied Tags
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {['UI', 'Design', 'Drawer'].map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="text-xs bg-cyan-500/15 text-cyan-400 border border-cyan-500/20 cursor-pointer"
                  >
                    {tag}
                    <X className="size-3 ml-0.5" />
                  </Badge>
                ))}
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">
                Available Tags
              </h3>
              {['Frontend', 'Backend', 'Infra', 'Testing', 'Docs'].map(
                (tag) => (
                  <button
                    key={tag}
                    className="flex w-full items-center justify-between rounded-lg px-1 py-2 text-left hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Tag className="size-3.5 text-muted-foreground" />
                      <span className="text-sm">{tag}</span>
                    </div>
                    <Plus className="size-3.5 text-muted-foreground" />
                  </button>
                )
              )}
            </div>
          </div>
        </DrawerPanelContent>
      </DrawerPanel>
    );
  }

  /* ── Main settings view ─────────────────────────────────────────────── */
  return (
    <DrawerPanel className="w-[400px] h-[700px] bg-background">
      <DrawerHeader title="Feature Sprint" onClose={() => {}} />
      <DrawerPanelContent>
        <div className="p-4 space-y-6">
          {/* Title + Status */}
          <div className="space-y-3">
            <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 text-xs">
              <span className="size-1.5 rounded-full bg-emerald-400" />
              Active
            </Badge>
            <div className="text-lg font-semibold text-foreground">
              Feature Sprint
            </div>
          </div>

          <Separator />

          {/* Model */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Model</h3>
            <button
              type="button"
              onClick={() => setViewState({ view: 'model' })}
              className="flex w-full items-center justify-between rounded-lg px-1 py-2 text-left hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Brain className="size-4 text-violet-400" />
                <span className="text-sm font-medium">Claude Opus</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className="bg-violet-500/15 text-violet-400 border border-violet-500/20 text-xs"
                >
                  Default
                </Badge>
                <ChevronRight className="size-3.5 text-muted-foreground" />
              </div>
            </button>
            <div className="flex items-center justify-between rounded-lg px-1 py-2">
              <div className="flex items-center gap-3">
                <Zap className="size-4 text-amber-400" />
                <div>
                  <span className="text-sm font-medium">Fast Mode</span>
                  <p className="text-xs text-muted-foreground">
                    Same model, faster output
                  </p>
                </div>
              </div>
              <Switch />
            </div>
          </div>

          <Separator />

          {/* Scope / Group */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Scope</h3>
            <Select defaultValue="ui">
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="ui">UI</SelectItem>
                <SelectItem value="backend">Backend</SelectItem>
                <SelectItem value="infra">Infrastructure</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Directories */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">
              Directories
            </h3>
            <div className="space-y-1">
              {[
                { name: '~/dev/vienna', branch: 'main', active: true },
                { name: '~/dev/registry', branch: 'main', active: false },
              ].map((d) => (
                <button
                  key={d.name}
                  type="button"
                  onClick={() =>
                    setViewState({ view: 'directory', name: d.name })
                  }
                  className="flex w-full items-center justify-between rounded-lg px-1 py-2 text-left hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Folder className="size-4 text-blue-400" />
                    <div>
                      <span className="text-sm font-medium">{d.name}</span>
                      <p className="text-xs text-muted-foreground">
                        {d.active ? 'Primary directory' : 'Plugins'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`font-mono text-xs ${d.active ? 'border-emerald-500/30 text-emerald-400' : ''}`}
                    >
                      {d.branch}
                    </Badge>
                    <ChevronRight className="size-3.5 text-muted-foreground" />
                  </div>
                </button>
              ))}
              <button className="flex w-full items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground hover:bg-accent/30 transition-colors">
                <Plus className="size-3.5" />
                Add directory
              </button>
            </div>
          </div>

          <Separator />

          {/* Tags */}
          <button
            type="button"
            onClick={() => setViewState({ view: 'tags' })}
            className="flex w-full items-center justify-between rounded-lg px-1 py-2 text-left hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Tag className="size-4 text-cyan-400" />
              <span className="text-sm font-medium">Tags</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {['UI', 'Design'].map((t) => (
                  <Badge
                    key={t}
                    variant="secondary"
                    className="text-xs bg-cyan-500/15 text-cyan-400 border border-cyan-500/20"
                  >
                    {t}
                  </Badge>
                ))}
              </div>
              <ChevronRight className="size-3.5 text-muted-foreground" />
            </div>
          </button>

          <Separator />

          {/* Permissions */}
          <button
            type="button"
            onClick={() => setViewState({ view: 'permissions' })}
            className="flex w-full items-center justify-between rounded-lg px-1 py-2 text-left hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Shield className="size-4 text-amber-400" />
              <div>
                <span className="text-sm font-medium">Permissions</span>
                <p className="text-xs text-muted-foreground">
                  Override tool permissions for this workstream
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-400">
                3
              </span>
              <ChevronRight className="size-3.5 text-muted-foreground" />
            </div>
          </button>

          <Separator />

          {/* Timeline metadata */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Timeline</h3>
            <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <span className="text-muted-foreground">Created</span>
              <span>Mar 26, 2026</span>
              <span className="text-muted-foreground">Updated</span>
              <span>Mar 29, 2026</span>
              <span className="text-muted-foreground">Last active</span>
              <span>2 hours ago</span>
            </div>
          </div>
        </div>
      </DrawerPanelContent>

      {/* Footer: Pin / Archive / Delete */}
      <DrawerPanelFooter className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-xs">
            <Pin className="size-4" />
          </Button>
          <Button variant="ghost" size="icon-xs">
            <Archive className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            className="text-error hover:text-error hover:bg-surface-error/30"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            Cancel
          </Button>
          <Button size="sm">Save</Button>
        </div>
      </DrawerPanelFooter>
    </DrawerPanel>
  );
}

export const SettingsForm: Story = {
  name: '1. Settings Form',
  render: () => <SettingsFormDrawer />,
};

/* ═══════════════════════════════════════════════════════════════════════════════
   PATTERN 2: Plugin Settings
   Credentials (API key + OAuth), filter selects, toggle groups, reset.
   ═══════════════════════════════════════════════════════════════════════════════ */

function PluginSettingsDrawer() {
  const [showApiKey, setShowApiKey] = React.useState(false);
  const [connected, setConnected] = React.useState(true);
  const [editingKey, setEditingKey] = React.useState(false);

  return (
    <DrawerPanel className="w-[400px] h-[700px] bg-background">
      <DrawerHeader title="Linear Settings" onClose={() => {}} />
      <DrawerPanelContent>
        <div className="p-4 space-y-6">
          {/* Authentication section */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">
              Authentication
            </h3>

            {/* API Key credential */}
            <div className="rounded-lg border border-border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <KeyRound className="size-4 text-muted-foreground" />
                  <span className="text-sm font-medium">API Key</span>
                </div>
                <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 text-xs">
                  <Check className="size-3" />
                  Set
                </Badge>
              </div>
              {editingKey ? (
                <div className="space-y-2">
                  <Input
                    type={showApiKey ? 'text' : 'password'}
                    defaultValue="lin_api_xxxxxxxxxxxxxxxxxxxx"
                    className="h-8 text-xs font-mono"
                  />
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      {showApiKey ? (
                        <EyeOff className="size-3" />
                      ) : (
                        <Eye className="size-3" />
                      )}
                      {showApiKey ? 'Hide' : 'Show'}
                    </button>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => setEditingKey(false)}
                      >
                        Cancel
                      </Button>
                      <Button size="xs" onClick={() => setEditingKey(false)}>
                        Save
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="xs"
                    className="text-muted-foreground"
                    onClick={() => setEditingKey(true)}
                  >
                    Update
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="text-error hover:text-error hover:bg-surface-error/30"
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              )}
            </div>

            {/* OAuth section */}
            <div className="rounded-lg border border-border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="size-4 text-muted-foreground" />
                  <span className="text-sm font-medium">OAuth</span>
                </div>
                {connected ? (
                  <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 text-xs">
                    <Check className="size-3" />
                    Connected
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="text-xs text-muted-foreground"
                  >
                    Not connected
                  </Badge>
                )}
              </div>
              {connected ? (
                <Button
                  variant="ghost"
                  size="xs"
                  className="text-muted-foreground"
                  onClick={() => setConnected(false)}
                >
                  <Unplug className="size-3" />
                  Disconnect
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConnected(true)}
                >
                  <ExternalLink className="size-3.5" />
                  Connect with Linear
                </Button>
              )}
            </div>
          </div>

          <Separator />

          {/* Filter sections */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Team</h3>
            <Select defaultValue="core">
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="core">Vienna Core</SelectItem>
                <SelectItem value="platform">Platform</SelectItem>
                <SelectItem value="growth">Growth</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">
              Assignment
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: 'All Issues', active: false },
                { label: 'Assigned to Me', active: true },
                { label: 'Created by Me', active: false },
              ].map((opt) => (
                <Badge
                  key={opt.label}
                  variant={opt.active ? 'secondary' : 'outline'}
                  className={`text-xs cursor-pointer ${opt.active ? 'bg-violet-500/15 text-violet-400 border border-violet-500/20' : 'text-muted-foreground'}`}
                >
                  {opt.active && <Check className="size-3" />}
                  {opt.label}
                </Badge>
              ))}
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">
              Status Types
            </h3>
            <div className="space-y-1">
              {[
                { label: 'Backlog', checked: false },
                { label: 'In Progress', checked: true },
                { label: 'Todo', checked: true },
                { label: 'Done', checked: false },
                { label: 'Cancelled', checked: false },
              ].map((s) => (
                <label
                  key={s.label}
                  className="flex items-center gap-2 rounded-lg px-1 py-1.5 hover:bg-accent/30 cursor-pointer"
                >
                  <Checkbox defaultChecked={s.checked} />
                  <span className="text-sm">{s.label}</span>
                </label>
              ))}
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">
              Group By
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {['None', 'Status', 'Priority', 'Label', 'Project'].map(
                (opt) => (
                  <Badge
                    key={opt}
                    variant={opt === 'Status' ? 'secondary' : 'outline'}
                    className={`text-xs cursor-pointer ${opt === 'Status' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20' : 'text-muted-foreground'}`}
                  >
                    {opt}
                  </Badge>
                )
              )}
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">
              Issue Limit
            </h3>
            <Select defaultValue="25">
              <SelectTrigger className="h-8 w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground"
          >
            <RotateCcw className="size-3" />
            Reset to Defaults
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Settings are saved automatically.
          </p>
        </div>
      </DrawerPanelContent>
    </DrawerPanel>
  );
}

export const PluginSettings: Story = {
  name: '2. Plugin Settings',
  render: () => <PluginSettingsDrawer />,
};

/* ═══════════════════════════════════════════════════════════════════════════════
   PATTERN 3: Entity Detail
   Rich metadata display, inline editing, status indicators, actions.
   ═══════════════════════════════════════════════════════════════════════════════ */

function EntityDetailDrawer() {
  const [editing, setEditing] = React.useState(false);
  const [title, setTitle] = React.useState('Improve drawer contrast and grouping');

  return (
    <DrawerPanel className="w-[400px] h-[700px] bg-background">
      <DrawerHeader title="VIE-342" onClose={() => {}} />
      <DrawerPanelContent>
        <div className="p-4 space-y-6">
          {/* Header: identifier + status */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-500/15 text-blue-400 border border-blue-500/25 text-xs font-mono">
                VIE-342
              </Badge>
              <Badge className="bg-amber-500/15 text-amber-400 border border-amber-500/25 text-xs">
                <CircleDot className="size-3" />
                In Progress
              </Badge>
            </div>

            {/* Editable title */}
            {editing ? (
              <div className="space-y-2">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-lg font-semibold"
                  autoFocus
                />
                <div className="flex gap-1">
                  <Button size="xs" onClick={() => setEditing(false)}>
                    Save
                  </Button>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => setEditing(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="text-lg font-semibold text-foreground text-left hover:text-foreground/80 transition-colors"
              >
                {title}
              </button>
            )}
          </div>

          <Separator />

          {/* Metadata grid */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Details</h3>
            <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <span className="text-muted-foreground flex items-center gap-1.5">
                Status
              </span>
              <Badge className="bg-amber-500/15 text-amber-400 border border-amber-500/25 text-xs w-fit">
                In Progress
              </Badge>

              <span className="text-muted-foreground">Priority</span>
              <Badge className="bg-red-500/15 text-red-400 border border-red-500/25 text-xs w-fit">
                Urgent
              </Badge>

              <span className="text-muted-foreground">Assignee</span>
              <div className="flex items-center gap-2">
                <Avatar size="sm">
                  <AvatarFallback className="text-xs bg-violet-500/20 text-violet-400">
                    WH
                  </AvatarFallback>
                </Avatar>
                <span>Will H.</span>
              </div>

              <span className="text-muted-foreground">Project</span>
              <span>Vienna Desktop</span>

              <span className="text-muted-foreground">Due</span>
              <span className="text-amber-400">Apr 2, 2026</span>

              <span className="text-muted-foreground">Estimate</span>
              <span>3 points</span>
            </div>
          </div>

          <Separator />

          {/* Labels */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Labels</h3>
            <div className="flex flex-wrap gap-1.5">
              <Badge
                variant="secondary"
                className="text-xs bg-cyan-500/15 text-cyan-400 border border-cyan-500/20"
              >
                <span className="size-1.5 rounded-full bg-cyan-400" />
                UI
              </Badge>
              <Badge
                variant="secondary"
                className="text-xs bg-violet-500/15 text-violet-400 border border-violet-500/20"
              >
                <span className="size-1.5 rounded-full bg-violet-400" />
                Design
              </Badge>
              <Badge
                variant="secondary"
                className="text-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
              >
                <span className="size-1.5 rounded-full bg-emerald-400" />
                Enhancement
              </Badge>
            </div>
          </div>

          <Separator />

          {/* Description */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">
              Description
            </h3>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                The drawer panels currently lack visual contrast between
                sections. Everything uses the same background color with thin
                separators, making it hard to scan.
              </p>
              <p>
                We should add semantic badges and better surface contrast to
                group related settings visually.
              </p>
            </div>
          </div>

          <Separator />

          {/* Comments */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">
              Comments
              <span className="ml-1.5 text-muted-foreground font-normal">
                2
              </span>
            </h3>
            {[
              {
                author: 'WH',
                name: 'Will',
                time: '2h ago',
                text: 'Started on the storybook compositions.',
                color: 'bg-violet-500/20 text-violet-400',
              },
              {
                author: 'CL',
                name: 'Claude',
                time: '1h ago',
                text: 'Created 4 variations with enhanced contrast patterns.',
                color: 'bg-cyan-500/20 text-cyan-400',
              },
            ].map((c, i) => (
              <div key={i} className="flex gap-3">
                <Avatar size="sm">
                  <AvatarFallback className={`text-xs ${c.color}`}>
                    {c.author}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{c.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {c.time}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {c.text}
                  </p>
                </div>
              </div>
            ))}

            {/* Add comment */}
            <div className="flex gap-2">
              <Textarea
                placeholder="Add a comment..."
                className="min-h-16 text-sm flex-1"
              />
            </div>
            <div className="flex justify-end">
              <Button size="sm">
                <Send className="size-3" />
                Comment
              </Button>
            </div>
          </div>
        </div>
      </DrawerPanelContent>

      <DrawerPanelFooter className="flex items-center justify-between gap-2">
        <Button variant="outline" size="sm">
          <ExternalLink className="size-3.5" />
          Open in Linear
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-error hover:text-error hover:bg-surface-error/30"
        >
          <Trash2 className="size-3.5" />
          Delete
        </Button>
      </DrawerPanelFooter>
    </DrawerPanel>
  );
}

export const EntityDetail: Story = {
  name: '3. Entity Detail',
  render: () => <EntityDetailDrawer />,
};

/* ═══════════════════════════════════════════════════════════════════════════════
   PATTERN 4: List / Browse
   Navigable item list — plugin store, help docs, skill browser.
   ═══════════════════════════════════════════════════════════════════════════════ */

type BrowseView = { view: 'list' } | { view: 'detail'; id: string };

const PLUGINS = [
  {
    id: 'linear',
    name: 'Linear',
    desc: 'Issue tracking and project management',
    icon: '🔺',
    installed: true,
    color: 'bg-violet-500/15',
  },
  {
    id: 'github',
    name: 'GitHub',
    desc: 'Pull requests, issues, and code review',
    icon: '🐙',
    installed: true,
    color: 'bg-gray-500/15',
  },
  {
    id: 'weather',
    name: 'Weather',
    desc: 'Current conditions and forecasts',
    icon: '🌤',
    installed: true,
    color: 'bg-blue-500/15',
  },
  {
    id: 'sentry',
    name: 'Sentry',
    desc: 'Error tracking and performance monitoring',
    icon: '🔍',
    installed: false,
    color: 'bg-red-500/15',
  },
  {
    id: 'slack',
    name: 'Slack',
    desc: 'Team messaging and notifications',
    icon: '💬',
    installed: false,
    color: 'bg-emerald-500/15',
  },
];

function ListBrowseDrawer() {
  const [viewState, setViewState] = React.useState<BrowseView>({
    view: 'list',
  });
  const [search, setSearch] = React.useState('');

  if (viewState.view === 'detail') {
    const plugin = PLUGINS.find((p) => p.id === viewState.id)!;
    return (
      <DrawerPanel className="w-[400px] h-[700px] bg-background">
        <DrawerHeader
          title={plugin.name}
          showBack
          onBack={() => setViewState({ view: 'list' })}
        />
        <DrawerPanelContent>
          <div className="p-4 space-y-6">
            {/* Plugin header */}
            <div className="flex items-center gap-4">
              <div
                className={`size-12 rounded-xl ${plugin.color} flex items-center justify-center text-2xl`}
              >
                {plugin.icon}
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold">{plugin.name}</h2>
                <p className="text-xs text-muted-foreground">{plugin.desc}</p>
              </div>
            </div>

            <div className="flex gap-2">
              {plugin.installed ? (
                <>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Settings className="size-3.5" />
                    Configure
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-error hover:text-error hover:bg-surface-error/30"
                  >
                    Uninstall
                  </Button>
                </>
              ) : (
                <Button size="sm" className="flex-1">
                  <Download className="size-3.5" />
                  Install
                </Button>
              )}
            </div>

            <Separator />

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">About</h3>
              <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                <span className="text-muted-foreground">Version</span>
                <span>1.2.0</span>
                <span className="text-muted-foreground">Author</span>
                <span>Vienna Team</span>
                <span className="text-muted-foreground">Updated</span>
                <span>Mar 25, 2026</span>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">
                Capabilities
              </h3>
              <div className="space-y-1">
                {['Nav sidebar section', 'Entity drawers', 'Menu bar widget'].map(
                  (cap) => (
                    <div
                      key={cap}
                      className="flex items-center gap-2 rounded-lg px-1 py-1.5"
                    >
                      <CheckCircle className="size-3.5 text-emerald-400" />
                      <span className="text-sm">{cap}</span>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </DrawerPanelContent>
      </DrawerPanel>
    );
  }

  const filtered = PLUGINS.filter(
    (p) =>
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.desc.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DrawerPanel className="w-[400px] h-[700px] bg-background">
      <DrawerHeader title="Plugin Store" onClose={() => {}} />
      <DrawerPanelContent>
        <div className="p-4 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search plugins..."
              className="h-8 pl-8 text-sm"
            />
          </div>

          {/* Installed section */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">
              Installed
            </h3>
            <div className="space-y-1">
              {filtered
                .filter((p) => p.installed)
                .map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() =>
                      setViewState({ view: 'detail', id: p.id })
                    }
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left hover:bg-accent/50 transition-colors"
                  >
                    <div
                      className={`size-8 rounded-lg ${p.color} flex items-center justify-center text-base`}
                    >
                      {p.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium">{p.name}</span>
                      <p className="text-xs text-muted-foreground truncate">
                        {p.desc}
                      </p>
                    </div>
                    <ChevronRight className="size-3.5 text-muted-foreground shrink-0" />
                  </button>
                ))}
            </div>
          </div>

          <Separator />

          {/* Available section */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">
              Available
            </h3>
            <div className="space-y-1">
              {filtered
                .filter((p) => !p.installed)
                .map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() =>
                      setViewState({ view: 'detail', id: p.id })
                    }
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left hover:bg-accent/50 transition-colors"
                  >
                    <div
                      className={`size-8 rounded-lg ${p.color} flex items-center justify-center text-base`}
                    >
                      {p.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium">{p.name}</span>
                      <p className="text-xs text-muted-foreground truncate">
                        {p.desc}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="xs"
                      className="shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Install
                    </Button>
                  </button>
                ))}
            </div>
          </div>
        </div>
      </DrawerPanelContent>
    </DrawerPanel>
  );
}

export const ListBrowse: Story = {
  name: '4. List / Browse',
  render: () => <ListBrowseDrawer />,
};

/* ═══════════════════════════════════════════════════════════════════════════════
   PATTERN 5: Review / Approval
   File change review with per-item approve/deny and diff display.
   ═══════════════════════════════════════════════════════════════════════════════ */

const FILE_CHANGES = [
  {
    file: 'drawer-layout.tsx',
    dir: 'packages/ui/src/components',
    status: 'M' as const,
    additions: 12,
    deletions: 3,
  },
  {
    file: 'content-section.tsx',
    dir: 'packages/ui/src/components',
    status: 'M' as const,
    additions: 8,
    deletions: 2,
  },
  {
    file: 'drawer-compositions.stories.tsx',
    dir: 'packages/ui/src/components',
    status: 'A' as const,
    additions: 450,
    deletions: 0,
  },
  {
    file: 'primitives.tsx',
    dir: 'apps/desktop/src/lib/drawer',
    status: 'M' as const,
    additions: 5,
    deletions: 5,
  },
  {
    file: 'old-drawer.tsx',
    dir: 'apps/desktop/src/lib/drawer',
    status: 'D' as const,
    additions: 0,
    deletions: 120,
  },
];

function ReviewDrawer() {
  const [decisions, setDecisions] = React.useState<
    Record<string, 'approved' | 'denied' | null>
  >({});
  const [expanded, setExpanded] = React.useState<string | null>(null);

  const setDecision = (file: string, decision: 'approved' | 'denied') => {
    setDecisions((prev) => ({
      ...prev,
      [file]: prev[file] === decision ? null : decision,
    }));
  };

  const statusConfig = {
    M: {
      label: 'Modified',
      icon: <FileEdit className="size-3" />,
      class: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    },
    A: {
      label: 'Added',
      icon: <FilePlus className="size-3" />,
      class: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    },
    D: {
      label: 'Deleted',
      icon: <FileMinus className="size-3" />,
      class: 'bg-red-500/15 text-red-400 border-red-500/20',
    },
  };

  const approvedCount = Object.values(decisions).filter(
    (d) => d === 'approved'
  ).length;
  const deniedCount = Object.values(decisions).filter(
    (d) => d === 'denied'
  ).length;

  return (
    <DrawerPanel className="w-[400px] h-[700px] bg-background">
      <DrawerHeader
        title="File Changes"
        onClose={() => {}}
        actions={
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="xs"
              className="text-emerald-400"
              onClick={() => {
                const all: Record<string, 'approved'> = {};
                FILE_CHANGES.forEach((f) => {
                  all[f.file] = 'approved';
                });
                setDecisions(all);
              }}
            >
              <Check className="size-3" />
              All
            </Button>
            <Button
              variant="ghost"
              size="xs"
              className="text-red-400"
              onClick={() => {
                const all: Record<string, 'denied'> = {};
                FILE_CHANGES.forEach((f) => {
                  all[f.file] = 'denied';
                });
                setDecisions(all);
              }}
            >
              <X className="size-3" />
              All
            </Button>
          </div>
        }
      />
      <DrawerPanelContent>
        <div className="divide-y divide-border">
          {/* Group by directory */}
          {Object.entries(
            FILE_CHANGES.reduce(
              (acc, f) => {
                (acc[f.dir] ??= []).push(f);
                return acc;
              },
              {} as Record<string, typeof FILE_CHANGES>
            )
          ).map(([dir, files]) => (
            <div key={dir}>
              {/* Directory header */}
              <div className="px-4 py-1.5 bg-surface-interactive/30 sticky top-0">
                <span className="text-xs font-mono text-muted-foreground">
                  {dir}
                </span>
              </div>
              {/* File items */}
              {files.map((f) => {
                const cfg = statusConfig[f.status];
                const decision = decisions[f.file] ?? null;
                const isExpanded = expanded === f.file;

                return (
                  <div key={f.file}>
                    <div className="px-4 py-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setExpanded(isExpanded ? null : f.file)
                        }
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <ChevronRight
                          className={`size-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                        />
                      </button>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] border px-1 py-0 ${cfg.class}`}
                      >
                        {f.status}
                      </Badge>
                      <button
                        type="button"
                        onClick={() =>
                          setExpanded(isExpanded ? null : f.file)
                        }
                        className="flex-1 text-left text-sm font-medium truncate hover:text-foreground/80"
                      >
                        {f.file}
                      </button>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {f.additions > 0 && (
                          <span className="text-emerald-400">
                            +{f.additions}
                          </span>
                        )}
                        {f.additions > 0 && f.deletions > 0 && ' '}
                        {f.deletions > 0 && (
                          <span className="text-red-400">-{f.deletions}</span>
                        )}
                      </span>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => setDecision(f.file, 'approved')}
                          className={`inline-flex items-center justify-center size-6 rounded-md transition-colors ${
                            decision === 'approved'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                          }`}
                        >
                          <Check className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDecision(f.file, 'denied')}
                          className={`inline-flex items-center justify-center size-6 rounded-md transition-colors ${
                            decision === 'denied'
                              ? 'bg-red-500/20 text-red-400'
                              : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                          }`}
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    </div>
                    {/* Expanded diff placeholder */}
                    {isExpanded && (
                      <div className="mx-4 mb-2 rounded-md bg-surface-sunken border border-border p-3 font-mono text-xs">
                        <div className="text-emerald-400">
                          + export function DrawerPanel ...
                        </div>
                        <div className="text-emerald-400">
                          + className=&quot;border rounded-lg&quot;
                        </div>
                        <div className="text-red-400">
                          - className=&quot;border&quot;
                        </div>
                        <div className="text-muted-foreground">
                          &nbsp; // unchanged line
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </DrawerPanelContent>

      <DrawerPanelFooter className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {approvedCount > 0 && (
            <span className="text-emerald-400">
              {approvedCount} approved
            </span>
          )}
          {deniedCount > 0 && (
            <span className="text-red-400">{deniedCount} denied</span>
          )}
          {approvedCount === 0 && deniedCount === 0 && (
            <span>No decisions yet</span>
          )}
        </div>
        <Button size="sm" disabled={approvedCount + deniedCount === 0}>
          Submit Review
        </Button>
      </DrawerPanelFooter>
    </DrawerPanel>
  );
}

export const ReviewApproval: Story = {
  name: '5. Review / Approval',
  render: () => <ReviewDrawer />,
};

/* ═══════════════════════════════════════════════════════════════════════════════
   PATTERN 6: Simple Form
   Feedback form — textarea + optional fields, phased submission.
   ═══════════════════════════════════════════════════════════════════════════════ */

function SimpleFormDrawer() {
  const [phase, setPhase] = React.useState<
    'form' | 'submitting' | 'success' | 'error'
  >('form');
  const [message, setMessage] = React.useState('');
  const [name, setName] = React.useState('');

  if (phase === 'success') {
    return (
      <DrawerPanel className="w-[400px] h-[700px] bg-background">
        <DrawerHeader title="Feedback" onClose={() => {}} />
        <DrawerPanelContent>
          <div className="p-4 flex flex-col items-center justify-center h-full text-center gap-4">
            <div className="size-12 rounded-full bg-emerald-500/15 flex items-center justify-center">
              <CheckCircle className="size-6 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                Thank you!
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Your feedback has been submitted successfully.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPhase('form');
                  setMessage('');
                }}
              >
                Submit More
              </Button>
            </div>
          </div>
        </DrawerPanelContent>
      </DrawerPanel>
    );
  }

  if (phase === 'error') {
    return (
      <DrawerPanel className="w-[400px] h-[700px] bg-background">
        <DrawerHeader title="Feedback" onClose={() => {}} />
        <DrawerPanelContent>
          <div className="p-4 space-y-4">
            <div className="rounded-lg border border-red-500/25 bg-surface-error/30 p-3 flex items-start gap-3">
              <AlertCircle className="size-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Submission failed
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Please check your connection and try again.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPhase('form')}
            >
              Try Again
            </Button>
          </div>
        </DrawerPanelContent>
      </DrawerPanel>
    );
  }

  return (
    <DrawerPanel className="w-[400px] h-[700px] bg-background">
      <DrawerHeader title="Feedback" onClose={() => {}} />
      <DrawerPanelContent>
        <div className="p-4 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="fb-name" className="text-sm font-semibold">
              Name
              <span className="text-muted-foreground font-normal ml-1">
                (optional)
              </span>
            </Label>
            <Input
              id="fb-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="h-8"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="fb-message" className="text-sm font-semibold">
                Feedback
              </Label>
              <span className="text-xs text-muted-foreground">
                {message.length}/5000
              </span>
            </div>
            <Textarea
              id="fb-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us what you think..."
              className="min-h-40 text-sm"
              maxLength={5000}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Press{' '}
            <kbd className="px-1 py-0.5 rounded border border-border bg-surface-interactive text-[10px]">
              Cmd+Enter
            </kbd>{' '}
            to submit
          </p>
        </div>
      </DrawerPanelContent>

      <DrawerPanelFooter className="flex items-center justify-end gap-2">
        <Button
          size="sm"
          disabled={!message.trim() || phase === 'submitting'}
          onClick={() => {
            setPhase('submitting');
            setTimeout(() => setPhase('success'), 1000);
          }}
        >
          {phase === 'submitting' ? (
            <>
              <span className="size-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="size-3" />
              Submit Feedback
            </>
          )}
        </Button>
      </DrawerPanelFooter>
    </DrawerPanel>
  );
}

export const SimpleForm: Story = {
  name: '6. Simple Form',
  render: () => <SimpleFormDrawer />,
};

/* ═══════════════════════════════════════════════════════════════════════════════
   PATTERN 7: Help / Documentation
   Markdown content browser with navigation stack and related links.
   ═══════════════════════════════════════════════════════════════════════════════ */

type HelpView = { view: 'list' } | { view: 'doc'; id: string };

const HELP_DOCS = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: <Sparkles className="size-4 text-violet-400" />,
    summary: 'Set up your first workstream and start building.',
  },
  {
    id: 'permissions',
    title: 'Understanding Permissions',
    icon: <Shield className="size-4 text-amber-400" />,
    summary: 'How tool permissions work at global, group, and workstream levels.',
  },
  {
    id: 'plugins',
    title: 'Using Plugins',
    icon: <Package className="size-4 text-blue-400" />,
    summary: 'Install and configure plugins to extend Vienna.',
  },
  {
    id: 'shortcuts',
    title: 'Keyboard Shortcuts',
    icon: <Hash className="size-4 text-cyan-400" />,
    summary: 'Master the keyboard for faster navigation.',
  },
];

function HelpDrawer() {
  const [viewState, setViewState] = React.useState<HelpView>({
    view: 'list',
  });

  if (viewState.view === 'doc') {
    const doc = HELP_DOCS.find((d) => d.id === viewState.id)!;
    const related = HELP_DOCS.filter((d) => d.id !== viewState.id).slice(0, 2);

    return (
      <DrawerPanel className="w-[400px] h-[700px] bg-background">
        <DrawerHeader
          title={doc.title}
          showBack
          onBack={() => setViewState({ view: 'list' })}
        />
        <DrawerPanelContent>
          <div className="p-4 space-y-6">
            {/* Article content */}
            <div className="text-sm text-foreground/90 space-y-4">
              <p>
                This is a documentation article about{' '}
                <strong>{doc.title.toLowerCase()}</strong>. In the real app, this
                renders full Markdown with syntax-highlighted code blocks, headings,
                lists, and links.
              </p>
              <p className="text-muted-foreground">
                {doc.summary}
              </p>
              <div className="rounded-md bg-surface-sunken border border-border p-3 font-mono text-xs">
                <span className="text-violet-400">const</span>{' '}
                <span className="text-blue-400">workstream</span> ={' '}
                <span className="text-amber-400">await</span>{' '}
                createWorkstream(&#123; title: &quot;My Project&quot; &#125;);
              </div>
              <p className="text-muted-foreground">
                For more detailed information, see the related articles below.
              </p>
            </div>

            <Separator />

            {/* Related articles */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">
                Related
              </h3>
              <div className="grid gap-2">
                {related.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() =>
                      setViewState({ view: 'doc', id: r.id })
                    }
                    className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-left hover:bg-accent/50 transition-colors"
                  >
                    {r.icon}
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium">{r.title}</span>
                      <p className="text-xs text-muted-foreground truncate">
                        {r.summary}
                      </p>
                    </div>
                    <ChevronRight className="size-3.5 text-muted-foreground shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </DrawerPanelContent>
      </DrawerPanel>
    );
  }

  return (
    <DrawerPanel className="w-[400px] h-[700px] bg-background">
      <DrawerHeader title="Help" onClose={() => {}} />
      <DrawerPanelContent>
        <div className="p-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Search documentation..."
              className="h-8 pl-8 text-sm"
            />
          </div>

          <div className="space-y-1">
            {HELP_DOCS.map((doc) => (
              <button
                key={doc.id}
                type="button"
                onClick={() => setViewState({ view: 'doc', id: doc.id })}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-3 text-left hover:bg-accent/50 transition-colors"
              >
                <div className="size-8 rounded-lg bg-surface-interactive/50 flex items-center justify-center shrink-0">
                  {doc.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium">{doc.title}</span>
                  <p className="text-xs text-muted-foreground truncate">
                    {doc.summary}
                  </p>
                </div>
                <ChevronRight className="size-3.5 text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>
        </div>
      </DrawerPanelContent>
    </DrawerPanel>
  );
}

export const HelpDocs: Story = {
  name: '7. Help / Documentation',
  render: () => <HelpDrawer />,
};
