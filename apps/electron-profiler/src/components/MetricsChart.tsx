import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine } from 'recharts';
import type { MetricSnapshot, Version } from '../api/types';

const MAX_CHART_POINTS = 500;

/** Downsample to at most maxPoints, preserving peaks via max-value bucket selection. */
function downsample<T>(arr: T[], maxPoints: number, getValue: (d: T) => number): T[] {
  if (arr.length <= maxPoints) return arr;
  const bucketSize = arr.length / maxPoints;
  const result: T[] = [arr[0]];
  for (let i = 1; i < maxPoints - 1; i++) {
    const start = Math.floor(i * bucketSize);
    const end = Math.min(Math.floor((i + 1) * bucketSize), arr.length);
    let maxVal = -Infinity;
    let maxIdx = start;
    for (let j = start; j < end; j++) {
      const v = getValue(arr[j]);
      if (v > maxVal) {
        maxVal = v;
        maxIdx = j;
      }
    }
    result.push(arr[maxIdx]);
  }
  result.push(arr[arr.length - 1]);
  return result;
}

interface Props {
  snapshots: MetricSnapshot[];
  versions?: Version[];
  metric: 'cpu' | 'memory' | 'gpu';
}

const chartConfig: ChartConfig = {
  cpu: { label: 'CPU %', color: 'oklch(0.65 0.2 250)' },
  memory: { label: 'Memory (MB)', color: 'oklch(0.65 0.18 160)' },
  gpu: { label: 'GPU Memory (MB)', color: 'oklch(0.65 0.18 30)' },
};

export function MetricsChart({ snapshots, versions, metric }: Props) {
  const extractValue = (s: MetricSnapshot) =>
    metric === 'cpu' ? s.cpuTotal : metric === 'memory' ? s.memoryRss : (s.gpuMemory ?? 0);
  const sampled = downsample(snapshots, MAX_CHART_POINTS, extractValue);
  const data = sampled.map((s) => ({
    time: s.timestamp,
    cpu: s.cpuTotal,
    memory: s.memoryRss / 1024 / 1024,
    gpu: s.gpuMemory != null ? s.gpuMemory / 1024 / 1024 : null,
    versionId: s.versionId,
  }));

  const dataKey = metric;
  const config = chartConfig[metric];

  // Build version reference lines from version boundaries
  const versionLines: { x: number; label: string }[] = [];
  if (versions && versions.length > 0) {
    const versionMap = new Map(versions.map((v) => [v.id, v]));
    let lastVersionId: string | null = null;
    for (const d of data) {
      if (d.versionId && d.versionId !== lastVersionId) {
        const v = versionMap.get(d.versionId);
        if (v) {
          versionLines.push({ x: d.time, label: v.version });
        }
        lastVersionId = d.versionId;
      }
    }
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
        No data for this metric
      </div>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="h-64 w-full">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey="time"
          type="number"
          domain={['dataMin', 'dataMax']}
          tickFormatter={(v) =>
            new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
          className="text-xs"
        />
        <YAxis className="text-xs" />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line
          type="monotone"
          dataKey={dataKey}
          stroke={`var(--color-${dataKey})`}
          strokeWidth={1.5}
          dot={false}
          name={String(config.label)}
        />
        {versionLines.map((vl, i) => (
          <ReferenceLine
            key={i}
            x={vl.x}
            stroke="oklch(0.7 0.15 60)"
            strokeDasharray="4 4"
            label={{
              value: vl.label,
              position: 'top',
              className: 'text-[10px] fill-muted-foreground',
            }}
          />
        ))}
      </LineChart>
    </ChartContainer>
  );
}
