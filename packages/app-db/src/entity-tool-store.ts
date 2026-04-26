/**
 * EntityToolStore — JSON file-based entity tool entries for dev debugging.
 *
 * Stores a list of entity URIs that developers can use to preview
 * entity UI overrides (drawer, card, feedCard, workstreamWidget).
 *
 * Follows the TagFileStore pattern (atomic writes via temp+rename, Zod validation).
 *
 * @module app-db/entity-tool-store
 */

import { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// Schemas
// ─────────────────────────────────────────────────────────────────────────────

export const EntityToolEntrySchema = z.object({
  uri: z.string().min(1),
  addedAt: z.string(),
});

export type EntityToolEntry = z.infer<typeof EntityToolEntrySchema>;

export const EntityToolFileSchema = z.object({
  entries: z.array(EntityToolEntrySchema).default([]),
});

export type EntityToolFile = z.infer<typeof EntityToolFileSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────────────────────

export class EntityToolStore {
  constructor(private readonly profileDir: string) {}

  getAll(): EntityToolEntry[] {
    return this.readFile().entries;
  }

  add(uri: string): { entry: EntityToolEntry; alreadyExists: boolean } {
    const entries = this.getAll();
    const existing = entries.find((e) => e.uri === uri);
    if (existing) return { entry: existing, alreadyExists: true };

    const entry: EntityToolEntry = { uri, addedAt: new Date().toISOString() };
    entries.push(entry);
    this.writeFile({ entries });
    return { entry, alreadyExists: false };
  }

  remove(uri: string): boolean {
    const entries = this.getAll();
    const idx = entries.findIndex((e) => e.uri === uri);
    if (idx === -1) return false;
    entries.splice(idx, 1);
    this.writeFile({ entries });
    return true;
  }

  // ── File I/O (atomic, Zod-validated) ─────────────────────────────────────

  private filePath(): string {
    return join(this.profileDir, 'entity-tool.json');
  }

  private readFile(): EntityToolFile {
    try {
      const content = readFileSync(this.filePath(), 'utf-8');
      const parsed = JSON.parse(content) as unknown;
      return EntityToolFileSchema.parse(parsed);
    } catch {
      return { entries: [] };
    }
  }

  private writeFile(data: EntityToolFile): void {
    const validated = EntityToolFileSchema.parse(data);
    const filePath = this.filePath();
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    const tmpPath = filePath + '.tmp';
    writeFileSync(tmpPath, JSON.stringify(validated, null, 2) + '\n', 'utf-8');
    renameSync(tmpPath, filePath);
  }
}
