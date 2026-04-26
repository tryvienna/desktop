import type Database from 'better-sqlite3';

export interface MetricRow {
  id: number;
  app_id: string;
  version_id: string | null;
  run_id: string | null;
  timestamp: number;
  cpu_total: number;
  memory_rss: number;
  memory_heap: number | null;
  gpu_memory: number | null;
  process_count: number;
  processes_json: string | null;
}

export interface VersionSummary {
  version_id: string;
  version: string;
  commit_hash: string;
  avg_cpu: number;
  max_cpu: number;
  avg_memory: number;
  max_memory: number;
  avg_gpu: number | null;
  sample_count: number;
  first_seen: number;
  last_seen: number;
}

export class MetricRepository {
  constructor(private db: Database.Database) {}

  ingest(data: {
    appId: string;
    versionId: string | null;
    runId?: string | null;
    timestamp: number;
    cpuTotal: number;
    memoryRss: number;
    memoryHeap: number | null;
    gpuMemory: number | null;
    processCount: number;
    processesJson: string | null;
  }): number {
    const result = this.db
      .prepare(
        `
      INSERT INTO metric_snapshots
        (app_id, version_id, run_id, timestamp, cpu_total, memory_rss, memory_heap, gpu_memory, process_count, processes_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
      )
      .run(
        data.appId,
        data.versionId,
        data.runId ?? null,
        data.timestamp,
        data.cpuTotal,
        data.memoryRss,
        data.memoryHeap,
        data.gpuMemory,
        data.processCount,
        data.processesJson
      );
    return Number(result.lastInsertRowid);
  }

  queryByApp(
    appId: string,
    from?: number,
    to?: number,
    versionIds?: string[],
    runId?: string
  ): MetricRow[] {
    let sql = 'SELECT * FROM metric_snapshots WHERE app_id = ?';
    const params: unknown[] = [appId];
    if (from) {
      sql += ' AND timestamp >= ?';
      params.push(from);
    }
    if (to) {
      sql += ' AND timestamp <= ?';
      params.push(to);
    }
    if (versionIds && versionIds.length > 0) {
      sql += ` AND version_id IN (${versionIds.map(() => '?').join(',')})`;
      params.push(...versionIds);
    }
    if (runId) {
      sql += ' AND run_id = ?';
      params.push(runId);
    }
    sql += ' ORDER BY timestamp ASC';
    return this.db.prepare(sql).all(...params) as MetricRow[];
  }

  summarizeByVersion(appId: string): VersionSummary[] {
    return this.db
      .prepare(
        `
      SELECT
        v.id as version_id,
        v.version,
        v.commit_hash,
        COALESCE(AVG(m.cpu_total), 0) as avg_cpu,
        COALESCE(MAX(m.cpu_total), 0) as max_cpu,
        COALESCE(AVG(m.memory_rss), 0) as avg_memory,
        COALESCE(MAX(m.memory_rss), 0) as max_memory,
        AVG(m.gpu_memory) as avg_gpu,
        COUNT(m.id) as sample_count,
        MIN(m.timestamp) as first_seen,
        MAX(m.timestamp) as last_seen
      FROM app_versions v
      LEFT JOIN metric_snapshots m ON m.version_id = v.id
      WHERE v.app_id = ?
      GROUP BY v.id
      ORDER BY v.created_at DESC
    `
      )
      .all(appId) as VersionSummary[];
  }

  getLatestByApp(appId: string): MetricRow | undefined {
    return this.db
      .prepare('SELECT * FROM metric_snapshots WHERE app_id = ? ORDER BY timestamp DESC LIMIT 1')
      .get(appId) as MetricRow | undefined;
  }

  /** Get last N metric snapshots per app for sparklines. */
  getSparklines(points = 20): Record<string, { timestamp: number; cpu: number; memory: number }[]> {
    const rows = this.db
      .prepare(
        `
      SELECT app_id, timestamp, cpu_total, memory_rss FROM (
        SELECT app_id, timestamp, cpu_total, memory_rss,
          ROW_NUMBER() OVER (PARTITION BY app_id ORDER BY timestamp DESC) as rn
        FROM metric_snapshots
      ) WHERE rn <= ?
      ORDER BY app_id, timestamp ASC
    `
      )
      .all(points) as {
      app_id: string;
      timestamp: number;
      cpu_total: number;
      memory_rss: number;
    }[];

    const result: Record<string, { timestamp: number; cpu: number; memory: number }[]> = {};
    for (const row of rows) {
      if (!result[row.app_id]) result[row.app_id] = [];
      result[row.app_id].push({
        timestamp: row.timestamp,
        cpu: row.cpu_total,
        memory: row.memory_rss,
      });
    }
    return result;
  }

  countByApp(appId: string): number {
    const row = this.db
      .prepare('SELECT COUNT(*) as count FROM metric_snapshots WHERE app_id = ?')
      .get(appId) as { count: number };
    return row.count;
  }
}
