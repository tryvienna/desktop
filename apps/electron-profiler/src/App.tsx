import { useEffect } from 'react';
import { Route, Switch, useLocation } from 'wouter';
import { AppDetail } from './pages/AppDetail';
import { AppSidebar } from './components/AppSidebar';
import { RegisterAppDialog } from './components/RegisterAppDialog';
import { useApps } from './hooks/use-apps';
import { useState } from 'react';

export function App() {
  const { apps, loading, registerApp } = useApps();
  const [location, setLocation] = useLocation();
  const appMatch = location.match(/^\/apps\/([^/]+)/);
  const selectedAppId = appMatch ? appMatch[1] : null;

  // Auto-redirect to first app when at root
  useEffect(() => {
    if (location === '/' && apps.length > 0) {
      setLocation(`/apps/${apps[0].id}`, { replace: true });
    }
  }, [location, apps, setLocation]);

  const onSelectApp = (appId: string) => {
    setLocation(`/apps/${appId}`);
  };

  return (
    <div className="flex h-screen bg-background text-foreground">
      <AppSidebar
        apps={apps}
        selectedAppId={selectedAppId}
        onSelectApp={onSelectApp}
        onRegisterApp={registerApp}
      />
      <main className="flex-1 overflow-auto">
        <Switch>
          <Route path="/apps/:appId" nest>
            {(params) => <AppDetail key={params.appId} appId={params.appId} />}
          </Route>
          <Route>
            <EmptyState loading={loading} onRegisterApp={registerApp} />
          </Route>
        </Switch>
      </main>
    </div>
  );
}

function EmptyState({
  loading,
  onRegisterApp,
}: {
  loading: boolean;
  onRegisterApp: (name: string, directory: string) => Promise<import('./api/types').App>;
}) {
  const [showRegister, setShowRegister] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <p className="text-muted-foreground text-sm">
        No apps registered yet. Add your first Electron app to get started.
      </p>
      <button
        className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
        onClick={() => setShowRegister(true)}
      >
        Register App
      </button>
      <RegisterAppDialog
        open={showRegister}
        onOpenChange={setShowRegister}
        onRegister={async (name, dir) => {
          await onRegisterApp(name, dir);
          setShowRegister(false);
        }}
      />
    </div>
  );
}
