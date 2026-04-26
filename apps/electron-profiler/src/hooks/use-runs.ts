import { useApi } from './use-api';
import type { ProfilingRun, RunSummary, MetricSnapshot } from '../api/types';

/** Fetch all profiling runs for an app. */
export function useRuns(appId: string | null, intervalMs = 10_000) {
  const url = appId ? `/api/runs?appId=${appId}` : null;
  return useApi<ProfilingRun[]>(url, intervalMs);
}

/** Fetch a single run summary (includes aggregated metrics, markers, KPIs). */
export function useRunSummary(runId: string | null) {
  const url = runId ? `/api/runs/${runId}` : null;
  return useApi<RunSummary>(url);
}

/** Fetch run summaries with aggregated metrics for trend analysis. */
export function useRunSummaries(appId: string | null, scenario?: string) {
  const params = new URLSearchParams();
  if (appId) params.set('appId', appId);
  if (scenario) params.set('scenario', scenario);
  const url = appId ? `/api/runs/summaries?${params.toString()}` : null;
  return useApi<RunSummary[]>(url, 15_000);
}

/** Fetch metric snapshots for a specific run. */
export function useRunMetrics(appId: string | null, runId: string | null) {
  // Use the existing metrics endpoint filtered by time range of the run
  // We'll use a dedicated query once we wire it up
  const url = appId && runId ? `/api/metrics/${appId}?runId=${runId}` : null;
  return useApi<MetricSnapshot[]>(url);
}
