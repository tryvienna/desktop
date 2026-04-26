import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RegisterAppDialog } from './RegisterAppDialog';
import type { AppWithStats, App } from '../api/types';

const ACTIVE_THRESHOLD = 5 * 60 * 1_000;

const NAV_ITEMS = [
  { label: 'Overview', path: '' },
  { label: 'Versions', path: '/versions' },
  { label: 'Changelog', path: '/changelog' },
  { label: 'Runs', path: '/runs' },
] as const;

interface Props {
  apps: AppWithStats[];
  selectedAppId: string | null;
  onSelectApp: (appId: string) => void;
  onRegisterApp: (name: string, directory: string) => Promise<App>;
}

export function AppSidebar({ apps, selectedAppId, onSelectApp, onRegisterApp }: Props) {
  const [showRegister, setShowRegister] = useState(false);
  const [location] = useLocation();
  const [activeAppIds, setActiveAppIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const update = () => {
      const now = Date.now();
      setActiveAppIds(
        new Set(
          apps
            .filter(
              (app) => app.latestMetric && now - app.latestMetric.timestamp < ACTIVE_THRESHOLD
            )
            .map((app) => app.id)
        )
      );
    };
    update();
    const interval = setInterval(update, 30_000);
    return () => clearInterval(interval);
  }, [apps]);

  const activeSection = (() => {
    if (!selectedAppId) return null;
    const prefix = `/apps/${selectedAppId}`;
    const relative = location.startsWith(prefix) ? location.slice(prefix.length) : '';
    if (relative.startsWith('/runs')) return '/runs';
    if (relative.startsWith('/versions')) return '/versions';
    if (relative.startsWith('/changelog')) return '/changelog';
    return '';
  })();

  return (
    <aside className="w-56 border-r border-border flex flex-col bg-muted/30">
      {/* Branding */}
      <div className="p-3 border-b border-border">
        <span className="text-sm font-semibold tracking-tight">Electron Profiler</span>
      </div>

      {/* Section Navigation */}
      <nav className="p-2 space-y-0.5">
        {selectedAppId ? (
          NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.path;
            const href = `/apps/${selectedAppId}${item.path}`;
            return (
              <Link
                key={item.path}
                href={href}
                className={`block px-2.5 py-1.5 rounded-md text-sm transition-colors ${
                  isActive
                    ? 'bg-accent text-accent-foreground font-medium'
                    : 'hover:bg-accent/50 text-muted-foreground'
                }`}
              >
                {item.label}
              </Link>
            );
          })
        ) : (
          <p className="text-xs text-muted-foreground px-2.5 py-4">Select an app to get started.</p>
        )}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Footer: Add App + App Selector */}
      <div className="p-2 space-y-2 border-t border-border">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setShowRegister(true)}
        >
          + Add App
        </Button>

        {apps.length > 0 && (
          <Select value={selectedAppId ?? undefined} onValueChange={onSelectApp}>
            <SelectTrigger className="w-full" size="sm">
              <SelectValue placeholder="Select app..." />
            </SelectTrigger>
            <SelectContent position="popper" side="top" align="start">
              {apps.map((app) => {
                const isActive = activeAppIds.has(app.id);
                return (
                  <SelectItem key={app.id} value={app.id}>
                    <span
                      className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${
                        isActive ? 'bg-green-500' : 'bg-muted-foreground/30'
                      }`}
                    />
                    <span className="truncate">{app.name}</span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        )}
      </div>

      <RegisterAppDialog
        open={showRegister}
        onOpenChange={setShowRegister}
        onRegister={async (name, dir) => {
          const newApp = await onRegisterApp(name, dir);
          setShowRegister(false);
          onSelectApp(newApp.id);
        }}
      />
    </aside>
  );
}
