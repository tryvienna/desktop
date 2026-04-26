/**
 * ProfilerClient — collects Electron process metrics and pushes them
 * to the profiler harness over HTTP.
 *
 * Zero runtime dependencies: uses global fetch (Node 18+) or Electron's net.fetch.
 */

import { execSync } from "node:child_process";
import * as os from "node:os";
import { platform } from "node:os";
import type {
  ProfilerClientOptions,
  MetricSnapshot,
  ProcessMetric,
  HostSnapshot,
} from "./types";

const DEFAULT_SERVER_URL = "http://localhost:3100";
const DEFAULT_INTERVAL = 5_000;

export class ProfilerClient {
  private timer: ReturnType<typeof setInterval> | null = null;
  private serverUrl: string;
  private interval: number;
  private baseInterval: number;
  private appName: string;
  private appVersion: string;
  private commitHash: string;
  private commitMessage: string;
  private appDirectory: string;
  private branch: string;
  private resolved = false;
  private runId: string | null = null;

  constructor(opts: ProfilerClientOptions = {}) {
    this.serverUrl = opts.serverUrl ?? DEFAULT_SERVER_URL;
    this.interval = opts.interval ?? DEFAULT_INTERVAL;
    this.baseInterval = this.interval;
    this.appName = opts.appName ?? "";
    this.appVersion = opts.appVersion ?? "";
    this.commitHash =
      opts.commitHash ?? process.env.GIT_COMMIT ?? process.env.GIT_HASH ?? "";
    this.commitMessage = "";
    this.branch = opts.branch ?? "";
    this.appDirectory = opts.appDirectory ?? process.cwd();
  }

  /** Start periodic metric collection. Safe to call multiple times. */
  start(): void {
    if (this.timer) return;
    // Fire immediately, then at interval
    void this.collectAndSend();
    this.timer = setInterval(() => void this.collectAndSend(), this.interval);
  }

  /** Stop metric collection. */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** Tag all subsequent snapshots with a profiling run ID. Optionally override the collection interval. */
  setRunId(id: string, intervalOverride?: number): void {
    this.runId = id;
    // Capture host environment at run start
    this.sendHostSnapshot(this.collectHostSnapshot("start"));
    if (intervalOverride && intervalOverride !== this.interval) {
      this.interval = intervalOverride;
      // Restart timer with new interval if already running
      if (this.timer) {
        clearInterval(this.timer);
        void this.collectAndSend();
        this.timer = setInterval(
          () => void this.collectAndSend(),
          this.interval,
        );
      }
    }
  }

  /** Record a named timestamp marker on the active run. */
  recordMarker(name: string, timestamp?: number): void {
    if (!this.runId) return;
    void globalThis
      .fetch(`${this.serverUrl}/api/runs/${this.runId}/marker`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, timestamp: timestamp ?? Date.now() }),
      })
      .catch(() => {
        // Silently fail — profiling must never crash the host app
      });
  }

  /** Record a named KPI value on the active run. */
  recordKpi(name: string, value: number, unit?: string): void {
    if (!this.runId) return;
    void globalThis
      .fetch(`${this.serverUrl}/api/runs/${this.runId}/kpi`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, value, unit }),
      })
      .catch(() => {
        // Silently fail — profiling must never crash the host app
      });
  }

  /** Clear the profiling run ID and restore the original collection interval. */
  clearRunId(): void {
    // Capture host environment at run end before clearing the run ID
    if (this.runId) {
      this.sendHostSnapshot(this.collectHostSnapshot("end"));
    }
    this.runId = null;
    if (this.interval !== this.baseInterval) {
      this.interval = this.baseInterval;
      // Restart timer with original interval if running
      if (this.timer) {
        clearInterval(this.timer);
        this.timer = setInterval(
          () => void this.collectAndSend(),
          this.interval,
        );
      }
    }
  }

  /** Collect a snapshot of the host machine's state. Synchronous, ~30ms on macOS. */
  private collectHostSnapshot(phase: "start" | "end"): HostSnapshot {
    const cpus = os.cpus();
    const isDarwin = platform() === "darwin";

    const snapshot: HostSnapshot = {
      timestamp: Date.now(),
      phase,
      loadAvg: os.loadavg() as [number, number, number],
      cpuCores: cpus.length,
      cpuModel: cpus[0]?.model ?? "unknown",
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      platform: os.platform(),
      arch: os.arch(),
      osRelease: os.release(),
      powerSource: null,
      batteryPercent: null,
      memoryPressurePct: null,
      thermalState: null,
      topProcesses: null,
    };

    if (!isDarwin) return snapshot;

    // macOS-specific: power source & battery
    try {
      const pmset = execSync("pmset -g batt", {
        timeout: 2_000,
        encoding: "utf-8",
      });
      snapshot.powerSource = pmset.includes("Battery Power")
        ? "battery"
        : "ac";
      const pctMatch = pmset.match(/(\d+)%/);
      if (pctMatch) snapshot.batteryPercent = parseInt(pctMatch[1], 10);
    } catch {
      // pmset not available
    }

    // macOS-specific: memory pressure
    try {
      const mp = execSync("memory_pressure -Q", {
        timeout: 2_000,
        encoding: "utf-8",
      });
      const freeMatch = mp.match(/free percentage:\s*(\d+)%/i);
      if (freeMatch)
        snapshot.memoryPressurePct = parseInt(freeMatch[1], 10);
    } catch {
      // memory_pressure not available
    }

    // macOS-specific: top CPU-consuming processes (excluding self)
    try {
      const selfPid = process.pid;
      const output = execSync(
        "/bin/ps -eo pid,%cpu,comm | sort -k2 -rn | head -12",
        { timeout: 2_000, encoding: "utf-8" },
      );
      const procs: Array<{ pid: number; cpu: number; command: string }> = [];
      for (const line of output.trim().split("\n")) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const match = trimmed.match(/^(\d+)\s+([\d.]+)\s+(.+)$/);
        if (!match) continue;
        const pid = parseInt(match[1], 10);
        const cpu = parseFloat(match[2]);
        const command = match[3].split("/").pop() ?? match[3];
        if (isNaN(pid) || isNaN(cpu)) continue;
        if (pid === selfPid) continue;
        if (cpu < 1) continue; // skip idle processes
        procs.push({ pid, cpu, command });
        if (procs.length >= 5) break;
      }
      if (procs.length > 0) snapshot.topProcesses = procs;
    } catch {
      // ps failed
    }

    // Electron thermal state (if available)
    try {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore — electron may not be available
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports
      const { powerMonitor } = require("electron") as any;
      if (powerMonitor?.getCurrentThermalState) {
        snapshot.thermalState = powerMonitor.getCurrentThermalState();
      }
    } catch {
      // Not in Electron or powerMonitor not available
    }

    return snapshot;
  }

  /** Fire-and-forget: send a host snapshot to the profiler backend. */
  private sendHostSnapshot(snapshot: HostSnapshot): void {
    if (!this.runId) return;
    void globalThis
      .fetch(`${this.serverUrl}/api/runs/${this.runId}/host-snapshot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(snapshot),
      })
      .catch(() => {
        // Silently fail — profiling must never crash the host app
      });
  }

  private async resolveElectronInfo(): Promise<void> {
    if (this.resolved) return;
    try {
      // Dynamic import so the SDK doesn't fail outside Electron
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore — electron may or may not have types depending on consumer
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { app } = (await import("electron")) as any;
      if (!this.appName) this.appName = app.getName();
      if (!this.appVersion) this.appVersion = app.getVersion();
    } catch {
      // Not in Electron — use provided values
    }

    // Resolve git branch from the app directory
    if (!this.branch && this.appDirectory) {
      try {
        this.branch = execSync("git rev-parse --abbrev-ref HEAD", {
          cwd: this.appDirectory,
          timeout: 3_000,
          encoding: "utf-8",
        }).trim();
      } catch {
        // Not a git repo or git not available
      }
    }

    // Resolve git HEAD commit + message from the app directory
    if (!this.commitHash && this.appDirectory) {
      try {
        this.commitHash = execSync("git rev-parse HEAD", {
          cwd: this.appDirectory,
          timeout: 3_000,
          encoding: "utf-8",
        }).trim();
      } catch {
        // Not a git repo or git not available
      }
    }
    if (this.commitHash && !this.commitMessage && this.appDirectory) {
      try {
        this.commitMessage = execSync("git log -1 --format=%s", {
          cwd: this.appDirectory,
          timeout: 3_000,
          encoding: "utf-8",
        }).trim();
      } catch {
        // git not available
      }
    }

    this.resolved = true;
  }

  /** Get OS-level CPU usage for a set of PIDs via `ps`. Returns Map<pid, cpuPercent>. */
  private getOsCpuUsage(pids: number[]): Map<number, number> {
    const result = new Map<number, number>();
    if (pids.length === 0) return result;
    try {
      const isDarwin = platform() === "darwin";
      // Use absolute path — Electron apps often have a restricted PATH
      const ps = isDarwin ? "/bin/ps" : "ps";
      const cmd = isDarwin
        ? `${ps} -p ${pids.join(",")} -o pid=,%cpu=`
        : `${ps} -p ${pids.join(",")} -o pid=,%cpu= --no-headers`;
      const output = execSync(cmd, { timeout: 2_000, encoding: "utf-8" });
      for (const line of output.trim().split("\n")) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const parts = trimmed.split(/\s+/);
        if (parts.length >= 2) {
          const pid = parseInt(parts[0], 10);
          const cpu = parseFloat(parts[1]);
          if (!isNaN(pid) && !isNaN(cpu)) {
            result.set(pid, cpu);
          }
        }
      }
    } catch {
      // ps failed — return empty map, caller falls back to Electron values
    }
    return result;
  }

  private async collectAndSend(): Promise<void> {
    try {
      await this.resolveElectronInfo();

      // Collect metrics from Electron
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore — electron may or may not have types depending on consumer
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { app } = (await import("electron")) as any;
      const metrics: Array<{
        pid: number;
        type: string;
        name?: string;
        cpu?: { percentCPUUsage: number };
        memory?: { workingSetSize: number };
      }> = app.getAppMetrics();

      // Get accurate OS-level CPU readings via ps (Electron's percentCPUUsage underreports)
      const pids = metrics.map((m) => m.pid);
      const osCpu = this.getOsCpuUsage(pids);

      let cpuTotal = 0;
      let memoryRss = 0;
      let memoryHeap: number | null = null;
      let gpuMemory: number | null = null;
      const processes: ProcessMetric[] = [];

      for (const m of metrics) {
        // Prefer OS-level CPU, fall back to Electron's value
        const cpu = osCpu.get(m.pid) ?? m.cpu?.percentCPUUsage ?? 0;
        // workingSetSize is in KB
        const mem = (m.memory?.workingSetSize ?? 0) * 1024;

        cpuTotal += cpu;
        memoryRss += mem;

        if (m.type === "Browser") {
          memoryHeap = mem;
        }
        if (m.type === "GPU") {
          gpuMemory = mem;
        }

        processes.push({
          pid: m.pid,
          type: m.type,
          name: (m as { name?: string }).name,
          cpu,
          memory: mem,
        });
      }

      const snapshot: MetricSnapshot = {
        appName: this.appName,
        appVersion: this.appVersion,
        branch: this.branch || undefined,
        commitHash: this.commitHash,
        commitMessage: this.commitMessage || undefined,
        appDirectory: this.appDirectory,
        timestamp: Date.now(),
        cpuTotal,
        memoryRss,
        memoryHeap,
        gpuMemory,
        processCount: metrics.length,
        processes,
        runId: this.runId || undefined,
      };

      await globalThis.fetch(`${this.serverUrl}/api/metrics/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(snapshot),
      });
    } catch {
      // Silently fail — profiling must never crash the host app
    }
  }
}
