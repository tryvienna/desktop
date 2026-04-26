/**
 * IntegrationSettingsDrawer — Credential management UI for plugin integrations.
 *
 * Opened when a user clicks "Settings" in a plugin's nav section.
 * Shows each integration declared by the plugin with its credentials,
 * separating OAuth credentials from API keys/tokens.
 *
 * @ai-context
 * - Credentials fetched via getCredentialStatus IPC
 * - Set/remove via setCredential/removeCredential IPC
 * - OAuth credentials (matching `oauth_client_id|secret`) shown separately
 * - Regular tokens (e.g. personal_access_token) shown as API key section
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { KeyRound, Check, X, Eye, EyeOff, Trash2, Shield } from 'lucide-react';
import { Button, Input, Label } from '@tryvienna/ui';
import { getApi } from '@vienna/ipc/renderer';
import { api } from '../../../ipc';
import type { PluginInfo } from '../../../ipc/plugin/contract';
import { useLoadedPlugins } from '../../../renderer/hooks/useLoadedPlugins';
import type { DrawerContentDescriptor } from '../../../lib/drawer';
import { getPluginDrawerInfo } from '../content';

// ─────────────────────────────────────────────────────────────────────────────
// Human-readable credential labels
// ─────────────────────────────────────────────────────────────────────────────

const CREDENTIAL_LABELS: Record<string, string> = {
  personal_access_token: 'Personal Access Token',
  github_oauth_client_id: 'OAuth Client ID',
  github_oauth_client_secret: 'OAuth Client Secret',
  linear_oauth_client_id: 'OAuth Client ID',
  linear_oauth_client_secret: 'OAuth Client Secret',
  api_key: 'API Key',
  api_token: 'API Token',
};

/** Pattern to identify OAuth credentials (shown in a separate section). */
const OAUTH_CREDENTIAL_PATTERN = /oauth_client_(id|secret)$/;

function getCredentialLabel(key: string): string {
  if (CREDENTIAL_LABELS[key]) return CREDENTIAL_LABELS[key];
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function isSecretField(key: string): boolean {
  return key.includes('secret') || key.includes('token') || key.includes('key');
}

// ─────────────────────────────────────────────────────────────────────────────
// CredentialField — Individual credential input with set/remove
// ─────────────────────────────────────────────────────────────────────────────

interface CredentialFieldProps {
  integrationId: string;
  credentialKey: string;
  isSet: boolean;
  onUpdate: () => void;
}

function CredentialField({ integrationId, credentialKey, isSet, onUpdate }: CredentialFieldProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [showValue, setShowValue] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    if (!value.trim()) return;
    setSaving(true);
    try {
      const ipc = getApi(api);
      await ipc.plugin.setCredential({ integrationId, key: credentialKey, value: value.trim() });
      setValue('');
      setEditing(false);
      onUpdate();
    } finally {
      setSaving(false);
    }
  }, [integrationId, credentialKey, value, onUpdate]);

  const handleRemove = useCallback(async () => {
    setSaving(true);
    try {
      const ipc = getApi(api);
      await ipc.plugin.removeCredential({ integrationId, key: credentialKey });
      onUpdate();
    } finally {
      setSaving(false);
    }
  }, [integrationId, credentialKey, onUpdate]);

  const handleCancel = useCallback(() => {
    setEditing(false);
    setValue('');
  }, []);

  const displayName = getCredentialLabel(credentialKey);
  const usePasswordInput = isSecretField(credentialKey);

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <KeyRound size={14} className="text-muted-foreground" />
          <Label className="text-xs font-medium">{displayName}</Label>
        </div>
        <div className="flex items-center gap-1">
          {isSet && !editing && (
            <>
              <span className="flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-600 dark:text-green-400">
                <Check size={10} />
                Set
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setEditing(true)}
              >
                <Eye size={12} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-destructive"
                onClick={handleRemove}
                disabled={saving}
              >
                <Trash2 size={12} />
              </Button>
            </>
          )}
          {!isSet && !editing && (
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-xs"
              onClick={() => setEditing(true)}
            >
              Configure
            </Button>
          )}
        </div>
      </div>

      {editing && (
        <div className="mt-2 flex items-center gap-2">
          <div className="relative flex-1">
            <Input
              type={usePasswordInput && !showValue ? 'password' : 'text'}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={isSet ? 'Enter new value to replace' : `Enter ${displayName.toLowerCase()}`}
              className="h-7 pr-8 text-xs"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') handleCancel();
              }}
            />
            {usePasswordInput && (
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowValue(!showValue)}
              >
                {showValue ? <EyeOff size={12} /> : <Eye size={12} />}
              </button>
            )}
          </div>
          <Button
            variant="default"
            size="sm"
            className="h-7 text-xs"
            onClick={handleSave}
            disabled={!value.trim() || saving}
          >
            Save
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={handleCancel}
          >
            <X size={14} />
          </Button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// IntegrationCard — All credentials for one integration
// ─────────────────────────────────────────────────────────────────────────────

interface IntegrationCardProps {
  integrationId: string;
  integrationName: string;
  description?: string;
}

function IntegrationCard({ integrationId, integrationName, description }: IntegrationCardProps) {
  const [credentialStatus, setCredentialStatus] = useState<Array<{ key: string; isSet: boolean }>>([]);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const ipc = getApi(api);
      const { keys } = await ipc.plugin.getCredentialStatus({ integrationId });
      setCredentialStatus(keys);
    } catch {
      // Handler may not be configured
    } finally {
      setLoading(false);
    }
  }, [integrationId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Separate OAuth credentials from API keys/tokens
  const oauthCredentials = useMemo(
    () => credentialStatus.filter((k) => OAUTH_CREDENTIAL_PATTERN.test(k.key)),
    [credentialStatus],
  );

  const apiCredentials = useMemo(
    () => credentialStatus.filter((k) => !OAUTH_CREDENTIAL_PATTERN.test(k.key)),
    [credentialStatus],
  );

  const configuredCount = credentialStatus.filter((k) => k.isSet).length;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium">{integrationName}</h3>
        {description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        )}
        {!loading && credentialStatus.length > 0 && (
          <p className="mt-1 text-xs text-muted-foreground">
            {configuredCount} of {credentialStatus.length} credentials configured
          </p>
        )}
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground">Loading credentials...</p>
      ) : credentialStatus.length === 0 ? (
        <p className="text-xs text-muted-foreground">No credentials required.</p>
      ) : (
        <div className="space-y-4">
          {/* API Keys / Tokens Section */}
          {apiCredentials.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <KeyRound size={12} className="text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">API Authentication</span>
              </div>
              {apiCredentials.map(({ key, isSet }) => (
                <CredentialField
                  key={key}
                  integrationId={integrationId}
                  credentialKey={key}
                  isSet={isSet}
                  onUpdate={fetchStatus}
                />
              ))}
            </div>
          )}

          {/* OAuth Section */}
          {oauthCredentials.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Shield size={12} className="text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">OAuth Configuration</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Create an OAuth app on GitHub and enter your credentials below to enable OAuth login.
              </p>
              {oauthCredentials.map(({ key, isSet }) => (
                <CredentialField
                  key={key}
                  integrationId={integrationId}
                  credentialKey={key}
                  isSet={isSet}
                  onUpdate={fetchStatus}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// IntegrationSettingsDrawer — Top-level drawer component
// ─────────────────────────────────────────────────────────────────────────────

export function IntegrationSettingsDrawer({ content }: { content: DrawerContentDescriptor }) {
  const info = getPluginDrawerInfo(content);
  const { plugins } = useLoadedPlugins();

  if (!info) return null;

  const plugin: PluginInfo | undefined = plugins.find((p) => p.id === info.pluginId);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold">{plugin?.name ?? info.pluginId} Settings</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Configure integration credentials and connections.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {!plugin ? (
          <p className="text-xs text-muted-foreground">Plugin not found.</p>
        ) : plugin.integrations.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            This plugin has no integrations to configure.
          </p>
        ) : (
          <div className="space-y-6">
            {plugin.integrations.map((integration) => (
              <IntegrationCard
                key={integration.id}
                integrationId={integration.id}
                integrationName={integration.name}
                description={integration.description}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
