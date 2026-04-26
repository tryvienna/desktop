import { Switch } from '@tryvienna/ui';
import { SettingsRow } from '../../settings/SettingsRow';
import { CollapsibleSection } from './CollapsibleSection';
import { StringArrayEditor } from './StringArrayEditor';
import { deepGet } from './useClaudeSettingsFile';
import type { SectionProps } from './types';
import { matchesFilter } from './types';

export function SandboxSection({ settings, updateField, deleteField, filter }: SectionProps) {
  const sandbox = (deepGet(settings, ['sandbox']) ?? {}) as Record<string, unknown>;
  const enabled = sandbox.enabled === true;
  const autoAllow = sandbox.autoAllowBashIfSandboxed === true;
  const allowUnsandboxed = sandbox.allowUnsandboxedCommands === true;
  const excludedCommands = (sandbox.excludedCommands as string[]) ?? [];

  const fs = (sandbox.filesystem ?? {}) as Record<string, unknown>;
  const fsAllowWrite = (fs.allowWrite as string[]) ?? [];
  const fsDenyWrite = (fs.denyWrite as string[]) ?? [];
  const fsDenyRead = (fs.denyRead as string[]) ?? [];
  const fsAllowRead = (fs.allowRead as string[]) ?? [];

  const net = (sandbox.network ?? {}) as Record<string, unknown>;
  const allowedDomains = (net.allowedDomains as string[]) ?? [];
  const allowAllUnixSockets = net.allowAllUnixSockets === true;
  const allowLocalBinding = net.allowLocalBinding === true;

  const updateSandbox = (path: string[], value: unknown) => {
    updateField(['sandbox', ...path], value);
  };

  const updateFsArray = (key: string, value: string[]) => {
    if (value.length === 0) {
      const { [key]: _, ...rest } = fs;
      if (Object.keys(rest).length === 0) {
        const { filesystem: _fs, ...srest } = sandbox;
        updateField(['sandbox'], srest);
      } else {
        updateField(['sandbox', 'filesystem'], rest);
      }
    } else {
      updateField(['sandbox', 'filesystem', key], value);
    }
  };

  const updateNetArray = (key: string, value: string[]) => {
    if (value.length === 0) {
      const { [key]: _, ...rest } = net;
      if (Object.keys(rest).length === 0) {
        const { network: _n, ...srest } = sandbox;
        updateField(['sandbox'], srest);
      } else {
        updateField(['sandbox', 'network'], rest);
      }
    } else {
      updateField(['sandbox', 'network', key], value);
    }
  };

  const sectionMatch = matchesFilter(filter, 'Sandbox', 'sandboxing', 'bash sandbox', 'filesystem', 'network', 'unix socket', 'domains', 'excluded commands');
  if (!sectionMatch) return null;

  return (
    <CollapsibleSection title="Sandbox" defaultOpen={false} forceOpen={filter ? true : undefined}>
      <SettingsRow label="Enable Sandbox" description="Enable bash sandboxing (macOS, Linux, WSL2)">
        <Switch
          checked={enabled}
          onCheckedChange={(v) => {
            if (!v && Object.keys(sandbox).length <= 1) deleteField(['sandbox']);
            else updateSandbox(['enabled'], v);
          }}
        />
      </SettingsRow>

      {enabled && (
        <>
          <SettingsRow label="Auto-allow Bash" description="Auto-approve bash commands when sandboxed">
            <Switch checked={autoAllow} onCheckedChange={(v) => updateSandbox(['autoAllowBashIfSandboxed'], v)} />
          </SettingsRow>

          <SettingsRow label="Allow Unsandboxed" description="Allow dangerouslyDisableSandbox escape hatch">
            <Switch checked={allowUnsandboxed} onCheckedChange={(v) => updateSandbox(['allowUnsandboxedCommands'], v)} />
          </SettingsRow>

          <div className="grid gap-1">
            <p className="text-sm font-medium">Excluded Commands</p>
            <p className="text-xs text-muted-foreground">Commands that run outside the sandbox</p>
            <StringArrayEditor
              value={excludedCommands}
              onChange={(v) => {
                if (v.length === 0) {
                  const { excludedCommands: _, ...rest } = sandbox;
                  updateField(['sandbox'], rest);
                } else {
                  updateSandbox(['excludedCommands'], v);
                }
              }}
              placeholder="e.g. docker"
            />
          </div>

          <p className="text-xs font-medium text-muted-foreground">Filesystem</p>

          <div className="grid gap-1">
            <p className="text-sm font-medium">Allow Write</p>
            <StringArrayEditor value={fsAllowWrite} onChange={(v) => updateFsArray('allowWrite', v)} placeholder="/path" />
          </div>

          <div className="grid gap-1">
            <p className="text-sm font-medium">Deny Write</p>
            <StringArrayEditor value={fsDenyWrite} onChange={(v) => updateFsArray('denyWrite', v)} placeholder="/path" />
          </div>

          <div className="grid gap-1">
            <p className="text-sm font-medium">Deny Read</p>
            <StringArrayEditor value={fsDenyRead} onChange={(v) => updateFsArray('denyRead', v)} placeholder="/path" />
          </div>

          <div className="grid gap-1">
            <p className="text-sm font-medium">Allow Read</p>
            <StringArrayEditor value={fsAllowRead} onChange={(v) => updateFsArray('allowRead', v)} placeholder="/path" />
          </div>

          <p className="text-xs font-medium text-muted-foreground">Network</p>

          <div className="grid gap-1">
            <p className="text-sm font-medium">Allowed Domains</p>
            <StringArrayEditor value={allowedDomains} onChange={(v) => updateNetArray('allowedDomains', v)} placeholder="*.example.com" />
          </div>

          <SettingsRow label="All Unix Sockets" description="Allow all Unix socket connections">
            <Switch checked={allowAllUnixSockets} onCheckedChange={(v) => updateField(['sandbox', 'network', 'allowAllUnixSockets'], v)} />
          </SettingsRow>

          <SettingsRow label="Local Binding" description="Allow binding to localhost ports (macOS)">
            <Switch checked={allowLocalBinding} onCheckedChange={(v) => updateField(['sandbox', 'network', 'allowLocalBinding'], v)} />
          </SettingsRow>
        </>
      )}
    </CollapsibleSection>
  );
}
