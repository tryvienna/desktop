/**
 * SkillBrowserDrawer — Full drawer for browsing, searching, and installing skills.
 *
 * @ai-context
 * - Opened via drawerActions.openFull(skillBrowserContent())
 * - Shows all registry skills with installed state overlay
 * - Search input filters by name/description
 * - Category tabs filter by category
 * - Click card → push(skillDetailContent(id)) for in-drawer navigation
 */

import { useMemo, useRef, useState, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { RefreshCw, Search } from 'lucide-react';
import { DrawerContainer } from '../../lib/drawer/DrawerContainer';
import { useDrawerNavigationOptional } from '../../lib/drawer';
import { useWorkstreamList } from '../../renderer/contexts/WorkstreamContext';
import { skillDetailContent, isSkillDetailContent, getSkillDetailPayload } from '../drawer/content';
import { useSkills } from './use-skills';
import { SkillCard, type SkillCardData } from './SkillCard';
import { SkillDetailView } from './SkillDetailView';
import { useInstallDestinations } from './useInstallDestinations';

const ALL_CATEGORY = 'All';

export function SkillBrowserDrawer() {
  const { installedSkills, registrySkills, install, update, loading, installingId, updatingId, syncRegistries, syncingRegistries } = useSkills();
  const navigation = useDrawerNavigationOptional();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState(ALL_CATEGORY);
  const { projectId } = useWorkstreamList();
  const installDestinations = useInstallDestinations(projectId);

  // Build installed lookup
  const installedMap = useMemo(() => {
    const map = new Map<string, { enabled: boolean; hasUpdate: boolean; source: string | null; sourceRef: string | null }>();
    for (const s of installedSkills) {
      if (!s.id) continue;
      map.set(s.id, { enabled: s.enabled ?? false, hasUpdate: s.hasUpdate ?? false, source: s.source ?? null, sourceRef: s.sourceRef ?? null });
    }
    return map;
  }, [installedSkills]);

  // Merge registry + installed into unified card data
  const allSkills = useMemo<SkillCardData[]>(() => {
    const seen = new Set<string>();
    const result: SkillCardData[] = [];

    for (const rs of registrySkills) {
      if (!rs.id) continue;
      seen.add(rs.id);
      const inst = installedMap.get(rs.id);
      result.push({
        id: rs.id,
        name: rs.name ?? '',
        description: rs.description ?? '',
        icon: rs.icon ?? null,
        category: rs.category ?? null,
        tags: rs.tags ?? [],
        author: rs.author?.name ?? null,
        version: rs.version ?? null,
        installed: !!inst,
        hasUpdate: inst?.hasUpdate ?? false,
        source: inst?.source ?? null,
        sourceLabel: inst?.sourceRef ?? null,
      });
    }

    // Include installed skills not in registry (e.g. manually installed)
    for (const is of installedSkills) {
      if (!is.id || seen.has(is.id)) continue;
      result.push({
        id: is.id,
        name: is.name ?? '',
        description: is.description ?? '',
        icon: is.icon ?? null,
        category: is.category ?? null,
        tags: is.tags ?? [],
        author: is.author ?? null,
        version: is.version ?? null,
        installed: true,
        hasUpdate: is.hasUpdate ?? false,
        source: is.source ?? null,
        sourceLabel: is.sourceRef ?? null,
      });
    }

    return result;
  }, [registrySkills, installedSkills, installedMap]);

  // Extract categories from all skills
  const categories = useMemo(() => {
    const cats = new Set<string>();
    for (const s of allSkills) {
      if (s.category) cats.add(s.category);
    }
    return [ALL_CATEGORY, ...Array.from(cats).sort()];
  }, [allSkills]);

  // Filter by search + category
  const filteredSkills = useMemo(() => {
    const term = search.toLowerCase().trim();
    return allSkills.filter((s) => {
      if (activeCategory !== ALL_CATEGORY && s.category !== activeCategory) return false;
      if (term) {
        return (
          s.name.toLowerCase().includes(term) ||
          s.description.toLowerCase().includes(term) ||
          (s.tags ?? []).some((t) => t.toLowerCase().includes(term))
        );
      }
      return true;
    });
  }, [allSkills, search, activeCategory]);

  const handleSelect = useCallback((id: string) => {
    const skill = allSkills.find((s) => s.id === id);
    navigation?.push(skillDetailContent(id), skill?.name ?? id);
  }, [allSkills, navigation]);

  const handleInstall = useCallback(async (id: string, destination: string) => {
    await install(id, destination);
  }, [install]);

  const handleUpdate = useCallback(async (id: string) => {
    await update(id);
  }, [update]);

  const searchRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: filteredSkills.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 110,
    gap: 8,
    overscan: 5,
  });

  // If a skill-detail view has been pushed onto the navigation stack, render it
  const currentContent = navigation?.current?.content;
  if (currentContent && isSkillDetailContent(currentContent)) {
    const payload = getSkillDetailPayload(currentContent);
    return <SkillDetailView skillId={payload?.skillId ?? ''} />;
  }

  return (
    <DrawerContainer id="skill-browser" title="Skills" hideRefresh contentClassName="overflow-hidden flex flex-col">
      {/* Sticky header: search + categories */}
      <div className="flex flex-col gap-3 px-4 pt-3 pb-2 shrink-0">
        {/* Search + Refresh */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search skills..."
              autoFocus
              className="w-full rounded-md border border-input bg-background py-1.5 pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            type="button"
            onClick={() => syncRegistries()}
            disabled={syncingRegistries}
            title="Refresh skills from registry"
            className="shrink-0 rounded-md border border-input bg-background p-1.5 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncingRegistries ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Category tabs */}
        {categories.length > 2 && (
          <div className="flex gap-1 overflow-x-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs transition-colors ${
                  activeCategory === cat
                    ? 'bg-foreground text-background'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Result count */}
        {!loading && filteredSkills.length > 0 && (
          <div className="text-xs text-muted-foreground">
            {filteredSkills.length} skill{filteredSkills.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Scrollable virtualized skills list */}
      {loading ? (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          Loading skills...
        </div>
      ) : filteredSkills.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
          <p className="text-sm text-muted-foreground">
            {search || activeCategory !== ALL_CATEGORY
              ? 'No skills match your search.'
              : 'No skills available.'}
          </p>
        </div>
      ) : (
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 pb-3">
          <div
            className="relative w-full"
            style={{ height: virtualizer.getTotalSize() }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const skill = filteredSkills[virtualRow.index];
              return (
                <div
                  key={skill.id}
                  className="absolute left-0 top-0 w-full"
                  style={{
                    height: virtualRow.size,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <SkillCard
                    skill={skill}
                    onSelect={handleSelect}
                    onInstall={handleInstall}
                    onUpdate={handleUpdate}
                    installingId={installingId}
                    updatingId={updatingId}
                    installDestinations={installDestinations}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </DrawerContainer>
  );
}
