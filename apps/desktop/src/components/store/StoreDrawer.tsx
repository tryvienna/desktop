/**
 * StoreDrawer — Main drawer for browsing and installing plugins.
 *
 * Manages list-to-detail navigation internally via useState.
 * All plugin state derives from GraphQL via useRegistryPlugins().
 *
 * Views:
 * - list: Browse/search plugins (registry)
 * - detail: Plugin info + install CTA + tabs
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { DrawerContainer, useDrawerActions } from '../../lib/drawer';
import type { DrawerContentDescriptor } from '../../lib/drawer';
import { getPluginStorePayload } from '../drawer/content';
import { StoreListView, type PluginCardData, toPluginCardData } from './StoreListView';
import { StoreDetailView } from './StoreDetailView';
import { useRegistryPlugins } from './use-registry-plugins';
import { useActionForm } from '../../providers/ActionFormProvider';

type View = 'list' | 'detail';

interface StoreDrawerProps {
  content: DrawerContentDescriptor;
}

export function StoreDrawer({ content }: StoreDrawerProps) {
  const { close } = useDrawerActions();
  const { showPluginForm } = useActionForm();
  const { registryPlugins, installedMap } = useRegistryPlugins();
  const payload = getPluginStorePayload(content);

  const [view, setView] = useState<View>(() => {
    if (payload?.pluginId) return 'detail';
    return 'list';
  });

  const [selectedCard, setSelectedCard] = useState<PluginCardData | null>(null);

  // Build a lookup of registry plugins as PluginCardData for deep-linking
  const cardById = useMemo(() => {
    const map = new Map<string, PluginCardData>();
    for (const rp of registryPlugins) {
      const id = rp.id ?? '';
      const inst = installedMap.get(id);
      map.set(id, toPluginCardData(rp, inst));
    }
    return map;
  }, [registryPlugins, installedMap]);

  // Resolve initial plugin selection from deep-link payload
  useEffect(() => {
    if (payload?.pluginId && cardById.size > 0 && !selectedCard) {
      const found = cardById.get(payload.pluginId);
      if (found) {
        setSelectedCard(found);
        setView('detail');
      }
    }
  }, [payload?.pluginId, cardById, selectedCard]);

  const handleSelect = useCallback((card: PluginCardData) => {
    setSelectedCard(card);
    setView('detail');
  }, []);

  const handleBack = useCallback(() => {
    setSelectedCard(null);
    setView('list');
  }, []);

  const title = view === 'detail' && selectedCard
    ? selectedCard.name
    : 'Explore Plugins';

  return (
    <DrawerContainer
      id="plugin-store"
      title={title}
      showBackButton={view !== 'list'}
      onBack={handleBack}
      onClose={close}
      hideRefresh
    >
      {view === 'detail' && selectedCard ? (
        <StoreDetailView
          card={selectedCard}
          initialTab={payload?.tab}
        />
      ) : (
        <StoreListView
          onSelect={handleSelect}
          onCreatePlugin={() => { close(); showPluginForm(); }}
          initialSearch={payload?.search}
          initialCanvasFilters={payload?.canvasFilters as string[] | undefined}
        />
      )}
    </DrawerContainer>
  );
}
