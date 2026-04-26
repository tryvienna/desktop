/**
 * Shared types for the Profiler SDK.
 */

/** Per-process metrics as returned by app.getAppMetrics() */
export interface ProcessMetric {
  pid: number;
  type: string;
  name?: string;
  cpu: number;
  memory: number; // bytes
}

/** Metric snapshot pushed to the profiler harness */
export interface MetricSnapshot {
  appName: string;
  appVersion: string;
  branch?: string;
  commitHash: string;
  commitMessage?: string;
  appDirectory: string;
  electronVersion?: string;
  timestamp: number;
  cpuTotal: number;
  memoryRss: number; // bytes
  memoryHeap: number | null; // bytes (main process V8 heap)
  gpuMemory: number | null; // bytes (GPU process)
  processCount: number;
  processes: ProcessMetric[];
  runId?: string; // profiling run ID (set during test scenarios)
}

/** Host machine state captured at run start/end for environment confidence scoring */
export interface HostSnapshot {
  timestamp: number;
  phase: 'start' | 'end';
  // Node.js built-in (< 1ms)
  loadAvg: [number, number, number];
  cpuCores: number;
  cpuModel: string;
  totalMemory: number; // bytes
  freeMemory: number; // bytes
  platform: string;
  arch: string;
  osRelease: string;
  // macOS-specific (~30ms, null on other platforms)
  powerSource: 'ac' | 'battery' | null;
  batteryPercent: number | null;
  memoryPressurePct: number | null;
  thermalState: 'nominal' | 'fair' | 'serious' | 'critical' | null;
  topProcesses: Array<{ pid: number; cpu: number; command: string }> | null;
}

/** Options for creating a profiler client */
export interface ProfilerClientOptions {
  /** Profiler backend URL. Default: http://localhost:3100 */
  serverUrl?: string;
  /** Collection interval in ms. Default: 5000 */
  interval?: number;
  /** App name (defaults to app.getName()) */
  appName?: string;
  /** App version (defaults to app.getVersion()) */
  appVersion?: string;
  /** Git commit hash */
  commitHash?: string;
  /** Git branch name */
  branch?: string;
  /** App directory for git ops on the server side */
  appDirectory?: string;
}
