/**
 * Regression detection — compares metric distributions between two versions.
 */

export interface RegressionResult {
  metric: 'cpu' | 'memory' | 'gpu';
  severity: 'none' | 'warning' | 'critical';
  deltaPercent: number;
  baselineAvg: number;
  currentAvg: number;
  baselineP95: number;
  currentP95: number;
}

function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function p95(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length * 0.95)] ?? sorted[sorted.length - 1] ?? 0;
}

export function detectRegression(
  baselineValues: number[],
  currentValues: number[],
  metric: 'cpu' | 'memory' | 'gpu',
  thresholds = { warning: 10, critical: 25 }
): RegressionResult {
  const baselineAvg = avg(baselineValues);
  const currentAvg = avg(currentValues);
  const deltaPercent = baselineAvg > 0 ? ((currentAvg - baselineAvg) / baselineAvg) * 100 : 0;

  let severity: RegressionResult['severity'] = 'none';
  if (deltaPercent >= thresholds.critical) severity = 'critical';
  else if (deltaPercent >= thresholds.warning) severity = 'warning';

  return {
    metric,
    severity,
    deltaPercent: Math.round(deltaPercent * 10) / 10,
    baselineAvg: Math.round(baselineAvg),
    currentAvg: Math.round(currentAvg),
    baselineP95: p95(baselineValues),
    currentP95: p95(currentValues),
  };
}
