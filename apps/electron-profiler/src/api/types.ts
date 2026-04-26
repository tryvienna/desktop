// ── App ──────────────────────────────────────────────────────
export interface App {
  id: string;
  name: string;
  directory: string;
  git_remote: string | null;
  package_name: string | null;
  created_at: number;
  updated_at: number;
}

export interface AppWithStats extends App {
  latestMetric: {
    timestamp: number;
    cpuTotal: number;
    memoryRss: number;
    gpuMemory: number | null;
    processCount: number;
  } | null;
  sampleCount: number;
}

// ── Version ──────────────────────────────────────────────────
export interface Version {
  id: string;
  app_id: string;
  version: string;
  commit_hash: string;
  commit_message: string | null;
  commit_date: number | null;
  tag: string | null;
  created_at: number;
}

// ── Metric Snapshot ──────────────────────────────────────────
export interface MetricSnapshot {
  id: number;
  timestamp: number;
  versionId: string | null;
  cpuTotal: number;
  memoryRss: number;
  memoryHeap: number | null;
  gpuMemory: number | null;
  processCount: number;
  processesJson: string | null;
}

// ── Version Summary ──────────────────────────────────────────
export interface VersionSummary {
  version_id: string;
  version: string;
  commit_hash: string;
  sample_count: number;
  avg_cpu: number;
  max_cpu: number;
  avg_memory: number;
  max_memory: number;
  avg_gpu: number | null;
  max_gpu: number | null;
  first_seen: number;
  last_seen: number;
}

// ── Regression ───────────────────────────────────────────────
export interface Regression {
  metric: string;
  severity: 'none' | 'warning' | 'critical';
  baselineAvg: number;
  currentAvg: number;
  changePercent: number;
  baselineP95: number;
  currentP95: number;
}

export interface VersionComparison {
  versionA: Version & { sampleCount: number };
  versionB: Version & { sampleCount: number };
  regressions: Regression[];
}

// ── Changelog ────────────────────────────────────────────────
export interface CommitEntry {
  hash: string;
  shortHash: string;
  subject: string;
  author: string;
  date: string;
}

export interface Changelog {
  commits: CommitEntry[];
  diffStat: string | null;
  cached: boolean;
}

// ── Scan Result ──────────────────────────────────────────────
export interface ScanResult {
  scanned: number;
  created: number;
  tags: string[];
}

// ── Profiling Runs ──────────────────────────────────────────
export interface Marker {
  name: string;
  timestamp: number;
}

export interface Kpi {
  name: string;
  value: number;
  unit?: string;
}

export interface HostSnapshot {
  timestamp: number;
  phase: 'start' | 'end';
  loadAvg: [number, number, number];
  cpuCores: number;
  cpuModel: string;
  totalMemory: number;
  freeMemory: number;
  platform: string;
  arch: string;
  osRelease: string;
  powerSource: 'ac' | 'battery' | null;
  batteryPercent: number | null;
  memoryPressurePct: number | null;
  thermalState: 'nominal' | 'fair' | 'serious' | 'critical' | null;
  topProcesses: Array<{ pid: number; cpu: number; command: string }> | null;
}

export interface ProfilingRun {
  id: string;
  app_id: string;
  version_id: string | null;
  name: string;
  status: 'running' | 'completed' | 'failed';
  started_at: number;
  stopped_at: number | null;
  sample_count: number;
  metadata_json: string | null;
  markers_json: string | null;
  kpis_json: string | null;
  host_snapshots_json: string | null;
  environment_confidence: number | null;
}

export interface RecentRun extends ProfilingRun {
  app_name: string;
}

export type SparklineData = Record<string, { timestamp: number; cpu: number; memory: number }[]>;

export interface RunSummary {
  id: string;
  name: string;
  status: string;
  started_at: number;
  stopped_at: number | null;
  sample_count: number;
  avg_cpu: number;
  max_cpu: number;
  avg_memory: number;
  max_memory: number;
  avg_gpu: number | null;
  markers: Marker[];
  kpis: Kpi[];
  version_id: string | null;
  commit_hash: string | null;
  commit_message: string | null;
  app_version: string | null;
  environment_confidence: number | null;
  host_snapshots: HostSnapshot[] | null;
}
