/**
 * @vienna/profiler-sdk
 *
 * Lightweight SDK for profiling Electron application resource usage.
 * Zero runtime dependencies — uses global fetch (Node 18+).
 *
 * Usage:
 * ```ts
 * import { ProfilerClient } from '@vienna/profiler-sdk';
 *
 * const profiler = new ProfilerClient({
 *   serverUrl: 'http://localhost:3100',
 *   appDirectory: __dirname,
 * });
 *
 * app.whenReady().then(() => profiler.start());
 * app.on('will-quit', () => profiler.stop());
 * ```
 */

export { ProfilerClient } from "./client";
export type {
  ProfilerClientOptions,
  MetricSnapshot,
  ProcessMetric,
  HostSnapshot,
} from "./types";
