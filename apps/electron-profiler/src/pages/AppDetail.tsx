import { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAppDetail, useVersions } from '../hooks/use-app-detail';
import { useMetrics, useMetricsSummary } from '../hooks/use-metrics';
import { MetricsChart } from '../components/MetricsChart';
import { VersionComparisonTable } from '../components/VersionComparisonTable';
import { ChangelogPanel } from '../components/ChangelogPanel';
import { RegressionBadge } from '../components/RegressionBadge';
import {
  ChartFilterBar,
  resolveTimePreset,
  resolveVersionRange,
  type TimePreset,
} from '../components/ChartFilterBar';
import { useVersionComparison } from '../hooks/use-app-detail';
import { RunsPanel } from './Runs';

const REFRESH_OPTIONS = [
  { label: '1s', value: 1_000 },
  { label: '5s', value: 5_000 },
  { label: '15s', value: 15_000 },
  { label: '30s', value: 30_000 },
  { label: '1m', value: 60_000 },
] as const;

interface Props {
  appId: string;
}

export function AppDetail({ appId }: Props) {
  const [location] = useLocation();
  const [refreshInterval, setRefreshInterval] = useState(5_000);
  const { app, loading, error } = useAppDetail(appId);
  const { versions, scanVersions } = useVersions(appId);

  const [selectedMetric, setSelectedMetric] = useState<'cpu' | 'memory' | 'gpu'>('cpu');
  const [timePreset, setTimePreset] = useState<TimePreset>('1h');
  const [filterFromVersion, setFilterFromVersion] = useState<string | undefined>();
  const [filterToVersion, setFilterToVersion] = useState<string | undefined>();
  const [compareA, setCompareA] = useState<string | undefined>();
  const [compareB, setCompareB] = useState<string | undefined>();
  const [scanning, setScanning] = useState(false);

  // Derive section early so we can skip expensive metrics fetches on non-overview tabs
  const section = (() => {
    if (location.startsWith('/runs')) return 'runs';
    if (location.startsWith('/versions')) return 'versions';
    if (location.startsWith('/changelog')) return 'changelog';
    return 'overview';
  })();

  const needsMetrics = section === 'overview';

  // IMPORTANT: resolveTimePreset calls Date.now() which changes every render.
  // Without useMemo this creates an infinite fetch loop:
  // new timestamp → new URL → fetch → setState → re-render → new timestamp → …
  const fromTimestamp = useMemo(() => resolveTimePreset(timePreset), [timePreset]);
  const filterVersionIds = resolveVersionRange(versions, filterFromVersion, filterToVersion);

  const { data: snapshots, refetch: refetchMetrics } = useMetrics(
    needsMetrics ? appId : null,
    refreshInterval,
    fromTimestamp,
    undefined,
    filterVersionIds
  );
  const { data: summaries, refetch: refetchSummaries } = useMetricsSummary(
    needsMetrics ? appId : null,
    refreshInterval
  );

  const { data: comparison } = useVersionComparison(appId, compareA, compareB);

  if (loading && !app) {
    return <div className="p-6 text-sm text-muted-foreground">Loading...</div>;
  }
  if (error || !app) {
    return <div className="p-6 text-sm text-destructive">{error || 'App not found'}</div>;
  }

  const handleScan = async () => {
    setScanning(true);
    try {
      await scanVersions();
    } finally {
      setScanning(false);
    }
  };

  const handleSelectVersion = (versionId: string) => {
    if (!compareA) {
      setCompareA(versionId);
    } else if (!compareB) {
      setCompareB(versionId);
    } else {
      setCompareA(versionId);
      setCompareB(undefined);
    }
  };

  // Find commit hashes for changelog
  const fromCommit = versions.find((v) => v.id === compareA)?.commit_hash;
  const toCommit = versions.find((v) => v.id === compareB)?.commit_hash;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <h1 className="text-lg font-semibold">{app.name}</h1>
          <p className="text-xs text-muted-foreground font-mono">{app.directory}</p>
        </div>
        <Badge variant="outline">{app.sampleCount} samples</Badge>
        <div className="flex items-center gap-2">
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          >
            {REFRESH_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchMetrics();
              refetchSummaries();
            }}
          >
            Refresh
          </Button>
        </div>
      </div>

      <Separator />

      {/* Overview */}
      {section === 'overview' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            {(['cpu', 'memory', 'gpu'] as const).map((m) => (
              <Button
                key={m}
                variant={selectedMetric === m ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedMetric(m)}
              >
                {m === 'cpu' ? 'CPU' : m === 'memory' ? 'Memory' : 'GPU'}
              </Button>
            ))}
          </div>

          <ChartFilterBar
            timePreset={timePreset}
            onTimePresetChange={setTimePreset}
            versions={versions}
            fromVersionId={filterFromVersion}
            toVersionId={filterToVersion}
            onFromVersionChange={setFilterFromVersion}
            onToVersionChange={setFilterToVersion}
            onClear={() => {
              setTimePreset('all');
              setFilterFromVersion(undefined);
              setFilterToVersion(undefined);
            }}
          />

          <MetricsChart snapshots={snapshots ?? []} versions={versions} metric={selectedMetric} />

          {/* Window summary stats */}
          {snapshots &&
            snapshots.length > 0 &&
            (() => {
              const stats = computeWindowStats(snapshots);
              return (
                <div className="space-y-2">
                  <h3 className="text-xs font-medium text-muted-foreground">
                    Window Summary ({snapshots.length} samples)
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <StatBox label="Avg CPU" value={`${stats.cpu.avg.toFixed(2)}%`} />
                    <StatBox label="P50 CPU" value={`${stats.cpu.p50.toFixed(2)}%`} />
                    <StatBox label="P95 CPU" value={`${stats.cpu.p95.toFixed(2)}%`} />
                    <StatBox label="Max CPU" value={`${stats.cpu.max.toFixed(2)}%`} />
                    <StatBox label="Avg Memory" value={formatMB(stats.memory.avg)} />
                    <StatBox label="P50 Memory" value={formatMB(stats.memory.p50)} />
                    <StatBox label="P95 Memory" value={formatMB(stats.memory.p95)} />
                    <StatBox label="Max Memory" value={formatMB(stats.memory.max)} />
                  </div>
                </div>
              );
            })()}
        </div>
      )}

      {/* Versions */}
      {section === 'versions' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={handleScan} disabled={scanning}>
              {scanning ? 'Scanning...' : 'Scan Git Tags'}
            </Button>
            {compareA && (
              <span className="text-xs text-muted-foreground">
                Comparing: {compareA?.slice(0, 8)}
                {compareB ? ` vs ${compareB.slice(0, 8)}` : ' — select second version'}
              </span>
            )}
            {compareA && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCompareA(undefined);
                  setCompareB(undefined);
                }}
              >
                Clear
              </Button>
            )}
          </div>

          <VersionComparisonTable
            summaries={summaries ?? []}
            onSelectVersion={handleSelectVersion}
          />

          {comparison && (
            <div className="space-y-2 p-4 rounded-md border bg-muted/30">
              <h3 className="text-sm font-medium">Regression Analysis</h3>
              <div className="flex gap-2 flex-wrap">
                {comparison.regressions.map((r, i) => (
                  <RegressionBadge key={i} regression={r} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Changelog */}
      {section === 'changelog' && (
        <ChangelogPanel appId={appId} fromCommit={fromCommit} toCommit={toCommit} />
      )}

      {/* Runs */}
      {section === 'runs' && <RunsPanel appId={appId} />}
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-md border bg-muted/30">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold mt-0.5">{value}</p>
    </div>
  );
}

function formatMB(bytes: number): string {
  return (bytes / 1024 / 1024).toFixed(0) + ' MB';
}

function percentile(sorted: number[], p: number): number {
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

interface WindowStats {
  cpu: { avg: number; p50: number; p95: number; max: number };
  memory: { avg: number; p50: number; p95: number; max: number };
}

function computeWindowStats(snapshots: { cpuTotal: number; memoryRss: number }[]): WindowStats {
  const cpuValues = [...snapshots.map((s) => s.cpuTotal)].sort((a, b) => a - b);
  const memValues = [...snapshots.map((s) => s.memoryRss)].sort((a, b) => a - b);
  const cpuSum = cpuValues.reduce((s, v) => s + v, 0);
  const memSum = memValues.reduce((s, v) => s + v, 0);
  return {
    cpu: {
      avg: cpuSum / cpuValues.length,
      p50: percentile(cpuValues, 50),
      p95: percentile(cpuValues, 95),
      max: cpuValues[cpuValues.length - 1],
    },
    memory: {
      avg: memSum / memValues.length,
      p50: percentile(memValues, 50),
      p95: percentile(memValues, 95),
      max: memValues[memValues.length - 1],
    },
  };
}
