/**
 * Environment confidence scoring — rates how "clean" the host machine was during a profiling run.
 *
 * Returns 0-100 where 100 = ideal quiet environment, lower = noisy/unreliable.
 * Computed from host snapshots captured at run start and end.
 */

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

export function computeEnvironmentConfidence(snapshots: HostSnapshot[]): number {
  if (snapshots.length === 0) return 100;

  const start = snapshots.find((s) => s.phase === 'start');
  const end = snapshots.find((s) => s.phase === 'end');
  const primary = end ?? start;
  if (!primary) return 100;

  let score = 100;

  // Factor 1: System CPU load (weight: 30 points)
  // loadAvg[0] / cpuCores gives normalized load. >1.0 means overloaded.
  if (primary.loadAvg && primary.cpuCores > 0) {
    const normalizedLoad = primary.loadAvg[0] / primary.cpuCores;
    if (normalizedLoad > 2.0) score -= 30;
    else if (normalizedLoad > 1.5) score -= 20;
    else if (normalizedLoad > 1.0) score -= 10;
    else if (normalizedLoad > 0.7) score -= 5;
  }

  // Factor 2: Memory pressure (weight: 20 points)
  if (primary.memoryPressurePct != null) {
    const freePercent = primary.memoryPressurePct;
    if (freePercent < 10) score -= 20;
    else if (freePercent < 25) score -= 12;
    else if (freePercent < 40) score -= 5;
  } else if (primary.totalMemory > 0) {
    // Fallback: use Node.js freemem ratio
    const freePercent = (primary.freeMemory / primary.totalMemory) * 100;
    if (freePercent < 10) score -= 20;
    else if (freePercent < 20) score -= 12;
    else if (freePercent < 30) score -= 5;
  }

  // Factor 3: Power/thermal state (weight: 20 points)
  if (primary.thermalState === 'critical') score -= 20;
  else if (primary.thermalState === 'serious') score -= 15;
  else if (primary.thermalState === 'fair') score -= 5;

  if (primary.powerSource === 'battery') score -= 5;

  // Factor 4: Competing processes (weight: 15 points)
  if (primary.topProcesses && primary.topProcesses.length > 0) {
    const totalExternalCpu = primary.topProcesses.reduce((s, p) => s + p.cpu, 0);
    if (totalExternalCpu > 200) score -= 15;
    else if (totalExternalCpu > 100) score -= 10;
    else if (totalExternalCpu > 50) score -= 5;
  }

  // Factor 5: Consistency between start and end (weight: 15 points)
  if (start && end && start.cpuCores > 0) {
    const startLoad = start.loadAvg[0] / start.cpuCores;
    const endLoad = end.loadAvg[0] / end.cpuCores;
    const loadDrift = Math.abs(endLoad - startLoad);
    if (loadDrift > 1.0) score -= 15;
    else if (loadDrift > 0.5) score -= 8;
    else if (loadDrift > 0.3) score -= 3;
  }

  return Math.max(0, Math.min(100, score));
}
