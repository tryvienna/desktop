/**
 * ChartBlock — Renders data visualizations from JSON configuration
 *
 * @ai-context
 * - Parses JSON chart config with type, data, series, xKey, title
 * - Supports 4 chart types: bar, line, area, pie
 * - Auto-detects numeric data series from first data row
 * - Default color palette (6 oklch colors)
 * - Uses ChartContainer, ChartTooltip, ChartLegend from './chart'
 * - Used by Markdown component for ```chart fenced code blocks
 * - data-slot="chart-block"
 *
 * @example JSON format:
 * {
 *   "type": "bar",
 *   "title": "Monthly Revenue",
 *   "xKey": "month",
 *   "data": [
 *     { "month": "Jan", "revenue": 100, "costs": 80 }
 *   ]
 * }
 */
import * as React from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  Cell,
  CartesianGrid,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from './chart';
import type { ChartConfig } from './chart';

export interface ChartBlockSeries {
  key: string;
  label?: string;
  color?: string;
}

export interface ChartBlockData {
  type: 'bar' | 'line' | 'area' | 'pie';
  title?: string;
  data: Record<string, unknown>[];
  series?: ChartBlockSeries[];
  xKey?: string;
}

export interface ChartBlockProps {
  json: string;
  className?: string;
}

const DEFAULT_COLORS = [
  'oklch(0.65 0.15 250)',
  'oklch(0.65 0.15 150)',
  'oklch(0.65 0.15 30)',
  'oklch(0.65 0.15 330)',
  'oklch(0.65 0.15 200)',
  'oklch(0.65 0.15 80)',
];

function parseChartData(json: string): ChartBlockData | null {
  try {
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.data)) return null;
    if (!['bar', 'line', 'area', 'pie'].includes(parsed.type)) return null;
    return parsed as ChartBlockData;
  } catch {
    return null;
  }
}

function buildConfig(data: ChartBlockData): ChartConfig {
  const config: ChartConfig = {};
  if (data.series) {
    for (const [i, s] of data.series.entries()) {
      config[s.key] = {
        label: s.label ?? s.key,
        color: s.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length],
      };
    }
  } else {
    const firstRow = data.data[0];
    if (firstRow) {
      const xKey = data.xKey ?? 'label';
      let colorIdx = 0;
      for (const key of Object.keys(firstRow)) {
        if (key !== xKey && typeof firstRow[key] === 'number') {
          config[key] = {
            label: key,
            color: DEFAULT_COLORS[colorIdx++ % DEFAULT_COLORS.length],
          };
        }
      }
    }
  }
  return config;
}

function getSeriesKeys(data: ChartBlockData, config: ChartConfig): string[] {
  if (data.series) return data.series.map((s) => s.key);
  return Object.keys(config);
}

function ChartBlock({ json, className }: ChartBlockProps) {
  const parsed = React.useMemo(() => parseChartData(json), [json]);

  if (!parsed) {
    return (
      <div data-slot="chart-block" className={`vienna-md-fallback ${className ?? ''}`}>
        <pre>
          <code>{json}</code>
        </pre>
        <span className="vienna-md-fallback-msg">Invalid chart JSON</span>
      </div>
    );
  }

  const config = React.useMemo(() => buildConfig(parsed), [parsed]);
  const seriesKeys = React.useMemo(() => getSeriesKeys(parsed, config), [parsed, config]);
  const xKey = parsed.xKey ?? 'label';

  return (
    <div data-slot="chart-block" className={`vienna-md-chart ${className ?? ''}`}>
      {parsed.title && <div className="vienna-md-chart-title">{parsed.title}</div>}
      <ChartContainer config={config}>
        {parsed.type === 'bar' ? (
          <BarChart data={parsed.data} accessibilityLayer>
            <CartesianGrid vertical={false} />
            <XAxis dataKey={xKey} tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            {seriesKeys.map((key) => (
              <Bar key={key} dataKey={key} fill={`var(--color-${key})`} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        ) : parsed.type === 'line' ? (
          <LineChart data={parsed.data} accessibilityLayer>
            <CartesianGrid vertical={false} />
            <XAxis dataKey={xKey} tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            {seriesKeys.map((key) => (
              <Line
                key={key}
                dataKey={key}
                stroke={`var(--color-${key})`}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </LineChart>
        ) : parsed.type === 'area' ? (
          <AreaChart data={parsed.data} accessibilityLayer>
            <CartesianGrid vertical={false} />
            <XAxis dataKey={xKey} tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            {seriesKeys.map((key) => (
              <Area
                key={key}
                dataKey={key}
                fill={`var(--color-${key})`}
                stroke={`var(--color-${key})`}
                fillOpacity={0.3}
              />
            ))}
          </AreaChart>
        ) : (
          <PieChart accessibilityLayer>
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Pie
              data={parsed.data}
              dataKey={seriesKeys[0] ?? 'value'}
              nameKey={xKey}
              cx="50%"
              cy="50%"
              innerRadius="40%"
              outerRadius="80%"
            >
              {parsed.data.map((_, i) => (
                <Cell key={i} fill={DEFAULT_COLORS[i % DEFAULT_COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        )}
      </ChartContainer>
    </div>
  );
}

export { ChartBlock };
