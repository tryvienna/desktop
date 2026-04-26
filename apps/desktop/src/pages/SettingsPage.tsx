import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Palette, Bot, Wrench, Keyboard, PackageOpen, FolderKanban, User, Shield, Info, Tag, Users, Bug, Radio } from 'lucide-react';
import { Button } from '@tryvienna/ui';
import { cn } from '@tryvienna/ui/utils';
import type { SettingsCategory as DbSettingsCategory } from '@vienna/app-db';
import { AppearanceSettings } from '../components/settings/AppearanceSettings';
import { AiSettings } from '../components/settings/AiSettings';
import { AdvancedSettings } from '../components/settings/AdvancedSettings';
import { KeyboardShortcutsSection } from '../keybindings/components/KeyboardShortcutsSection';
import { RegistrySettings } from '../components/settings/RegistrySettings';
import { AccountSettings } from '../components/settings/AccountSettings';
import { ProjectSettings } from '../components/settings/ProjectSettings';
import { PermissionsSection } from '../components/settings/permissions/PermissionsSection';
import { AboutSettings } from '../components/settings/AboutSettings';
import { TagSettings } from '../components/settings/TagSettings';
import { ProfileSettings } from '../components/settings/ProfileSettings';
import { EntityToolSettings } from '../components/settings/EntityToolSettings';
import { useDeveloperMode } from '../renderer/hooks/useDeveloperMode';
import { EventMonitorView } from '../components/event-monitor';

type SettingsCategory = DbSettingsCategory | 'keyboard';

type PageCategory = SettingsCategory | 'registries' | 'account' | 'projects' | 'tags' | 'profiles' | 'about' | 'entity-tool' | 'events';

const BASE_CATEGORIES: { key: PageCategory; label: string; icon: typeof Palette }[] = [
  { key: 'projects', label: 'Projects', icon: FolderKanban },
  { key: 'tags', label: 'Tags', icon: Tag },
  { key: 'profiles', label: 'Profiles', icon: Users },
  { key: 'account', label: 'Account', icon: User },
  { key: 'appearance', label: 'Appearance', icon: Palette },
  { key: 'ai', label: 'AI', icon: Bot },
  { key: 'permissions', label: 'Permissions', icon: Shield },
  { key: 'keyboard', label: 'Keyboard', icon: Keyboard },
  { key: 'registries', label: 'Registries', icon: PackageOpen },
  { key: 'advanced', label: 'Advanced', icon: Wrench },
  { key: 'events', label: 'Event Monitor', icon: Radio },
  { key: 'about', label: 'About', icon: Info },
];

export function SettingsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const devMode = useDeveloperMode();

  const categories = useMemo(() => {
    const cats = [...BASE_CATEGORIES];
    if (devMode) {
      // Insert before 'about'
      const aboutIdx = cats.findIndex((c) => c.key === 'about');
      cats.splice(aboutIdx, 0, { key: 'entity-tool', label: 'Entity Tool', icon: Bug });
    }
    return cats;
  }, [devMode]);

  const resolveCategory = (tab: string | null): PageCategory => {
    return categories.some((c) => c.key === tab) ? (tab as PageCategory) : 'projects';
  };

  const [activeCategory, setActiveCategory] = useState<PageCategory>(() => resolveCategory(tabParam));

  // Sync tab from URL when navigating to settings with ?tab= param
  useEffect(() => {
    setActiveCategory(resolveCategory(tabParam));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabParam, categories]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* macOS title bar drag region */}
      <div className="fixed top-0 left-0 z-50 h-10 w-full [-webkit-app-region:drag]" />

      {/* Sidebar */}
      <nav className="flex w-56 flex-shrink-0 flex-col border-r border-border bg-background pt-10">
        <div className="px-3 pb-4">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            onClick={() => navigate('/')}
          >
            <ArrowLeft size={16} />
            Back
          </Button>
        </div>

        <h1 className="px-5 pb-3 text-lg font-semibold text-foreground">Settings</h1>

        <ul className="flex flex-col gap-0.5 px-3">
          {categories.map(({ key, label, icon: Icon }) => (
            <li key={key}>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'w-full justify-start gap-2',
                  activeCategory === key && 'bg-accent text-accent-foreground',
                )}
                onClick={() => setActiveCategory(key)}
              >
                <Icon size={16} />
                {label}
              </Button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Content */}
      {activeCategory === 'events' ? (
        <main className="flex flex-1 flex-col overflow-hidden pt-10">
          <EventMonitorView />
        </main>
      ) : (
        <main className="flex flex-1 flex-col overflow-y-auto pt-10">
          <div className="mx-auto w-full max-w-2xl px-10 py-8">
            <h2 className="text-xl font-semibold text-foreground">
              {categories.find((c) => c.key === activeCategory)?.label}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Configure your {activeCategory} preferences.
            </p>

            <div className="mt-8">
              {activeCategory === 'projects' && <ProjectSettings />}
              {activeCategory === 'tags' && <TagSettings />}
              {activeCategory === 'account' && <AccountSettings />}
              {activeCategory === 'appearance' && <AppearanceSettings />}
              {activeCategory === 'ai' && <AiSettings />}
              {activeCategory === 'permissions' && <PermissionsSection />}
              {activeCategory === 'keyboard' && <KeyboardShortcutsSection />}
              {activeCategory === 'profiles' && <ProfileSettings />}
              {activeCategory === 'registries' && <RegistrySettings />}
              {activeCategory === 'advanced' && <AdvancedSettings />}
              {activeCategory === 'entity-tool' && <EntityToolSettings />}
              {activeCategory === 'about' && <AboutSettings />}
            </div>
          </div>
        </main>
      )}
    </div>
  );
}
