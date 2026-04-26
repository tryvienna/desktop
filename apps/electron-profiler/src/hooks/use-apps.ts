import { useApi, apiMutate } from './use-api';
import type { AppWithStats, App } from '../api/types';

export function useApps() {
  const { data, loading, error, refetch } = useApi<AppWithStats[]>('/api/apps', 10_000);

  const registerApp = async (name: string, directory: string): Promise<App> => {
    const app = await apiMutate<App>('/api/apps', 'POST', { name, directory });
    await refetch();
    return app;
  };

  const deleteApp = async (id: string): Promise<void> => {
    await apiMutate('/api/apps/' + id, 'DELETE');
    await refetch();
  };

  return { apps: data ?? [], loading, error, refetch, registerApp, deleteApp };
}
