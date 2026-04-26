/**
 * EntityDebugPage — Dev tool to preview all registered UI overrides for an entity.
 *
 * Renders the entity's registered card, feedCard, drawer, and workstreamWidget
 * components in isolated preview sections. Uses real entity resolution via GraphQL.
 *
 * The URI is editable: "Preview" re-renders widgets with the draft URI,
 * "Save" persists the change back to the entity tool store.
 */

import { type ComponentType, type ReactNode, useMemo, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApolloClient } from '@apollo/client';
import { useQuery, useMutation } from '@vienna/graphql/client';
import { GET_ENTITY, ADD_ENTITY_TOOL_ENTRY, REMOVE_ENTITY_TOOL_ENTRY } from '@vienna/graphql/client';
import { getEntityTypeFromURI, isEntityURI } from '@tryvienna/sdk';
import type { PluginHostApi, CanvasLogger } from '@tryvienna/sdk';
import { PluginDataProvider } from '@tryvienna/sdk/react';
import { Button, Input } from '@tryvienna/ui';
import { ArrowLeft, Eye, Save } from 'lucide-react';
import { usePluginSystem, usePluginSystemVersion } from '../renderer/contexts/PluginSystemContext';
import { useResolvedTheme } from '../renderer/contexts/ResolvedThemeContext';
import { PluginErrorBoundary } from '../components/PluginErrorBoundary';

// ─────────────────────────────────────────────────────────────────────────────
// Stub implementations for preview context
// ─────────────────────────────────────────────────────────────────────────────

const noopHostApi: PluginHostApi = {
  getCredentialStatus: async () => [],
  setCredential: async () => {},
  removeCredential: async () => {},
  startOAuthFlow: async () => ({ success: false, error: 'Preview mode' }),
  getOAuthStatus: async () => [],
  revokeOAuthToken: async () => ({ success: false }),
  fetch: async () => ({ ok: false, status: 0, statusText: 'Preview mode', headers: {}, text: '' }),
  openExternal: async () => {},
};

const noopLogger: CanvasLogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};

/** Simplified DrawerContainer for preview — renders title + children without real drawer chrome. */
function PreviewDrawerContainer({
  title,
  children,
}: {
  title?: ReactNode;
  headerActions?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      {title && <div className="text-sm font-medium text-foreground">{title}</div>}
      <div>{children}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export function EntityDebugPage() {
  const navigate = useNavigate();
  const { encodedUri } = useParams<{ encodedUri: string }>();
  const savedUri = encodedUri ? decodeURIComponent(encodedUri) : '';

  // Draft URI for editing — starts as the saved URI
  const [draftUri, setDraftUri] = useState(savedUri);
  // The URI currently being previewed (widgets render this)
  const [activeUri, setActiveUri] = useState(savedUri);

  const [addEntry] = useMutation(ADD_ENTITY_TOOL_ENTRY);
  const [removeEntry] = useMutation(REMOVE_ENTITY_TOOL_ENTRY);

  const apolloClient = useApolloClient();
  const resolvedTheme = useResolvedTheme();
  const system = usePluginSystem();
  const version = usePluginSystemVersion();

  const isDraftDirty = draftUri !== activeUri;
  const isDraftValid = isEntityURI(draftUri.trim());
  const isUnsaved = activeUri !== savedUri;

  let entityType = 'unknown';
  try {
    entityType = getEntityTypeFromURI(activeUri);
  } catch {
    // invalid URI
  }

  const { data, loading } = useQuery(GET_ENTITY, { variables: { uri: activeUri }, skip: !activeUri });
  const entity = data?.entity;

  // Look up registered UI components
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const entityDrawer = useMemo(() => system.getEntityDrawer(entityType), [system, entityType, version]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const feedCard = useMemo(() => system.getEntityFeedCard(entityType), [system, entityType, version]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const workstreamWidget = useMemo(() => system.getWorkstreamWidget(entityType), [system, entityType, version]);

  const pluginId = entityDrawer?.pluginId ?? workstreamWidget?.pluginId ?? '';

  const uiSurfaces = [
    { label: 'Entity Card', component: entityDrawer?.card, type: 'card' as const },
    { label: 'Feed Card', component: entityDrawer?.feedCard ?? feedCard, type: 'feedCard' as const },
    { label: 'Entity Drawer', component: entityDrawer?.component, type: 'drawer' as const },
    { label: 'Workstream Widget', component: entityDrawer?.workstreamWidget ?? workstreamWidget?.component, type: 'widget' as const },
  ];

  const hasAnyRegistered = uiSurfaces.some((s) => s.component);

  const handlePreview = useCallback(() => {
    const uri = draftUri.trim();
    if (uri && isDraftValid) {
      setActiveUri(uri);
    }
  }, [draftUri, isDraftValid]);

  const handleSave = useCallback(async () => {
    const uri = activeUri.trim();
    if (!uri) return;

    // Remove the old entry, add the new one
    if (savedUri && savedUri !== uri) {
      await removeEntry({ variables: { uri: savedUri } });
    }
    await addEntry({ variables: { uri } });

    // Navigate to the new URI's debug page (updates the route param)
    navigate('/entity-tool/' + encodeURIComponent(uri), { replace: true });
  }, [activeUri, savedUri, addEntry, removeEntry, navigate]);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground">
      {/* macOS title bar drag region */}
      <div className="fixed top-0 left-0 z-50 h-10 w-full [-webkit-app-region:drag]" />

      <div className="flex flex-1 flex-col overflow-y-auto pt-10">
        <div className="mx-auto w-full max-w-3xl px-10 py-8">
          {/* Header */}
          <div className="mb-6">
            <Button
              variant="ghost"
              size="sm"
              className="mb-4 gap-2"
              onClick={() => navigate('/settings?tab=entity-tool')}
            >
              <ArrowLeft size={16} />
              Back to Entity Tool
            </Button>

            <h1 className="text-xl font-semibold text-foreground">Entity Debug</h1>

            {/* Editable URI */}
            <div className="mt-3 rounded-md border border-border p-3">
              <div className="flex items-center gap-2">
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                  {entityType}
                </span>
                {pluginId && (
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                    plugin: {pluginId}
                  </span>
                )}
                {isUnsaved && (
                  <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-mono text-amber-500">
                    unsaved
                  </span>
                )}
              </div>

              <div className="mt-2 flex items-center gap-2">
                <Input
                  value={draftUri}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDraftUri(e.target.value)}
                  onKeyDown={(e: React.KeyboardEvent) => {
                    if (e.key === 'Enter') handlePreview();
                  }}
                  className="font-mono text-xs"
                  placeholder="@vienna//type/segments"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-1.5"
                  disabled={!isDraftDirty || !isDraftValid}
                  onClick={handlePreview}
                >
                  <Eye size={14} />
                  Preview
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className="shrink-0 gap-1.5"
                  disabled={!isUnsaved}
                  onClick={handleSave}
                >
                  <Save size={14} />
                  Save
                </Button>
              </div>

              {draftUri.trim() && !isDraftValid && (
                <p className="mt-1.5 text-xs text-destructive">Invalid URI format</p>
              )}

              {/* Resolved entity info */}
              {loading && <p className="mt-2 text-xs text-muted-foreground">Resolving entity...</p>}
              {entity && (
                <div className="mt-2 grid gap-1 text-xs text-muted-foreground">
                  {entity.title && <p><span className="text-foreground font-medium">Title:</span> {entity.title}</p>}
                  {entity.description && <p><span className="text-foreground font-medium">Description:</span> {entity.description}</p>}
                </div>
              )}
              {!loading && !entity && activeUri && (
                <p className="mt-2 text-xs text-amber-500">Could not resolve entity. The integration may not be authenticated or the entity may not exist.</p>
              )}
            </div>
          </div>

          {/* UI Surface Previews */}
          {!hasAnyRegistered && (
            <p className="text-sm text-muted-foreground">
              No UI overrides registered for entity type "{entityType}".
            </p>
          )}

          <div className="grid gap-6">
            {uiSurfaces.map(({ label, component, type }) => (
              <PreviewSection
                key={type}
                label={label}
                component={component}
                type={type}
                uri={activeUri}
                pluginId={pluginId}
                apolloClient={apolloClient}
                resolvedTheme={resolvedTheme}
                version={version}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Preview Section
// ─────────────────────────────────────────────────────────────────────────────

function PreviewSection({
  label,
  component,
  type,
  uri,
  pluginId,
  apolloClient,
  resolvedTheme,
  version,
}: {
  label: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: ComponentType<any> | undefined;
  type: 'card' | 'feedCard' | 'drawer' | 'widget';
  uri: string;
  pluginId: string;
  apolloClient: ReturnType<typeof useApolloClient>;
  resolvedTheme: 'dark' | 'light';
  version: number;
}) {
  if (!component) {
    return (
      <div className="rounded-md border border-dashed border-border p-4">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="mt-1 text-xs text-muted-foreground">Not registered</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border">
      <div className="border-b border-border px-4 py-2">
        <p className="text-sm font-medium text-foreground">{label}</p>
      </div>
      <div className="p-4">
        <PluginErrorBoundary pluginId={pluginId} resetKey={version}>
          <PluginDataProvider client={apolloClient} resolvedTheme={resolvedTheme} pluginId={pluginId}>
            <ComponentRenderer component={component} type={type} uri={uri} />
          </PluginDataProvider>
        </PluginErrorBoundary>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Component Renderer — type-safe rendering per UI surface
// ─────────────────────────────────────────────────────────────────────────────

function ComponentRenderer({
  component,
  type,
  uri,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: ComponentType<any>;
  type: 'card' | 'feedCard' | 'drawer' | 'widget';
  uri: string;
}) {
  const Component = component;

  switch (type) {
    case 'card':
      return <Component uri={uri} />;
    case 'feedCard':
      return <Component uri={uri} onNavigate={() => {}} />;
    case 'drawer':
      return (
        <Component
          uri={uri}
          DrawerContainer={PreviewDrawerContainer}
          onClose={() => {}}
          refreshKey={0}
        />
      );
    case 'widget':
      return <Component uri={uri} hostApi={noopHostApi} logger={noopLogger} />;
  }
}
