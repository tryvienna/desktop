import type Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import {
  computeEnvironmentConfidence,
  type HostSnapshot,
} from '../services/confidence';

export interface Marker {
  name: string;
  timestamp: number;
}

export interface Kpi {
  name: string;
  value: number;
  unit?: string;
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

export class RunRepository {
  constructor(private db: Database.Database) {}

  create(data: {
    appId: string;
    versionId?: string | null;
    name: string;
    metadata?: Record<string, unknown>;
  }): ProfilingRun {
    const id = randomUUID();
    const now = Date.now();
    this.db
      .prepare(
        `
      INSERT INTO profiling_runs (id, app_id, version_id, name, status, started_at, metadata_json, markers_json, kpis_json)
      VALUES (?, ?, ?, ?, 'running', ?, ?, '[]', '[]')
    `
      )
      .run(
        id,
        data.appId,
        data.versionId ?? null,
        data.name,
        now,
        data.metadata ? JSON.stringify(data.metadata) : null
      );
    return this.findById(id)!;
  }

  stop(id: string): ProfilingRun | undefined {
    const now = Date.now();
    const countRow = this.db
      .prepare('SELECT COUNT(*) as count FROM metric_snapshots WHERE run_id = ?')
      .get(id) as { count: number };

    // Compute environment confidence from host snapshots
    const run = this.findById(id);
    let confidence: number | null = null;
    if (run?.host_snapshots_json) {
      const snapshots: HostSnapshot[] = JSON.parse(run.host_snapshots_json);
      confidence = computeEnvironmentConfidence(snapshots);
    }

    this.db
      .prepare(
        `UPDATE profiling_runs SET status = 'completed', stopped_at = ?, sample_count = ?, environment_confidence = ? WHERE id = ?`
      )
      .run(now, countRow.count, confidence, id);
    return this.findById(id);
  }

  fail(id: string): ProfilingRun | undefined {
    this.db
      .prepare(`UPDATE profiling_runs SET status = 'failed', stopped_at = ? WHERE id = ?`)
      .run(Date.now(), id);
    return this.findById(id);
  }

  addMarker(id: string, marker: Marker): void {
    const run = this.findById(id);
    if (!run) return;
    const markers: Marker[] = run.markers_json ? JSON.parse(run.markers_json) : [];
    markers.push(marker);
    this.db
      .prepare('UPDATE profiling_runs SET markers_json = ? WHERE id = ?')
      .run(JSON.stringify(markers), id);
  }

  addKpi(id: string, kpi: Kpi): void {
    const run = this.findById(id);
    if (!run) return;
    const kpis: Kpi[] = run.kpis_json ? JSON.parse(run.kpis_json) : [];
    // Replace existing KPI with same name, or append
    const idx = kpis.findIndex((k) => k.name === kpi.name);
    if (idx !== -1) {
      kpis[idx] = kpi;
    } else {
      kpis.push(kpi);
    }
    this.db
      .prepare('UPDATE profiling_runs SET kpis_json = ? WHERE id = ?')
      .run(JSON.stringify(kpis), id);
  }

  addHostSnapshot(id: string, snapshot: HostSnapshot): void {
    const run = this.findById(id);
    if (!run) return;
    const snapshots: HostSnapshot[] = run.host_snapshots_json
      ? JSON.parse(run.host_snapshots_json)
      : [];
    snapshots.push(snapshot);
    this.db
      .prepare('UPDATE profiling_runs SET host_snapshots_json = ? WHERE id = ?')
      .run(JSON.stringify(snapshots), id);
  }

  delete(id: string): boolean {
    // metric_snapshots.run_id has ON DELETE SET NULL, so explicitly clean up
    this.db.prepare('DELETE FROM metric_snapshots WHERE run_id = ?').run(id);
    const result = this.db.prepare('DELETE FROM profiling_runs WHERE id = ?').run(id);
    return result.changes > 0;
  }

  findById(id: string): ProfilingRun | undefined {
    return this.db.prepare('SELECT * FROM profiling_runs WHERE id = ?').get(id) as
      | ProfilingRun
      | undefined;
  }

  findByApp(appId: string, opts?: { status?: string; limit?: number }): ProfilingRun[] {
    let sql = 'SELECT * FROM profiling_runs WHERE app_id = ?';
    const params: unknown[] = [appId];
    if (opts?.status) {
      sql += ' AND status = ?';
      params.push(opts.status);
    }
    sql += ' ORDER BY started_at DESC';
    if (opts?.limit) {
      sql += ' LIMIT ?';
      params.push(opts.limit);
    }
    return this.db.prepare(sql).all(...params) as ProfilingRun[];
  }

  /** Get summaries for all runs of an app (for trend analysis). */
  getSummariesByApp(appId: string, scenario?: string): RunSummary[] {
    let sql = `
      SELECT
        r.id,
        r.name,
        r.status,
        r.started_at,
        r.stopped_at,
        r.sample_count,
        r.markers_json,
        r.kpis_json,
        r.host_snapshots_json,
        r.environment_confidence,
        r.version_id,
        v.commit_hash,
        v.commit_message,
        v.version as app_version,
        COALESCE(AVG(m.cpu_total), 0) as avg_cpu,
        COALESCE(MAX(m.cpu_total), 0) as max_cpu,
        COALESCE(AVG(m.memory_rss), 0) as avg_memory,
        COALESCE(MAX(m.memory_rss), 0) as max_memory,
        AVG(m.gpu_memory) as avg_gpu
      FROM profiling_runs r
      LEFT JOIN metric_snapshots m ON m.run_id = r.id
      LEFT JOIN app_versions v ON r.version_id = v.id
      WHERE r.app_id = ? AND r.status = 'completed'
    `;
    const params: unknown[] = [appId];
    if (scenario) {
      sql += ' AND r.name = ?';
      params.push(scenario);
    }
    sql += ' GROUP BY r.id ORDER BY r.started_at ASC';
    const rows = this.db.prepare(sql).all(...params) as Array<
      RunSummary & {
        markers_json: string | null;
        kpis_json: string | null;
        host_snapshots_json: string | null;
      }
    >;
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      status: row.status,
      started_at: row.started_at,
      stopped_at: row.stopped_at,
      sample_count: row.sample_count,
      avg_cpu: row.avg_cpu,
      max_cpu: row.max_cpu,
      avg_memory: row.avg_memory,
      max_memory: row.max_memory,
      avg_gpu: row.avg_gpu,
      markers: row.markers_json ? JSON.parse(row.markers_json) : [],
      kpis: row.kpis_json ? JSON.parse(row.kpis_json) : [],
      version_id: row.version_id,
      commit_hash: row.commit_hash,
      commit_message: row.commit_message,
      app_version: row.app_version,
      environment_confidence: row.environment_confidence ?? null,
      host_snapshots: row.host_snapshots_json ? JSON.parse(row.host_snapshots_json) : null,
    }));
  }

  /** Get recent runs across all apps. */
  findRecent(limit = 10): (ProfilingRun & { app_name: string })[] {
    return this.db
      .prepare(
        `
      SELECT r.*, a.name as app_name
      FROM profiling_runs r
      JOIN electron_apps a ON r.app_id = a.id
      ORDER BY r.started_at DESC
      LIMIT ?
    `
      )
      .all(limit) as (ProfilingRun & { app_name: string })[];
  }

  getSummary(id: string): RunSummary | undefined {
    const row = this.db
      .prepare(
        `
      SELECT
        r.id,
        r.name,
        r.status,
        r.started_at,
        r.stopped_at,
        r.sample_count,
        r.markers_json,
        r.kpis_json,
        r.host_snapshots_json,
        r.environment_confidence,
        r.version_id,
        v.commit_hash,
        v.commit_message,
        v.version as app_version,
        COALESCE(AVG(m.cpu_total), 0) as avg_cpu,
        COALESCE(MAX(m.cpu_total), 0) as max_cpu,
        COALESCE(AVG(m.memory_rss), 0) as avg_memory,
        COALESCE(MAX(m.memory_rss), 0) as max_memory,
        AVG(m.gpu_memory) as avg_gpu
      FROM profiling_runs r
      LEFT JOIN metric_snapshots m ON m.run_id = r.id
      LEFT JOIN app_versions v ON r.version_id = v.id
      WHERE r.id = ?
      GROUP BY r.id
    `
      )
      .get(id) as
      | (RunSummary & {
          markers_json: string | null;
          kpis_json: string | null;
          host_snapshots_json: string | null;
        })
      | undefined;

    if (!row) return undefined;

    return {
      id: row.id,
      name: row.name,
      status: row.status,
      started_at: row.started_at,
      stopped_at: row.stopped_at,
      sample_count: row.sample_count,
      avg_cpu: row.avg_cpu,
      max_cpu: row.max_cpu,
      avg_memory: row.avg_memory,
      max_memory: row.max_memory,
      avg_gpu: row.avg_gpu,
      markers: row.markers_json ? JSON.parse(row.markers_json) : [],
      kpis: row.kpis_json ? JSON.parse(row.kpis_json) : [],
      version_id: row.version_id,
      commit_hash: row.commit_hash,
      commit_message: row.commit_message,
      app_version: row.app_version,
      environment_confidence: row.environment_confidence ?? null,
      host_snapshots: row.host_snapshots_json ? JSON.parse(row.host_snapshots_json) : null,
    };
  }
}
