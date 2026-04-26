import { useState, useMemo } from 'react';
import { useRoute, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine } from 'recharts';
import { useRuns, useRunSummary, useRunSummaries, useRunMetrics } from '../hooks/use-runs';
import { apiMutate } from '../hooks/use-api';
import type { RunSummary, Marker, MetricSnapshot, HostSnapshot } from '../api/types';

interface Props {
  appId: string;
}

// ── Helpers ──────────────────────────────────────────────────────

function formatMB(bytes: number): string {
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

function formatDuration(ms: number): string {
  if (ms < 1_000) return `${ms}ms`;
  return `${(ms / 1_000).toFixed(1)}s`;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return `${Math.round(diff / 1_000)}s ago`;
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`;
  return new Date(ts).toLocaleDateString();
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

const REGRESSION_THRESHOLD = 10;

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// ── Sparkline ────────────────────────────────────────────────────

function Sparkline({
  values,
  width = 48,
  height = 14,
  good,
}: {
  values: number[];
  width?: number;
  height?: number;
  good?: boolean; // true = latest below historical mean (good for lower-is-better)
}) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pad = 2;
  const h = height - pad * 2;
  const pts = values.map((v, i) => ({
    x: (i / (values.length - 1)) * width,
    y: pad + h - ((v - min) / range) * h,
  }));
  const linePoints = pts.map((p) => `${p.x},${p.y}`).join(' ');
  const last = pts[pts.length - 1];
  const dotFill =
    good === true
      ? 'oklch(0.55 0.2 145)'
      : good === false
        ? 'oklch(0.6 0.22 25)'
        : 'oklch(0.5 0 0)';

  return (
    <svg width={width} height={height} className="inline-block align-middle ml-1">
      <polyline
        points={linePoints}
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.3"
      />
      <circle cx={last.x} cy={last.y} r="1.5" fill={dotFill} />
    </svg>
  );
}

// ── Confidence Badge ─────────────────────────────────────────────

function ConfidenceBadge({ score }: { score: number | null | undefined }) {
  if (score == null) return null;
  const color =
    score >= 80
      ? 'bg-green-500'
      : score >= 60
        ? 'bg-yellow-500'
        : 'bg-red-500';
  const label =
    score >= 80
      ? 'Clean environment'
      : score >= 60
        ? 'Noisy environment'
        : 'Unreliable environment';
  return (
    <span className="inline-flex items-center gap-1" title={label}>
      <span className={`w-1.5 h-1.5 rounded-full ${color}`} />
      <span className="text-[10px] text-muted-foreground">{score}</span>
    </span>
  );
}

// ── Statistical Analysis ─────────────────────────────────────────

interface MetricAnalysis {
  mean: number;
  stddev: number;
  zScore: number;
  severity: 'none' | 'warning' | 'critical';
}

/** Analyze a chronological array of metric values. Returns null if < 3 values. */
function analyzeMetric(values: number[]): MetricAnalysis | null {
  if (values.length < 3) return null;
  const historical = values.slice(0, -1);
  const latest = values[values.length - 1];
  const mean = historical.reduce((s, v) => s + v, 0) / historical.length;
  const variance = historical.reduce((s, v) => s + (v - mean) ** 2, 0) / historical.length;
  const stddev = Math.sqrt(variance);
  if (stddev < 0.001) return { mean, stddev, zScore: 0, severity: 'none' };
  const zScore = (latest - mean) / stddev;
  return {
    mean,
    stddev,
    zScore,
    severity: zScore > 2.5 ? 'critical' : zScore > 1.5 ? 'warning' : 'none',
  };
}

interface ScenarioRegression {
  scenario: string;
  metric: string;
  severity: 'warning' | 'critical';
  zScore: number;
  currentFmt: string;
  meanFmt: string;
}

// ── Main Component ───────────────────────────────────────────────

export function RunsPanel({ appId }: Props) {
  const { data: runs, loading, refetch: refetchRuns } = useRuns(appId);
  const { data: allSummaries, refetch: refetchSummaries } = useRunSummaries(appId);
  const [, setLocation] = useLocation();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const [isRunDetail, runParams] = useRoute('/runs/:runId');
  const selectedRunId = isRunDetail ? runParams.runId : null;

  const selectRun = (runId: string) => setLocation(`/runs/${runId}`);
  const clearRunSelection = () => setLocation('/runs');

  const deleteRun = async (runId: string) => {
    await apiMutate(`/api/runs/${runId}`, 'DELETE');
    refetchRuns();
    refetchSummaries();
  };

  // Group summaries by scenario (chronological order from API)
  const scenarioData = useMemo(() => {
    if (!allSummaries) return [];
    const map = new Map<string, RunSummary[]>();
    for (const s of allSummaries) {
      const arr = map.get(s.name) ?? [];
      arr.push(s);
      map.set(s.name, arr);
    }
    return Array.from(map.entries()).map(([name, chronological]) => {
      const reversed = [...chronological].reverse(); // newest first for display
      const latest = reversed[0];
      const prev = reversed[1] ?? null;

      // Simple regression check (fallback for < 3 runs)
      const cpuDelta = prev ? pctChange(latest.avg_cpu, prev.avg_cpu) : null;
      const memDelta = prev ? pctChange(latest.avg_memory, prev.avg_memory) : null;
      const hasSimpleRegression =
        (cpuDelta != null && cpuDelta > REGRESSION_THRESHOLD) ||
        (memDelta != null && memDelta > REGRESSION_THRESHOLD) ||
        latest.kpis.some((kpi) => {
          const prevKpi = prev?.kpis.find((k) => k.name === kpi.name);
          if (!prevKpi) return false;
          const d = pctChange(kpi.value, prevKpi.value);
          return d != null && d > REGRESSION_THRESHOLD;
        });

      // Statistical analysis (z-score based, needs 3+ runs)
      const cpuAnalysis = analyzeMetric(chronological.map((s) => s.avg_cpu));
      const memAnalysis = analyzeMetric(chronological.map((s) => s.avg_memory));

      const regressions: ScenarioRegression[] = [];
      if (cpuAnalysis && cpuAnalysis.severity !== 'none') {
        regressions.push({
          scenario: name,
          metric: 'CPU',
          severity: cpuAnalysis.severity,
          zScore: cpuAnalysis.zScore,
          currentFmt: `${latest.avg_cpu.toFixed(1)}%`,
          meanFmt: `${cpuAnalysis.mean.toFixed(1)}%`,
        });
      }
      if (memAnalysis && memAnalysis.severity !== 'none') {
        regressions.push({
          scenario: name,
          metric: 'Memory',
          severity: memAnalysis.severity,
          zScore: memAnalysis.zScore,
          currentFmt: formatMB(latest.avg_memory),
          meanFmt: formatMB(memAnalysis.mean),
        });
      }

      // KPI analysis
      const kpiSet = new Set<string>();
      for (const s of chronological) for (const k of s.kpis) kpiSet.add(k.name);
      for (const kpiName of kpiSet) {
        const vals = chronological
          .filter((s) => s.kpis.some((k) => k.name === kpiName))
          .map((s) => s.kpis.find((k) => k.name === kpiName)!.value);
        const analysis = analyzeMetric(vals);
        if (analysis && analysis.severity !== 'none') {
          const kpi = latest.kpis.find((k) => k.name === kpiName);
          regressions.push({
            scenario: name,
            metric: kpiName.replace(/_/g, ' '),
            severity: analysis.severity,
            zScore: analysis.zScore,
            currentFmt: `${kpi?.value ?? vals[vals.length - 1]}${kpi?.unit ?? ''}`,
            meanFmt: `${analysis.mean.toFixed(1)}${kpi?.unit ?? ''}`,
          });
        }
      }

      const hasRegression = regressions.length > 0 || hasSimpleRegression;

      // Sparkline data (chronological order for charts)
      const cpuSparkline = chronological.map((s) => s.avg_cpu);
      const memSparkline = chronological.map((s) => s.avg_memory);

      return {
        name,
        summaries: reversed,
        chronological,
        latest,
        prev,
        hasRegression,
        regressions,
        cpuSparkline,
        memSparkline,
        cpuAnalysis,
        memAnalysis,
      };
    });
  }, [allSummaries]);

  // Collect all KPI names across all scenarios
  const kpiNames = useMemo(() => {
    if (!allSummaries) return [];
    const names = new Set<string>();
    for (const s of allSummaries) {
      for (const k of s.kpis) names.add(k.name);
    }
    return Array.from(names);
  }, [allSummaries]);

  const scenarioNames = scenarioData.map((s) => s.name);
  const allExpanded = scenarioNames.length > 0 && scenarioNames.every((n) => expanded.has(n));

  const toggleScenario = (name: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const toggleAll = () => {
    if (allExpanded) {
      setExpanded(new Set());
    } else {
      setExpanded(new Set(scenarioNames));
    }
  };

  if (loading && !runs) {
    return <div className="text-sm text-muted-foreground">Loading runs...</div>;
  }

  if (!runs || runs.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-12 text-center">
        No profiling runs yet. Run Playwright tests with the profiling fixture to generate data.
      </div>
    );
  }

  if (selectedRunId) {
    return (
      <RunDetail
        runId={selectedRunId}
        appId={appId}
        onBack={clearRunSelection}
        onDelete={deleteRun}
      />
    );
  }

  const allRegressions = scenarioData.flatMap((s) => s.regressions);
  const totalRegressions = scenarioData.filter((s) => s.hasRegression).length;
  const runningRuns = runs.filter((r) => r.status === 'running');
  const hasSufficientData = scenarioData.some((s) => s.chronological.length >= 3);

  return (
    <div className="space-y-3">
      {/* Active runs banner */}
      {runningRuns.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
          </span>
          <span className="text-xs text-blue-700 dark:text-blue-300">
            {runningRuns.length} run{runningRuns.length !== 1 ? 's' : ''} in progress:{' '}
            {runningRuns.map((r) => r.name).join(', ')}
          </span>
        </div>
      )}

      {/* Regression health summary */}
      {hasSufficientData && (
        <div
          className={`rounded-md border px-3 py-2.5 ${
            allRegressions.some((r) => r.severity === 'critical')
              ? 'border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20'
              : allRegressions.length > 0
                ? 'border-yellow-300 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-950/20'
                : 'border-green-300 dark:border-green-800 bg-green-50/30 dark:bg-green-950/15'
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-medium">
            {allRegressions.length === 0 ? (
              <span className="text-green-700 dark:text-green-400">
                All scenarios within normal range
              </span>
            ) : (
              <span
                className={
                  allRegressions.some((r) => r.severity === 'critical')
                    ? 'text-red-700 dark:text-red-400'
                    : 'text-yellow-700 dark:text-yellow-400'
                }
              >
                {allRegressions.length} regression{allRegressions.length !== 1 ? 's' : ''} detected
              </span>
            )}
          </div>
          {allRegressions.length > 0 && (
            <div className="mt-1.5 space-y-0.5">
              {allRegressions.map((r, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[11px]">
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      r.severity === 'critical' ? 'bg-red-500' : 'bg-yellow-500'
                    }`}
                  />
                  <span className="text-muted-foreground">{r.scenario}</span>
                  <span className="text-muted-foreground/50">&rsaquo;</span>
                  <span className="font-medium">{r.metric}</span>
                  <span className="text-muted-foreground">
                    +{r.zScore.toFixed(1)}&sigma; above mean
                  </span>
                  <span className="text-muted-foreground/70">
                    ({r.currentFmt} vs avg {r.meanFmt})
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Header bar */}
      <div className="flex items-center gap-3">
        <p className="text-xs text-muted-foreground flex-1">
          {runs.length} run{runs.length !== 1 ? 's' : ''}, {scenarioData.length} scenario
          {scenarioData.length !== 1 ? 's' : ''}
          {totalRegressions > 0 && (
            <span className="text-red-500 ml-1">({totalRegressions} with regressions)</span>
          )}
        </p>
        {scenarioData.length > 1 && (
          <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={toggleAll}>
            {allExpanded ? 'Collapse all' : 'Expand all'}
          </Button>
        )}
      </div>

      {/* Unified table */}
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/50 text-muted-foreground">
              <th className="text-left py-2 px-3 font-medium w-8" />
              <th className="text-left py-2 px-3 font-medium">Scenario / Commit</th>
              <th className="text-left py-2 px-3 font-medium">When</th>
              <th className="text-right py-2 px-3 font-medium">Runs</th>
              <th className="text-right py-2 px-3 font-medium">Avg CPU</th>
              <th className="text-right py-2 px-3 font-medium">Max CPU</th>
              <th className="text-right py-2 px-3 font-medium">Avg Memory</th>
              <th className="text-right py-2 px-3 font-medium">Max Memory</th>
              {kpiNames.map((name) => (
                <th key={name} className="text-right py-2 px-3 font-medium">
                  {name.replace(/_/g, ' ')}
                </th>
              ))}
              <th className="text-right py-2 px-3 font-medium">Env</th>
              <th className="text-right py-2 px-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {scenarioData.map((scenario) => {
              const isExpanded = expanded.has(scenario.name);
              const { latest, prev } = scenario;

              const cpuDelta = prev ? pctChange(latest.avg_cpu, prev.avg_cpu) : null;
              const maxCpuDelta = prev ? pctChange(latest.max_cpu, prev.max_cpu) : null;
              const memDelta = prev ? pctChange(latest.avg_memory, prev.avg_memory) : null;
              const maxMemDelta = prev ? pctChange(latest.max_memory, prev.max_memory) : null;

              return (
                <ScenarioRows
                  key={scenario.name}
                  name={scenario.name}
                  summaries={scenario.summaries}
                  chronological={scenario.chronological}
                  latest={latest}
                  cpuDelta={cpuDelta}
                  maxCpuDelta={maxCpuDelta}
                  memDelta={memDelta}
                  maxMemDelta={maxMemDelta}
                  hasRegression={scenario.hasRegression}
                  regressions={scenario.regressions}
                  cpuSparkline={scenario.cpuSparkline}
                  memSparkline={scenario.memSparkline}
                  cpuAnalysis={scenario.cpuAnalysis}
                  memAnalysis={scenario.memAnalysis}
                  kpiNames={kpiNames}
                  isExpanded={isExpanded}
                  onToggle={() => toggleScenario(scenario.name)}
                  onSelectRun={selectRun}
                  onDeleteRun={deleteRun}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Scenario Rows (summary + expanded children) ──────────────────

function ScenarioRows({
  name,
  summaries,
  chronological,
  latest,
  cpuDelta,
  maxCpuDelta,
  memDelta,
  maxMemDelta,
  hasRegression,
  regressions,
  cpuSparkline,
  memSparkline,
  cpuAnalysis,
  memAnalysis,
  kpiNames,
  isExpanded,
  onToggle,
  onSelectRun,
  onDeleteRun,
}: {
  name: string;
  summaries: RunSummary[];
  chronological: RunSummary[];
  latest: RunSummary;
  cpuDelta: number | null;
  maxCpuDelta: number | null;
  memDelta: number | null;
  maxMemDelta: number | null;
  hasRegression: boolean;
  regressions: ScenarioRegression[];
  cpuSparkline: number[];
  memSparkline: number[];
  cpuAnalysis: MetricAnalysis | null;
  memAnalysis: MetricAnalysis | null;
  kpiNames: string[];
  isExpanded: boolean;
  onToggle: () => void;
  onSelectRun: (id: string) => void;
  onDeleteRun: (id: string) => Promise<void>;
}) {
  const prev = summaries.length > 1 ? summaries[1] : null;

  // Compute KPI sparklines
  const kpiSparklines = useMemo(() => {
    const result = new Map<string, number[]>();
    for (const kpiName of kpiNames) {
      const vals = chronological
        .filter((s) => s.kpis.some((k) => k.name === kpiName))
        .map((s) => s.kpis.find((k) => k.name === kpiName)!.value);
      if (vals.length >= 2) result.set(kpiName, vals);
    }
    return result;
  }, [chronological, kpiNames]);

  // Determine sparkline trend (good = latest below mean for lower-is-better)
  const cpuGood = cpuAnalysis ? cpuAnalysis.zScore < 0 : undefined;
  const memGood = memAnalysis ? memAnalysis.zScore < 0 : undefined;

  const statusLabel = regressions.some((r) => r.severity === 'critical')
    ? 'critical'
    : regressions.length > 0
      ? 'warning'
      : summaries.length >= 3
        ? 'stable'
        : summaries.length >= 2
          ? 'stable'
          : 'new';

  return (
    <>
      {/* Summary row */}
      <tr
        className={`border-t cursor-pointer transition-colors font-medium h-9 ${
          hasRegression
            ? 'bg-red-50/50 dark:bg-red-950/20 hover:bg-red-50 dark:hover:bg-red-950/40'
            : 'hover:bg-muted/40'
        }`}
        onClick={onToggle}
      >
        {/* Chevron */}
        <td className="py-1.5 px-3 text-muted-foreground">
          <span className={`inline-block transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
            &#9656;
          </span>
        </td>

        {/* Scenario name */}
        <td className="py-1.5 px-3">
          <span>{name}</span>
        </td>

        {/* Latest run time */}
        <td className="py-1.5 px-3 text-muted-foreground font-normal">
          {timeAgo(latest.started_at)}
        </td>

        {/* Run count */}
        <td className="text-right py-1.5 px-3 font-normal text-muted-foreground">
          {summaries.length}
        </td>

        {/* Avg CPU */}
        <td className="text-right py-1.5 px-3 whitespace-nowrap">
          <MetricCell
            value={`${latest.avg_cpu.toFixed(1)}%`}
            delta={cpuDelta}
            lowerIsBetter
            sparkline={cpuSparkline}
            sparklineGood={cpuGood}
          />
        </td>

        {/* Max CPU */}
        <td className="text-right py-1.5 px-3 whitespace-nowrap">
          <MetricCell value={`${latest.max_cpu.toFixed(1)}%`} delta={maxCpuDelta} lowerIsBetter />
        </td>

        {/* Avg Memory */}
        <td className="text-right py-1.5 px-3 whitespace-nowrap">
          <MetricCell
            value={formatMB(latest.avg_memory)}
            delta={memDelta}
            lowerIsBetter
            sparkline={memSparkline}
            sparklineGood={memGood}
          />
        </td>

        {/* Max Memory */}
        <td className="text-right py-1.5 px-3 whitespace-nowrap">
          <MetricCell value={formatMB(latest.max_memory)} delta={maxMemDelta} lowerIsBetter />
        </td>

        {/* KPIs */}
        {kpiNames.map((kpiName) => {
          const kpi = latest.kpis.find((k) => k.name === kpiName);
          const prevKpi = prev?.kpis.find((k) => k.name === kpiName);
          const delta = kpi && prevKpi ? pctChange(kpi.value, prevKpi.value) : null;
          const kpiSpark = kpiSparklines.get(kpiName);
          const kpiAnalysis = kpiSpark ? analyzeMetric(kpiSpark) : null;
          return (
            <td key={kpiName} className="text-right py-1.5 px-3 whitespace-nowrap">
              {kpi ? (
                <MetricCell
                  value={`${kpi.value}${kpi.unit ?? ''}`}
                  delta={delta}
                  lowerIsBetter
                  sparkline={kpiSpark}
                  sparklineGood={kpiAnalysis ? kpiAnalysis.zScore < 0 : undefined}
                />
              ) : (
                <span className="text-muted-foreground font-normal">—</span>
              )}
            </td>
          );
        })}

        {/* Env confidence */}
        <td className="text-right py-1.5 px-3">
          <ConfidenceBadge score={latest.environment_confidence} />
        </td>

        {/* Status */}
        <td className="text-right py-1.5 px-3">
          {statusLabel === 'critical' ? (
            <Badge variant="destructive" className="text-[10px] h-5">
              Critical
            </Badge>
          ) : statusLabel === 'warning' ? (
            <Badge
              className="text-[10px] h-5 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700"
              variant="outline"
            >
              Warning
            </Badge>
          ) : statusLabel === 'stable' ? (
            <span className="text-green-600 dark:text-green-400 text-[11px]">Stable</span>
          ) : (
            <span className="text-muted-foreground font-normal text-[11px]">—</span>
          )}
        </td>
      </tr>

      {/* Expanded child rows */}
      {isExpanded &&
        summaries.map((run, i) => {
          const runPrev = i < summaries.length - 1 ? summaries[i + 1] : null;
          return (
            <ChildRunRow
              key={run.id}
              run={run}
              prev={runPrev}
              kpiNames={kpiNames}
              onClick={() => onSelectRun(run.id)}
              onDelete={() => onDeleteRun(run.id)}
            />
          );
        })}
    </>
  );
}

// ── Child Run Row ────────────────────────────────────────────────

function ChildRunRow({
  run,
  prev,
  kpiNames,
  onClick,
  onDelete,
}: {
  run: RunSummary;
  prev: RunSummary | null;
  kpiNames: string[];
  onClick: () => void;
  onDelete: () => void;
}) {
  const duration = run.stopped_at ? run.stopped_at - run.started_at : null;
  const cpuDelta = prev ? pctChange(run.avg_cpu, prev.avg_cpu) : null;
  const maxCpuDelta = prev ? pctChange(run.max_cpu, prev.max_cpu) : null;
  const memDelta = prev ? pctChange(run.avg_memory, prev.avg_memory) : null;
  const maxMemDelta = prev ? pctChange(run.max_memory, prev.max_memory) : null;

  const hasRegression =
    (cpuDelta != null && cpuDelta > REGRESSION_THRESHOLD) ||
    (memDelta != null && memDelta > REGRESSION_THRESHOLD) ||
    kpiNames.some((name) => {
      const currKpi = run.kpis.find((k) => k.name === name);
      const prevKpi = prev?.kpis.find((k) => k.name === name);
      if (!currKpi || !prevKpi) return false;
      const d = pctChange(currKpi.value, prevKpi.value);
      return d != null && d > REGRESSION_THRESHOLD;
    });

  const rowBg = hasRegression
    ? 'bg-red-50/40 dark:bg-red-950/15 hover:bg-red-50/70 dark:hover:bg-red-950/30'
    : 'hover:bg-muted/30';

  return (
    <tr
      className={`border-t border-border/40 cursor-pointer transition-colors h-9 ${rowBg}`}
      onClick={onClick}
    >
      {/* Indent */}
      <td className="py-1.5 px-3" />

      {/* Commit */}
      <td className="py-1.5 px-3">
        <div className="flex items-center gap-1.5 pl-3 min-w-0">
          {hasRegression && <span className="text-red-500 shrink-0 text-[10px]">!</span>}
          {run.commit_hash ? (
            <span className="font-mono bg-muted px-1 py-0.5 rounded text-[11px]">
              {run.commit_hash.slice(0, 7)}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
          {run.commit_message && (
            <span
              className="text-muted-foreground truncate max-w-[160px]"
              title={run.commit_message}
            >
              {run.commit_message}
            </span>
          )}
        </div>
      </td>

      {/* When */}
      <td className="py-1.5 px-3 text-muted-foreground whitespace-nowrap">
        {timeAgo(run.started_at)}
      </td>

      {/* Duration (reuse runs column) */}
      <td className="text-right py-1.5 px-3 text-muted-foreground">
        {duration != null ? formatDuration(duration) : '—'}
      </td>

      {/* Avg CPU */}
      <td className="text-right py-1.5 px-3 whitespace-nowrap">
        <MetricCell value={`${run.avg_cpu.toFixed(1)}%`} delta={cpuDelta} lowerIsBetter />
      </td>

      {/* Max CPU */}
      <td className="text-right py-1.5 px-3 whitespace-nowrap">
        <MetricCell value={`${run.max_cpu.toFixed(1)}%`} delta={maxCpuDelta} lowerIsBetter />
      </td>

      {/* Avg Memory */}
      <td className="text-right py-1.5 px-3 whitespace-nowrap">
        <MetricCell value={formatMB(run.avg_memory)} delta={memDelta} lowerIsBetter />
      </td>

      {/* Max Memory */}
      <td className="text-right py-1.5 px-3 whitespace-nowrap">
        <MetricCell value={formatMB(run.max_memory)} delta={maxMemDelta} lowerIsBetter />
      </td>

      {/* KPIs */}
      {kpiNames.map((name) => {
        const kpi = run.kpis.find((k) => k.name === name);
        const prevKpi = prev?.kpis.find((k) => k.name === name);
        const delta = kpi && prevKpi ? pctChange(kpi.value, prevKpi.value) : null;
        return (
          <td key={name} className="text-right py-1.5 px-3 whitespace-nowrap">
            {kpi ? (
              <MetricCell value={`${kpi.value}${kpi.unit ?? ''}`} delta={delta} lowerIsBetter />
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </td>
        );
      })}

      {/* Env confidence */}
      <td className="text-right py-1.5 px-3">
        <ConfidenceBadge score={run.environment_confidence} />
      </td>

      {/* Delete */}
      <td className="text-right py-1.5 px-3">
        <button
          className="text-muted-foreground/40 hover:text-red-500 transition-colors text-[11px]"
          title="Delete this run"
          onClick={(e) => {
            e.stopPropagation();
            if (confirm('Delete this run? This cannot be undone.')) onDelete();
          }}
        >
          &times;
        </button>
      </td>
    </tr>
  );
}

// ── Metric Cell & Delta Badge ────────────────────────────────────

function MetricCell({
  value,
  delta,
  lowerIsBetter,
  sparkline,
  sparklineGood,
}: {
  value: string;
  delta: number | null;
  lowerIsBetter: boolean;
  sparkline?: number[];
  sparklineGood?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1">
      <span>{value}</span>
      {delta != null && Math.abs(delta) >= 1 && (
        <DeltaBadge delta={delta} lowerIsBetter={lowerIsBetter} />
      )}
      {sparkline && sparkline.length >= 2 && <Sparkline values={sparkline} good={sparklineGood} />}
    </span>
  );
}

function DeltaBadge({ delta, lowerIsBetter }: { delta: number; lowerIsBetter: boolean }) {
  const isRegression = lowerIsBetter ? delta > 0 : delta < 0;
  const isMajor = Math.abs(delta) >= REGRESSION_THRESHOLD;

  let color: string;
  if (isRegression && isMajor) {
    color = 'text-red-600 dark:text-red-400 font-medium';
  } else if (isRegression) {
    color = 'text-red-500/70 dark:text-red-400/70';
  } else if (isMajor) {
    color = 'text-green-600 dark:text-green-400 font-medium';
  } else {
    color = 'text-green-500/70 dark:text-green-400/70';
  }

  return (
    <span className={`text-[10px] ${color}`}>
      {delta > 0 ? '+' : ''}
      {delta.toFixed(0)}%
    </span>
  );
}

// ── Run Detail ───────────────────────────────────────────────────

function RunDetail({
  runId,
  appId,
  onBack,
  onDelete,
}: {
  runId: string;
  appId: string;
  onBack: () => void;
  onDelete: (id: string) => Promise<void>;
}) {
  const { data: summary, loading } = useRunSummary(runId);
  const { data: snapshots } = useRunMetrics(appId, runId);
  const { data: scenarioSummaries } = useRunSummaries(appId, summary?.name);

  const [baselineN, setBaselineN] = useState(10);

  // Find previous run in same scenario for comparison
  const prevRun = useMemo(() => {
    if (!summary || !scenarioSummaries) return null;
    const sorted = [...scenarioSummaries].sort((a, b) => b.started_at - a.started_at);
    const idx = sorted.findIndex((s) => s.id === summary.id);
    return idx >= 0 && idx < sorted.length - 1 ? sorted[idx + 1] : null;
  }, [summary, scenarioSummaries]);

  // Compute baseline: average of last N runs before this one
  const baseline = useMemo(() => {
    if (!summary || !scenarioSummaries || scenarioSummaries.length < 2) return null;
    const sorted = [...scenarioSummaries].sort((a, b) => b.started_at - a.started_at);
    const idx = sorted.findIndex((s) => s.id === summary.id);
    if (idx < 0) return null;
    const prior = sorted.slice(idx + 1, idx + 1 + baselineN);
    if (prior.length === 0) return null;
    const n = prior.length;
    const avg = (fn: (s: RunSummary) => number) => prior.reduce((sum, s) => sum + fn(s), 0) / n;

    // Average KPIs across prior runs
    const kpiSet = new Set<string>();
    for (const s of prior) for (const k of s.kpis) kpiSet.add(k.name);
    const kpis = Array.from(kpiSet).map((name) => {
      const vals = prior.filter((s) => s.kpis.some((k) => k.name === name));
      const avgVal =
        vals.reduce((sum, s) => sum + s.kpis.find((k) => k.name === name)!.value, 0) / vals.length;
      const unit = prior
        .find((s) => s.kpis.some((k) => k.name === name))
        ?.kpis.find((k) => k.name === name)?.unit;
      return { name, value: avgVal, unit };
    });

    return {
      count: n,
      avg_cpu: avg((s) => s.avg_cpu),
      max_cpu: avg((s) => s.max_cpu),
      avg_memory: avg((s) => s.avg_memory),
      max_memory: avg((s) => s.max_memory),
      kpis,
    };
  }, [summary, scenarioSummaries, baselineN]);

  // How many prior runs exist (for adjustable N)
  const maxPriorRuns = useMemo(() => {
    if (!summary || !scenarioSummaries) return 0;
    const sorted = [...scenarioSummaries].sort((a, b) => b.started_at - a.started_at);
    const idx = sorted.findIndex((s) => s.id === summary.id);
    return idx >= 0 ? sorted.length - idx - 1 : 0;
  }, [summary, scenarioSummaries]);

  // Compute percentile stats from raw snapshots
  const detailedStats = useMemo(() => {
    if (!snapshots || snapshots.length === 0) return null;
    const cpu = snapshots.map((s) => s.cpuTotal).sort((a, b) => a - b);
    const mem = snapshots.map((s) => s.memoryRss).sort((a, b) => a - b);
    const heap = snapshots
      .filter((s) => s.memoryHeap != null)
      .map((s) => s.memoryHeap!)
      .sort((a, b) => a - b);
    const gpu = snapshots
      .filter((s) => s.gpuMemory != null)
      .map((s) => s.gpuMemory!)
      .sort((a, b) => a - b);
    const procs = snapshots.map((s) => s.processCount).sort((a, b) => a - b);

    const build = (vals: number[]) =>
      vals.length === 0
        ? null
        : {
            min: vals[0],
            avg: vals.reduce((s, v) => s + v, 0) / vals.length,
            p50: percentile(vals, 50),
            p95: percentile(vals, 95),
            p99: percentile(vals, 99),
            max: vals[vals.length - 1],
          };

    return {
      cpu: build(cpu)!,
      memory: build(mem)!,
      heap: build(heap),
      gpu: build(gpu),
      processCount: build(procs)!,
    };
  }, [snapshots]);

  // Scenario history: chronological runs + rankings
  const scenarioHistory = useMemo(() => {
    if (!summary || !scenarioSummaries || scenarioSummaries.length < 2) return null;

    const chrono = [...scenarioSummaries].sort((a, b) => a.started_at - b.started_at);
    const n = chrono.length;

    // Rank (1 = best, lower metric value = better for lowerIsBetter metrics)
    const rank = (values: { id: string; value: number }[]) => {
      const sorted = [...values].sort((a, b) => a.value - b.value);
      return sorted.findIndex((v) => v.id === summary.id) + 1;
    };

    const cpuRank = rank(chrono.map((s) => ({ id: s.id, value: s.avg_cpu })));
    const memRank = rank(chrono.map((s) => ({ id: s.id, value: s.avg_memory })));

    // Collect KPI names across all runs in scenario
    const kpiSet = new Set<string>();
    for (const s of chrono) for (const k of s.kpis) kpiSet.add(k.name);
    const kpiNames = Array.from(kpiSet);

    const kpiRanks = kpiNames.map((name) => {
      const vals = chrono
        .filter((s) => s.kpis.some((k) => k.name === name))
        .map((s) => ({ id: s.id, value: s.kpis.find((k) => k.name === name)!.value }));
      return { name, rank: rank(vals), total: vals.length };
    });

    return {
      chronological: chrono,
      rankings: [
        { label: 'CPU', rank: cpuRank, total: n },
        { label: 'Memory', rank: memRank, total: n },
        ...kpiRanks.map((k) => ({
          label: k.name.replace(/_/g, ' '),
          rank: k.rank,
          total: k.total,
        })),
      ],
      kpiNames,
    };
  }, [summary, scenarioSummaries]);

  if (loading && !summary) {
    return <div className="text-sm text-muted-foreground">Loading run details...</div>;
  }
  if (!summary) {
    return <div className="text-sm text-destructive">Run not found</div>;
  }

  const duration = summary.stopped_at ? summary.stopped_at - summary.started_at : null;
  const hasGpu = snapshots?.some((s) => s.gpuMemory != null) ?? false;
  const hasHeap = snapshots?.some((s) => s.memoryHeap != null) ?? false;

  // Latest snapshot for process breakdown
  const latestSnapshot = snapshots && snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          &larr; Back
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">{summary.name}</h2>
            <StatusBadge status={summary.status} />
            <ConfidenceBadge score={summary.environment_confidence} />
            {duration != null && <Badge variant="outline">{formatDuration(duration)}</Badge>}
            <Badge variant="outline">{summary.sample_count} samples</Badge>
          </div>
          {summary.commit_hash && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
              <span className="font-mono bg-muted px-1.5 py-0.5 rounded">
                {summary.commit_hash.slice(0, 8)}
              </span>
              {summary.commit_message && <span className="truncate">{summary.commit_message}</span>}
              {summary.app_version && (
                <Badge variant="outline" className="text-[10px]">
                  v{summary.app_version}
                </Badge>
              )}
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-red-500 text-xs"
          onClick={() => {
            if (confirm('Delete this run and all its data? This cannot be undone.')) {
              onDelete(runId).then(onBack);
            }
          }}
        >
          Delete run
        </Button>
      </div>

      {/* KPIs with delta vs previous — always visible */}
      {summary.kpis.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-muted-foreground">KPIs</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {summary.kpis.map((kpi) => {
              const prevKpi = prevRun?.kpis.find((k) => k.name === kpi.name);
              const delta = prevKpi ? pctChange(kpi.value, prevKpi.value) : null;
              return (
                <div key={kpi.name} className="p-3 rounded-md border bg-muted/30">
                  <p className="text-xs text-muted-foreground">{kpi.name.replace(/_/g, ' ')}</p>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <p className="text-lg font-semibold">
                      {kpi.value}
                      {kpi.unit ? (
                        <span className="text-xs font-normal ml-0.5">{kpi.unit}</span>
                      ) : (
                        ''
                      )}
                    </p>
                    {delta != null && Math.abs(delta) >= 1 && (
                      <DeltaBadge delta={delta} lowerIsBetter />
                    )}
                  </div>
                  {prevKpi && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      prev: {prevKpi.value}
                      {prevKpi.unit ?? ''}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Host environment — always visible when present */}
      {summary.host_snapshots && summary.host_snapshots.length > 0 && (
        <HostEnvironmentSection snapshots={summary.host_snapshots} />
      )}

      {/* Resource summary cards — always visible */}
      <div className="space-y-2">
        <h3 className="text-xs font-medium text-muted-foreground">Resource Summary</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <ComparisonStatBox
            label="Avg CPU"
            value={`${summary.avg_cpu.toFixed(2)}%`}
            prevValue={prevRun ? `${prevRun.avg_cpu.toFixed(2)}%` : undefined}
            delta={prevRun ? pctChange(summary.avg_cpu, prevRun.avg_cpu) : null}
            lowerIsBetter
          />
          <ComparisonStatBox
            label="Max CPU"
            value={`${summary.max_cpu.toFixed(2)}%`}
            prevValue={prevRun ? `${prevRun.max_cpu.toFixed(2)}%` : undefined}
            delta={prevRun ? pctChange(summary.max_cpu, prevRun.max_cpu) : null}
            lowerIsBetter
          />
          <ComparisonStatBox
            label="Avg Memory"
            value={formatMB(summary.avg_memory)}
            prevValue={prevRun ? formatMB(prevRun.avg_memory) : undefined}
            delta={prevRun ? pctChange(summary.avg_memory, prevRun.avg_memory) : null}
            lowerIsBetter
          />
          <ComparisonStatBox
            label="Max Memory"
            value={formatMB(summary.max_memory)}
            prevValue={prevRun ? formatMB(prevRun.max_memory) : undefined}
            delta={prevRun ? pctChange(summary.max_memory, prevRun.max_memory) : null}
            lowerIsBetter
          />
        </div>
      </div>

      {/* Timeline — always visible when present */}
      {summary.markers.length > 0 && (
        <TimelineSection markers={summary.markers} runStart={summary.started_at} />
      )}

      {/* ── Charts (collapsible, open by default) ── */}
      {snapshots && snapshots.length > 0 && (
        <DetailSection title="Charts" defaultOpen count={snapshots.length + ' samples'}>
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-[11px] text-muted-foreground font-medium">CPU</p>
              <SingleMetricChart
                snapshots={snapshots}
                markers={summary.markers}
                dataKey="cpu"
                extractValue={(s) => s.cpuTotal}
                color="oklch(0.65 0.2 250)"
                label="CPU %"
                formatY={(v) => `${v}%`}
              />
            </div>
            <div className="space-y-2">
              <p className="text-[11px] text-muted-foreground font-medium">Memory (RSS)</p>
              <SingleMetricChart
                snapshots={snapshots}
                markers={summary.markers}
                dataKey="memory"
                extractValue={(s) => s.memoryRss / 1024 / 1024}
                color="oklch(0.65 0.18 160)"
                label="Memory (MB)"
                formatY={(v) => `${v.toFixed(0)} MB`}
              />
            </div>
            {hasHeap && (
              <div className="space-y-2">
                <p className="text-[11px] text-muted-foreground font-medium">Heap</p>
                <SingleMetricChart
                  snapshots={snapshots}
                  markers={summary.markers}
                  dataKey="heap"
                  extractValue={(s) => (s.memoryHeap ?? 0) / 1024 / 1024}
                  color="oklch(0.65 0.2 200)"
                  label="Heap (MB)"
                  formatY={(v) => `${v.toFixed(0)} MB`}
                />
              </div>
            )}
            {hasGpu && (
              <div className="space-y-2">
                <p className="text-[11px] text-muted-foreground font-medium">GPU Memory</p>
                <SingleMetricChart
                  snapshots={snapshots}
                  markers={summary.markers}
                  dataKey="gpu"
                  extractValue={(s) => (s.gpuMemory ?? 0) / 1024 / 1024}
                  color="oklch(0.65 0.18 310)"
                  label="GPU (MB)"
                  formatY={(v) => `${v.toFixed(0)} MB`}
                />
              </div>
            )}
            <div className="space-y-2">
              <p className="text-[11px] text-muted-foreground font-medium">Process count</p>
              <SingleMetricChart
                snapshots={snapshots}
                markers={summary.markers}
                dataKey="procs"
                extractValue={(s) => s.processCount}
                color="oklch(0.65 0.15 60)"
                label="Processes"
                formatY={(v) => v.toFixed(0)}
              />
            </div>
          </div>
        </DetailSection>
      )}

      {/* ── Distribution (collapsible) ── */}
      {detailedStats && (
        <DetailSection title="Distribution" defaultOpen count={snapshots?.length + ' samples'}>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/50 text-muted-foreground">
                  <th className="text-left py-1.5 px-3 font-medium">Metric</th>
                  <th className="text-right py-1.5 px-3 font-medium">Min</th>
                  <th className="text-right py-1.5 px-3 font-medium">Avg</th>
                  <th className="text-right py-1.5 px-3 font-medium">P50</th>
                  <th className="text-right py-1.5 px-3 font-medium">P95</th>
                  <th className="text-right py-1.5 px-3 font-medium">P99</th>
                  <th className="text-right py-1.5 px-3 font-medium">Max</th>
                </tr>
              </thead>
              <tbody>
                <PercentileRow
                  label="CPU %"
                  stats={detailedStats.cpu}
                  format={(v) => `${v.toFixed(2)}%`}
                />
                <PercentileRow
                  label="Memory (RSS)"
                  stats={detailedStats.memory}
                  format={formatMB}
                />
                {detailedStats.heap && (
                  <PercentileRow label="Heap" stats={detailedStats.heap} format={formatMB} />
                )}
                {detailedStats.gpu && (
                  <PercentileRow label="GPU Memory" stats={detailedStats.gpu} format={formatMB} />
                )}
                <PercentileRow
                  label="Processes"
                  stats={detailedStats.processCount}
                  format={(v) => v.toFixed(0)}
                />
              </tbody>
            </table>
          </div>
        </DetailSection>
      )}

      {/* ── Process Breakdown (collapsible) ── */}
      {latestSnapshot?.processesJson && (
        <DetailSection title="Process Breakdown" count="latest sample">
          <ProcessBreakdown processesJson={latestSnapshot.processesJson} />
        </DetailSection>
      )}

      {/* ── Comparison with previous run (collapsible) ── */}
      {prevRun && (
        <DetailSection
          title={`vs Previous Run${prevRun.commit_hash ? ` (${prevRun.commit_hash.slice(0, 7)})` : ''}`}
          defaultOpen
        >
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/50 text-muted-foreground">
                  <th className="text-left py-1.5 px-3 font-medium">Metric</th>
                  <th className="text-right py-1.5 px-3 font-medium">This Run</th>
                  <th className="text-right py-1.5 px-3 font-medium">Previous</th>
                  <th className="text-right py-1.5 px-3 font-medium">Change</th>
                </tr>
              </thead>
              <tbody>
                <ComparisonRow
                  label="Avg CPU"
                  current={summary.avg_cpu}
                  previous={prevRun.avg_cpu}
                  format={(v) => `${v.toFixed(2)}%`}
                  lowerIsBetter
                />
                <ComparisonRow
                  label="Max CPU"
                  current={summary.max_cpu}
                  previous={prevRun.max_cpu}
                  format={(v) => `${v.toFixed(2)}%`}
                  lowerIsBetter
                />
                <ComparisonRow
                  label="Avg Memory"
                  current={summary.avg_memory}
                  previous={prevRun.avg_memory}
                  format={formatMB}
                  lowerIsBetter
                />
                <ComparisonRow
                  label="Max Memory"
                  current={summary.max_memory}
                  previous={prevRun.max_memory}
                  format={formatMB}
                  lowerIsBetter
                />
                {summary.kpis.map((kpi) => {
                  const prevKpi = prevRun.kpis.find((k) => k.name === kpi.name);
                  if (!prevKpi) return null;
                  return (
                    <ComparisonRow
                      key={kpi.name}
                      label={kpi.name.replace(/_/g, ' ')}
                      current={kpi.value}
                      previous={prevKpi.value}
                      format={(v) => `${v}${kpi.unit ?? ''}`}
                      lowerIsBetter
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        </DetailSection>
      )}

      {/* ── Comparison with baseline (avg of last N runs) ── */}
      {baseline && (
        <DetailSection title={`vs Baseline (avg of last ${baseline.count} runs)`} defaultOpen>
          <div className="space-y-2">
            {/* Adjustable N selector */}
            {maxPriorRuns >= 2 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Compare against last:</span>
                {[3, 5, 10, 20, 50]
                  .filter((n) => n <= maxPriorRuns)
                  .map((n) => (
                    <button
                      key={n}
                      className={`px-1.5 py-0.5 rounded text-[11px] transition-colors ${
                        baselineN === n
                          ? 'bg-primary/10 font-medium text-foreground'
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => setBaselineN(n)}
                    >
                      {n} runs
                    </button>
                  ))}
                {![3, 5, 10, 20, 50].includes(maxPriorRuns) && (
                  <button
                    className={`px-1.5 py-0.5 rounded text-[11px] transition-colors ${
                      baselineN === maxPriorRuns
                        ? 'bg-primary/10 font-medium text-foreground'
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setBaselineN(maxPriorRuns)}
                  >
                    All ({maxPriorRuns})
                  </button>
                )}
              </div>
            )}

            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/50 text-muted-foreground">
                    <th className="text-left py-1.5 px-3 font-medium">Metric</th>
                    <th className="text-right py-1.5 px-3 font-medium">This Run</th>
                    <th className="text-right py-1.5 px-3 font-medium">Baseline</th>
                    <th className="text-right py-1.5 px-3 font-medium">Change</th>
                  </tr>
                </thead>
                <tbody>
                  <ComparisonRow
                    label="Avg CPU"
                    current={summary.avg_cpu}
                    previous={baseline.avg_cpu}
                    format={(v) => `${v.toFixed(2)}%`}
                    lowerIsBetter
                  />
                  <ComparisonRow
                    label="Max CPU"
                    current={summary.max_cpu}
                    previous={baseline.max_cpu}
                    format={(v) => `${v.toFixed(2)}%`}
                    lowerIsBetter
                  />
                  <ComparisonRow
                    label="Avg Memory"
                    current={summary.avg_memory}
                    previous={baseline.avg_memory}
                    format={formatMB}
                    lowerIsBetter
                  />
                  <ComparisonRow
                    label="Max Memory"
                    current={summary.max_memory}
                    previous={baseline.max_memory}
                    format={formatMB}
                    lowerIsBetter
                  />
                  {summary.kpis.map((kpi) => {
                    const baseKpi = baseline.kpis.find((k) => k.name === kpi.name);
                    if (!baseKpi) return null;
                    return (
                      <ComparisonRow
                        key={kpi.name}
                        label={kpi.name.replace(/_/g, ' ')}
                        current={kpi.value}
                        previous={baseKpi.value}
                        format={(v) => `${v.toFixed(1)}${kpi.unit ?? ''}`}
                        lowerIsBetter
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </DetailSection>
      )}

      {/* ── Scenario History (collapsible) ── */}
      {scenarioHistory && (
        <DetailSection
          title="Scenario History"
          defaultOpen
          count={scenarioHistory.chronological.length + ' runs'}
        >
          <div className="space-y-4">
            {/* Ranking badges */}
            <div className="flex gap-2 flex-wrap">
              {scenarioHistory.rankings.map((r) => {
                const isTop = r.rank === 1;
                const isBottom = r.rank === r.total;
                const badgeColor = isTop
                  ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800'
                  : isBottom
                    ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
                    : 'text-muted-foreground bg-muted/30 border-border';
                return (
                  <span
                    key={r.label}
                    className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border ${badgeColor}`}
                  >
                    <span className="font-medium">{r.label}</span>
                    <span>
                      {ordinal(r.rank)} / {r.total}
                    </span>
                  </span>
                );
              })}
            </div>

            <div className="space-y-1">
              <p className="text-[11px] text-muted-foreground font-medium">Avg CPU across runs</p>
              <ScenarioTrendChart
                summaries={scenarioHistory.chronological}
                currentRunId={summary.id}
                label="Avg CPU %"
                extractValue={(s) => s.avg_cpu}
                formatY={(v) => `${v.toFixed(1)}%`}
                color="oklch(0.65 0.2 250)"
              />
            </div>

            <div className="space-y-1">
              <p className="text-[11px] text-muted-foreground font-medium">
                Avg Memory across runs
              </p>
              <ScenarioTrendChart
                summaries={scenarioHistory.chronological}
                currentRunId={summary.id}
                label="Avg Memory (MB)"
                extractValue={(s) => s.avg_memory / 1024 / 1024}
                formatY={(v) => `${v.toFixed(0)} MB`}
                color="oklch(0.65 0.18 160)"
              />
            </div>

            {scenarioHistory.kpiNames.map((name) => (
              <div key={name} className="space-y-1">
                <p className="text-[11px] text-muted-foreground font-medium">
                  {name.replace(/_/g, ' ')} across runs
                </p>
                <ScenarioTrendChart
                  summaries={scenarioHistory.chronological.filter((s) =>
                    s.kpis.some((k) => k.name === name)
                  )}
                  currentRunId={summary.id}
                  label={name.replace(/_/g, ' ')}
                  extractValue={(s) => s.kpis.find((k) => k.name === name)?.value ?? 0}
                  formatY={(v) => `${v}`}
                  color="oklch(0.65 0.15 60)"
                />
              </div>
            ))}
          </div>
        </DetailSection>
      )}

      {/* ── Raw sample data (collapsed by default) ── */}
      {snapshots && snapshots.length > 0 && (
        <DetailSection title="Sample Data" count={snapshots.length + ' rows'}>
          <SampleTable snapshots={snapshots} runStart={summary.started_at} />
        </DetailSection>
      )}
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────

function HostEnvironmentSection({ snapshots }: { snapshots: HostSnapshot[] }) {
  if (snapshots.length === 0) return null;
  const start = snapshots.find((s) => s.phase === 'start');
  const end = snapshots.find((s) => s.phase === 'end');
  const primary = start ?? snapshots[0];

  const loadStr = primary.loadAvg.map((v) => v.toFixed(2)).join(' / ');
  const freeMemPct = ((primary.freeMemory / primary.totalMemory) * 100).toFixed(0);

  return (
    <DetailSection title="Host Environment" defaultOpen>
      <div className="space-y-3">
        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-md border bg-muted/30">
            <p className="text-xs text-muted-foreground">CPU Load (1/5/15)</p>
            <p className="text-sm font-semibold mt-0.5">{loadStr}</p>
            <p className="text-[10px] text-muted-foreground">{primary.cpuCores} cores</p>
          </div>
          <div className="p-3 rounded-md border bg-muted/30">
            <p className="text-xs text-muted-foreground">Free Memory</p>
            <p className="text-sm font-semibold mt-0.5">{formatMB(primary.freeMemory)}</p>
            <p className="text-[10px] text-muted-foreground">{freeMemPct}% of {formatMB(primary.totalMemory)}</p>
          </div>
          {primary.memoryPressurePct != null && (
            <div className="p-3 rounded-md border bg-muted/30">
              <p className="text-xs text-muted-foreground">Memory Pressure</p>
              <p className="text-sm font-semibold mt-0.5">{primary.memoryPressurePct}% free</p>
            </div>
          )}
          <div className="p-3 rounded-md border bg-muted/30">
            <p className="text-xs text-muted-foreground">Power / Thermal</p>
            <p className="text-sm font-semibold mt-0.5">
              {primary.powerSource ?? '—'}{' '}
              {primary.batteryPercent != null ? `(${primary.batteryPercent}%)` : ''}
            </p>
            {primary.thermalState && (
              <p className="text-[10px] text-muted-foreground">{primary.thermalState}</p>
            )}
          </div>
        </div>

        {/* Start/end comparison */}
        {start && end && (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/50 text-muted-foreground">
                  <th className="text-left py-1.5 px-3 font-medium">Metric</th>
                  <th className="text-right py-1.5 px-3 font-medium">Start</th>
                  <th className="text-right py-1.5 px-3 font-medium">End</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t">
                  <td className="py-1.5 px-3 font-medium">Load Avg (1m)</td>
                  <td className="text-right py-1.5 px-3">{start.loadAvg[0].toFixed(2)}</td>
                  <td className="text-right py-1.5 px-3">{end.loadAvg[0].toFixed(2)}</td>
                </tr>
                <tr className="border-t">
                  <td className="py-1.5 px-3 font-medium">Free Memory</td>
                  <td className="text-right py-1.5 px-3">{formatMB(start.freeMemory)}</td>
                  <td className="text-right py-1.5 px-3">{formatMB(end.freeMemory)}</td>
                </tr>
                {start.memoryPressurePct != null && end.memoryPressurePct != null && (
                  <tr className="border-t">
                    <td className="py-1.5 px-3 font-medium">Memory Pressure</td>
                    <td className="text-right py-1.5 px-3">{start.memoryPressurePct}%</td>
                    <td className="text-right py-1.5 px-3">{end.memoryPressurePct}%</td>
                  </tr>
                )}
                {(start.thermalState || end.thermalState) && (
                  <tr className="border-t">
                    <td className="py-1.5 px-3 font-medium">Thermal State</td>
                    <td className="text-right py-1.5 px-3">{start.thermalState ?? '—'}</td>
                    <td className="text-right py-1.5 px-3">{end.thermalState ?? '—'}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Top processes */}
        {primary.topProcesses && primary.topProcesses.length > 0 && (
          <div>
            <p className="text-[11px] text-muted-foreground font-medium mb-1">Top Processes (at start)</p>
            <div className="flex flex-wrap gap-1.5">
              {primary.topProcesses.map((p, i) => (
                <span key={i} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border bg-muted/30">
                  <span className="font-medium">{p.command}</span>
                  <span className="text-muted-foreground">{p.cpu.toFixed(1)}%</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </DetailSection>
  );
}

function DetailSection({
  title,
  defaultOpen = false,
  count,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  count?: string;
  children: React.ReactNode;
}) {
  return (
    <details open={defaultOpen || undefined} className="group">
      <summary className="flex items-center gap-2 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden">
        <span className="text-muted-foreground text-[11px] transition-transform group-open:rotate-90">
          &#9656;
        </span>
        <h3 className="text-xs font-medium text-muted-foreground">{title}</h3>
        {count && <span className="text-[10px] text-muted-foreground/60">{count}</span>}
      </summary>
      <div className="mt-2">{children}</div>
    </details>
  );
}

function ProcessBreakdown({ processesJson }: { processesJson: string }) {
  let processes: { pid: number; type: string; cpu: number; memory: number; name?: string }[];
  try {
    processes = JSON.parse(processesJson);
  } catch {
    return <p className="text-xs text-destructive">Invalid process data</p>;
  }
  if (processes.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-muted/50 text-muted-foreground">
            <th className="text-left py-1.5 px-3 font-medium">PID</th>
            <th className="text-left py-1.5 px-3 font-medium">Type</th>
            <th className="text-right py-1.5 px-3 font-medium">CPU %</th>
            <th className="text-right py-1.5 px-3 font-medium">Memory</th>
          </tr>
        </thead>
        <tbody>
          {processes
            .sort((a, b) => b.cpu - a.cpu)
            .map((p) => (
              <tr key={p.pid} className="border-t">
                <td className="py-1.5 px-3 font-mono text-[11px]">{p.pid}</td>
                <td className="py-1.5 px-3">{p.type}</td>
                <td className="text-right py-1.5 px-3">{p.cpu.toFixed(1)}%</td>
                <td className="text-right py-1.5 px-3">{formatMB(p.memory)}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === 'completed' ? 'outline' : status === 'failed' ? 'destructive' : 'default';
  return (
    <Badge variant={variant} className="text-[10px] h-5">
      {status}
    </Badge>
  );
}

function ComparisonStatBox({
  label,
  value,
  prevValue,
  delta,
  lowerIsBetter,
}: {
  label: string;
  value: string;
  prevValue?: string;
  delta: number | null;
  lowerIsBetter: boolean;
}) {
  return (
    <div className="p-3 rounded-md border bg-muted/30">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="flex items-baseline gap-1.5 mt-0.5">
        <p className="text-lg font-semibold">{value}</p>
        {delta != null && Math.abs(delta) >= 1 && (
          <DeltaBadge delta={delta} lowerIsBetter={lowerIsBetter} />
        )}
      </div>
      {prevValue && <p className="text-[10px] text-muted-foreground mt-0.5">prev: {prevValue}</p>}
    </div>
  );
}

interface PercentileStats {
  min: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
  max: number;
}

function PercentileRow({
  label,
  stats,
  format,
}: {
  label: string;
  stats: PercentileStats;
  format: (v: number) => string;
}) {
  return (
    <tr className="border-t">
      <td className="py-1.5 px-3 font-medium">{label}</td>
      <td className="text-right py-1.5 px-3">{format(stats.min)}</td>
      <td className="text-right py-1.5 px-3">{format(stats.avg)}</td>
      <td className="text-right py-1.5 px-3">{format(stats.p50)}</td>
      <td className="text-right py-1.5 px-3">{format(stats.p95)}</td>
      <td className="text-right py-1.5 px-3">{format(stats.p99)}</td>
      <td className="text-right py-1.5 px-3">{format(stats.max)}</td>
    </tr>
  );
}

function ComparisonRow({
  label,
  current,
  previous,
  format,
  lowerIsBetter,
}: {
  label: string;
  current: number;
  previous: number;
  format: (v: number) => string;
  lowerIsBetter: boolean;
}) {
  const delta = pctChange(current, previous);
  return (
    <tr className="border-t">
      <td className="py-1.5 px-3 font-medium">{label}</td>
      <td className="text-right py-1.5 px-3">{format(current)}</td>
      <td className="text-right py-1.5 px-3 text-muted-foreground">{format(previous)}</td>
      <td className="text-right py-1.5 px-3">
        {delta != null && <DeltaBadge delta={delta} lowerIsBetter={lowerIsBetter} />}
      </td>
    </tr>
  );
}

// Phase colors — distinct hues that work in both light and dark mode
const PHASE_COLORS = [
  {
    bg: 'oklch(0.65 0.15 250)',
    bgFaded: 'oklch(0.65 0.15 250 / 0.15)',
    label: 'oklch(0.45 0.15 250)',
  },
  {
    bg: 'oklch(0.65 0.15 160)',
    bgFaded: 'oklch(0.65 0.15 160 / 0.15)',
    label: 'oklch(0.45 0.15 160)',
  },
  {
    bg: 'oklch(0.65 0.15 60)',
    bgFaded: 'oklch(0.65 0.15 60 / 0.15)',
    label: 'oklch(0.45 0.15 60)',
  },
  {
    bg: 'oklch(0.65 0.15 310)',
    bgFaded: 'oklch(0.65 0.15 310 / 0.15)',
    label: 'oklch(0.45 0.15 310)',
  },
  {
    bg: 'oklch(0.65 0.15 30)',
    bgFaded: 'oklch(0.65 0.15 30 / 0.15)',
    label: 'oklch(0.45 0.15 30)',
  },
  {
    bg: 'oklch(0.65 0.15 200)',
    bgFaded: 'oklch(0.65 0.15 200 / 0.15)',
    label: 'oklch(0.45 0.15 200)',
  },
];

interface Phase {
  from: string;
  to: string;
  duration: number;
  pct: number;
}

function buildPhases(
  markers: Marker[],
  runStart: number
): { phases: Phase[]; totalDuration: number } {
  const sorted = [...markers].sort((a, b) => a.timestamp - b.timestamp);
  const totalDuration = sorted[sorted.length - 1].timestamp - runStart;
  const phases = sorted.map((m, i) => {
    const fromLabel = i === 0 ? 'start' : sorted[i - 1].name;
    const fromTs = i === 0 ? runStart : sorted[i - 1].timestamp;
    const duration = m.timestamp - fromTs;
    return {
      from: fromLabel,
      to: m.name,
      duration,
      pct: totalDuration > 0 ? (duration / totalDuration) * 100 : 0,
    };
  });
  return { phases, totalDuration };
}

function TimelineSection({ markers, runStart }: { markers: Marker[]; runStart: number }) {
  const [view, setView] = useState<'visual' | 'waterfall'>('visual');

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <h3 className="text-xs font-medium text-muted-foreground flex-1">Timeline</h3>
        <div className="flex rounded-md border text-[10px] overflow-hidden">
          <button
            className={`px-2 py-0.5 transition-colors ${view === 'visual' ? 'bg-primary/10 font-medium' : 'hover:bg-muted/50 text-muted-foreground'}`}
            onClick={() => setView('visual')}
          >
            Visual
          </button>
          <button
            className={`px-2 py-0.5 transition-colors border-l ${view === 'waterfall' ? 'bg-primary/10 font-medium' : 'hover:bg-muted/50 text-muted-foreground'}`}
            onClick={() => setView('waterfall')}
          >
            Waterfall
          </button>
        </div>
      </div>
      {view === 'visual' ? (
        <InteractiveTimeline markers={markers} runStart={runStart} />
      ) : (
        <WaterfallTimeline markers={markers} runStart={runStart} />
      )}
    </div>
  );
}

function InteractiveTimeline({ markers, runStart }: { markers: Marker[]; runStart: number }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const { phases, totalDuration } = buildPhases(markers, runStart);
  if (phases.length === 0) return null;

  const maxDuration = Math.max(...phases.map((p) => p.duration));

  return (
    <div className="space-y-1">
      {/* Segmented bar */}
      <div className="flex h-10 rounded-md overflow-hidden border">
        {phases.map((phase, i) => {
          const color = PHASE_COLORS[i % PHASE_COLORS.length];
          const isHovered = hovered === i;
          const isSlowest = phases.length > 1 && phase.duration === maxDuration;
          const isDimmed = hovered !== null && !isHovered;

          return (
            <div
              key={i}
              className="relative flex items-center justify-center transition-all duration-150 cursor-default"
              style={{
                width: `${Math.max(phase.pct, 2)}%`,
                backgroundColor: isHovered ? color.bg : color.bgFaded,
                opacity: isDimmed ? 0.4 : 1,
                borderRight: i < phases.length - 1 ? '1px solid oklch(0.5 0 0 / 0.1)' : undefined,
              }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              {/* Phase content — show if wide enough */}
              {phase.pct > 12 && (
                <div className="flex flex-col items-center gap-0 overflow-hidden px-1">
                  <span
                    className="text-[10px] font-medium truncate max-w-full"
                    style={{ color: color.label }}
                  >
                    {phase.to}
                  </span>
                  <span className="text-[9px] font-mono text-muted-foreground">
                    {formatDuration(phase.duration)}
                  </span>
                </div>
              )}

              {/* Slowest indicator */}
              {isSlowest && phases.length > 1 && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-[2px]"
                  style={{ backgroundColor: color.bg }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Hover detail card */}
      {hovered !== null && (
        <div
          className="flex items-center gap-3 px-3 py-1.5 rounded-md border text-xs transition-all duration-150"
          style={{ borderColor: PHASE_COLORS[hovered % PHASE_COLORS.length].bg + '40' }}
        >
          <div
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: PHASE_COLORS[hovered % PHASE_COLORS.length].bg }}
          />
          <span className="text-muted-foreground">{phases[hovered].from}</span>
          <span className="text-muted-foreground/40">&rarr;</span>
          <span className="font-medium">{phases[hovered].to}</span>
          <span className="font-mono">{formatDuration(phases[hovered].duration)}</span>
          <span className="text-muted-foreground/60">
            {phases[hovered].pct.toFixed(0)}% of total
          </span>
          {phases.length > 1 && phases[hovered].duration === maxDuration && (
            <span className="text-[10px] px-1.5 py-0 rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
              slowest
            </span>
          )}
        </div>
      )}

      {/* Milestone labels + total */}
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>start</span>
        <span className="font-mono font-medium">{formatDuration(totalDuration)} total</span>
      </div>
    </div>
  );
}

function WaterfallTimeline({ markers, runStart }: { markers: Marker[]; runStart: number }) {
  const { phases, totalDuration } = buildPhases(markers, runStart);
  if (phases.length === 0) return null;

  const maxDuration = Math.max(...phases.map((p) => p.duration));

  return (
    <div className="space-y-2">
      {phases.map((phase, i) => {
        const isSlowest = phases.length > 1 && phase.duration === maxDuration;
        const barPct = maxDuration > 0 ? (phase.duration / maxDuration) * 100 : 0;
        const color = PHASE_COLORS[i % PHASE_COLORS.length];
        return (
          <div key={i} className="space-y-0.5">
            {/* Label row */}
            <div className="flex items-center gap-1.5 text-xs">
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: color.bg }}
              />
              <span className="text-muted-foreground">{phase.from}</span>
              <span className="text-muted-foreground/40">&rarr;</span>
              <span className={isSlowest ? 'font-medium' : ''}>{phase.to}</span>
              <span
                className={`font-mono text-[11px] ml-auto ${isSlowest ? 'font-medium' : 'text-muted-foreground'}`}
              >
                {formatDuration(phase.duration)}
              </span>
              <span className="text-[10px] text-muted-foreground/50 w-[32px] text-right">
                {phase.pct.toFixed(0)}%
              </span>
            </div>
            {/* Bar */}
            <div className="flex-1 h-2 bg-muted/30 rounded-sm overflow-hidden ml-[18px]">
              <div
                className="h-full rounded-sm"
                style={{
                  width: `${Math.max(barPct, 1)}%`,
                  backgroundColor: isSlowest ? color.bg + '60' : color.bg + '30',
                }}
              />
            </div>
          </div>
        );
      })}
      {phases.length >= 2 && (
        <div className="flex items-center gap-1.5 text-xs border-t border-border/50 pt-1.5 mt-1 ml-[18px]">
          <span className="text-muted-foreground">total</span>
          <span className="font-mono text-[11px] font-medium ml-auto">
            {formatDuration(totalDuration)}
          </span>
        </div>
      )}
    </div>
  );
}

function SampleTable({ snapshots, runStart }: { snapshots: MetricSnapshot[]; runStart: number }) {
  return (
    <div className="overflow-x-auto max-h-64 overflow-y-auto">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-background">
          <tr className="border-b text-muted-foreground">
            <th className="text-left py-1.5 px-2">#</th>
            <th className="text-right py-1.5 px-2">Offset</th>
            <th className="text-right py-1.5 px-2">CPU %</th>
            <th className="text-right py-1.5 px-2">Memory</th>
            <th className="text-right py-1.5 px-2">GPU</th>
            <th className="text-right py-1.5 px-2">Processes</th>
          </tr>
        </thead>
        <tbody>
          {snapshots.map((s, i) => (
            <tr key={s.id} className="border-b border-border/50">
              <td className="py-1 px-2 text-muted-foreground">{i + 1}</td>
              <td className="text-right py-1 px-2">
                +{((s.timestamp - runStart) / 1000).toFixed(1)}s
              </td>
              <td className="text-right py-1 px-2">{s.cpuTotal.toFixed(1)}%</td>
              <td className="text-right py-1 px-2">{formatMB(s.memoryRss)}</td>
              <td className="text-right py-1 px-2">
                {s.gpuMemory != null ? formatMB(s.gpuMemory) : '—'}
              </td>
              <td className="text-right py-1 px-2">{s.processCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Charts ───────────────────────────────────────────────────────

function percentile(sorted: number[], p: number): number {
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function SingleMetricChart({
  snapshots,
  markers,
  dataKey,
  extractValue,
  color,
  label,
  formatY,
}: {
  snapshots: MetricSnapshot[];
  markers: Marker[];
  dataKey: string;
  extractValue: (s: MetricSnapshot) => number;
  color: string;
  label: string;
  formatY: (v: number) => string;
}) {
  const config: ChartConfig = {
    [dataKey]: { label, color },
  };

  const data = snapshots.map((s) => ({
    time: s.timestamp,
    [dataKey]: extractValue(s),
  }));
  if (data.length === 0) return null;
  const minTime = data[0].time;

  return (
    <ChartContainer config={config} className="h-48 w-full">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey="time"
          type="number"
          domain={['dataMin', 'dataMax']}
          tickFormatter={(v) => `+${((v - minTime) / 1000).toFixed(0)}s`}
          className="text-xs"
        />
        <YAxis tickFormatter={formatY} className="text-xs" />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line
          type="monotone"
          dataKey={dataKey}
          stroke={`var(--color-${dataKey})`}
          strokeWidth={1.5}
          dot={false}
          name={label}
        />
        {markers.map((m, i) => (
          <ReferenceLine
            key={i}
            x={m.timestamp}
            stroke="oklch(0.7 0.15 60)"
            strokeDasharray="4 4"
            label={{
              value: m.name,
              position: 'top',
              className: 'text-[9px] fill-muted-foreground',
            }}
          />
        ))}
      </LineChart>
    </ChartContainer>
  );
}

function ScenarioTrendChart({
  summaries,
  currentRunId,
  label,
  extractValue,
  formatY,
  color,
}: {
  summaries: RunSummary[];
  currentRunId: string;
  label: string;
  extractValue: (s: RunSummary) => number;
  formatY: (v: number) => string;
  color: string;
}) {
  const config: ChartConfig = {
    value: { label, color },
  };

  const data = summaries.map((s, i) => ({
    index: i + 1,
    value: extractValue(s),
    id: s.id,
    commit: s.commit_hash?.slice(0, 7) ?? `#${i + 1}`,
  }));

  if (data.length === 0) return null;

  const avg = data.reduce((sum, d) => sum + d.value, 0) / data.length;

  return (
    <ChartContainer config={config} className="h-36 w-full">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="commit" className="text-xs" />
        <YAxis tickFormatter={formatY} className="text-xs" />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ReferenceLine
          y={avg}
          stroke="oklch(0.5 0 0)"
          strokeDasharray="4 4"
          label={{
            value: `avg: ${formatY(avg)}`,
            position: 'right',
            className: 'text-[9px] fill-muted-foreground',
          }}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={`var(--color-value)`}
          strokeWidth={1.5}
          dot={(props: Record<string, unknown>) => {
            const { cx, cy, payload } = props as {
              cx: number;
              cy: number;
              payload: { id: string };
            };
            const isCurrent = payload.id === currentRunId;
            return (
              <circle
                key={String(payload.id)}
                cx={cx}
                cy={cy}
                r={isCurrent ? 5 : 2.5}
                fill={isCurrent ? 'oklch(0.55 0.25 260)' : color}
                stroke={isCurrent ? 'white' : 'none'}
                strokeWidth={isCurrent ? 2 : 0}
              />
            );
          }}
          name={label}
        />
      </LineChart>
    </ChartContainer>
  );
}
