import { useApi, apiMutate } from './use-api';
import type { AppWithStats, Version, VersionComparison, ScanResult } from '../api/types';

export function useAppDetail(appId: string | null) {
  const {
    data: app,
    loading,
    error,
    refetch,
  } = useApi<AppWithStats>(appId ? `/api/apps/${appId}` : null);

  return { app, loading, error, refetch };
}

export function useVersions(appId: string | null) {
  const { data, loading, error, refetch } = useApi<Version[]>(
    appId ? `/api/versions/${appId}` : null
  );

  const scanVersions = async (): Promise<ScanResult> => {
    if (!appId) throw new Error('No app selected');
    const result = await apiMutate<ScanResult>(`/api/versions/${appId}/scan`, 'POST');
    await refetch();
    return result;
  };

  return { versions: data ?? [], loading, error, refetch, scanVersions };
}

export function useVersionComparison(appId: string | null, a?: string, b?: string) {
  const url = appId && a && b ? `/api/versions/${appId}/compare?a=${a}&b=${b}` : null;

  return useApi<VersionComparison>(url);
}
