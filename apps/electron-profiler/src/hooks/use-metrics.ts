import { useApi } from './use-api';
import type { MetricSnapshot, VersionSummary } from '../api/types';

export function useMetrics(
  appId: string | null,
  intervalMs = 10_000,
  from?: number,
  to?: number,
  versionIds?: string[]
) {
  const params = new URLSearchParams();
  if (from) params.set('from', String(from));
  if (to) params.set('to', String(to));
  if (versionIds && versionIds.length > 0) params.set('versionIds', versionIds.join(','));
  const qs = params.toString();
  const url = appId ? `/api/metrics/${appId}${qs ? '?' + qs : ''}` : null;

  return useApi<MetricSnapshot[]>(url, intervalMs);
}

export function useMetricsSummary(appId: string | null, intervalMs = 30_000) {
  const url = appId ? `/api/metrics/${appId}/summary` : null;
  return useApi<VersionSummary[]>(url, intervalMs);
}
