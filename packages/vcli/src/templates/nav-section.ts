import type { TemplateContext } from '../types.ts';

export function renderNavSection(ctx: TemplateContext): string {
  const { naming, entities } = ctx;
  const pascal = naming.pascalName;
  const id = naming.pluginId;

  const entityImports = entities.length > 0
    ? `import { ${entities.map((e) => `GET_${e.entityType.toUpperCase()}S`).join(', ')} } from '../client/operations';\n`
    : '';

  const entityQueries = entities.length > 0
    ? entities
        .map(
          (e) => `
  const { data: ${e.entityCamel}Data, loading: ${e.entityCamel}Loading } = usePluginQuery(GET_${e.entityType.toUpperCase()}S, {
    variables: { limit: settings.limit },
    skip: !isReady,
    fetchPolicy: 'cache-and-network',
  });`,
        )
        .join('\n')
    : '';

  const entityFolders = entities.length > 0
    ? entities
        .map(
          (e) => `
        {/* ${e.entityDisplayName} folder */}
        <NavItem
          item={{
            id: '${e.entityType}s',
            label: \`${e.entityDisplayName}s\${(${e.entityCamel}Data?.${e.entityCamel}s?.length ?? 0) > 0 ? \` (\${${e.entityCamel}Data.${e.entityCamel}s.length})\` : ''}\`,
            variant: 'folder',
            icon: <Circle size={14} />,
          }}
          isExpanded={expandedFolders.has('${e.entityType}s')}
          onToggle={handleFolderToggle}
        >
          {expandedFolders.has('${e.entityType}s') && (
            <>
              {(${e.entityCamel}Data?.${e.entityCamel}s ?? []).map((item) => (
                <NavItem
                  key={\`${e.entityType}-\${item.id}\`}
                  item={{
                    id: \`${e.entityType}-\${item.id}\`,
                    label: item.title,
                    variant: 'item',
                    icon: <Circle size={12} />,
                  }}
                  depth={1}
                  onSelect={() => {
                    openEntityDrawer(\`@drift//${e.entityType}/\${item.id}\`);
                  }}
                />
              ))}
              {(${e.entityCamel}Data?.${e.entityCamel}s?.length ?? 0) === 0 && !${e.entityCamel}Loading && (
                <NavItem
                  item={{ id: '${e.entityType}s-empty', label: 'No items found', variant: 'item' }}
                  depth={1}
                />
              )}
            </>
          )}
        </NavItem>`,
        )
        .join('\n')
    : `
        <NavItem
          item={{ id: 'placeholder', label: 'No data to display', variant: 'item' }}
        />`;

  const isReadyCheck = ctx.auth !== 'none'
    ? `
  // ── Credential status ──────────────────────────────────────────────────
  const [hasCredentials, setHasCredentials] = useState(false);
  const [credLoading, setCredLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    hostApi.getCredentialStatus('${id}').then((keys) => {
      if (cancelled) return;
      const hasKey = keys.some((k) => k.isSet);
      setHasCredentials(hasKey);
      setCredLoading(false);
    }).catch((err) => {
      if (!cancelled) {
        logger.warn('Failed to check credential status', { error: String(err) });
        setCredLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [hostApi, logger]);

  const isReady = hasCredentials && !credLoading;
  const isLoading = credLoading;`
    : `
  const isReady = true;
  const isLoading = false;`;

  return `/**
 * ${pascal}NavSection — Nav sidebar canvas for the ${naming.displayName} plugin.
 */

import { useState, useEffect, useCallback } from 'react';
import { usePluginQuery } from '@tryvienna/sdk/react';
import {
  NavSection,
  NavItem,
  NavSettingsButton,
  NavHeaderActions,
} from '@tryvienna/ui';
import type { NavSidebarCanvasProps } from '@tryvienna/sdk';
import { ${ctx.auth !== 'none' ? 'Settings, ' : ''}Circle } from 'lucide-react';
import { use${pascal}Settings } from './use${pascal}Settings';
${entityImports}
export function ${pascal}NavSection({
  pluginId,
  openPluginDrawer,
  openEntityDrawer,
  hostApi,
  logger,
}: NavSidebarCanvasProps) {
${isReadyCheck}

  const { settings } = use${pascal}Settings();
${entityQueries}

  // ── Folder state ───────────────────────────────────────────────────────
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    () => new Set([${entities.length > 0 ? `'${entities[0].entityType}s'` : ''}]),
  );

  const handleFolderToggle = useCallback((id: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const sectionData = {
    id: \`plugin-\${pluginId}-nav\`,
    label: '${naming.displayName}',
    icon: <Circle size={12} />,
    items: [],
    isLoading,
    hoverActions: (
      <NavHeaderActions>
        <NavSettingsButton
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            openPluginDrawer({ view: 'settings' });
          }}
          ariaLabel="${naming.displayName} settings"
        />
      </NavHeaderActions>
    ),
    emptyState: ${ctx.auth !== 'none' ? `!isReady ? 'Configure credentials in settings' : 'No items to show'` : `'No items to show'`},
  };
${ctx.auth !== 'none' ? `
  if (!credLoading && !hasCredentials) {
    return (
      <NavSection section={sectionData} defaultExpanded>
        <NavItem
          item={{
            id: 'setup',
            label: 'Open Settings to configure',
            variant: 'item',
            icon: <Settings size={14} />,
          }}
          onSelect={() => openPluginDrawer({ view: 'settings' })}
        />
      </NavSection>
    );
  }
` : ''}
  return (
    <NavSection section={sectionData} defaultExpanded>
${entityFolders}
    </NavSection>
  );
}
`;
}
