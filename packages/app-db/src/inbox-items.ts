/**
 * InboxItemRepository — CRUD for inbox items.
 *
 * Inbox items are global notifications pushed by plugins or core Vienna.
 * They support deep linking via entity URIs, multiple action buttons via
 * registered action handlers, and read/archived state management.
 *
 * Prepared statements are created once and reused.
 *
 * @module app-db/inbox-items
 */

import type { Database, Statement } from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import { InboxItemRecordSchema } from './schemas';
import type { InboxItemRecord, CreateInboxItemInput, InboxAction } from './schemas';

// ─────────────────────────────────────────────────────────────────────────────
// Row mapping (SQLite snake_case → camelCase)
// ─────────────────────────────────────────────────────────────────────────────

interface InboxItemRow {
  id: string;
  title: string;
  description: string | null;
  icon: string | null;
  source: string | null;
  actions: string;
  entity_uri: string | null;
  cta_label: string | null;
  read: number;
  archived: number;
  created_at: number;
  updated_at: number;
}

function parseActions(json: string): InboxAction[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function rowToRecord(row: InboxItemRow): InboxItemRecord {
  return InboxItemRecordSchema.parse({
    id: row.id,
    title: row.title,
    description: row.description ?? null,
    icon: row.icon ?? null,
    source: row.source ?? null,
    actions: parseActions(row.actions),
    entityUri: row.entity_uri ?? null,
    ctaLabel: row.cta_label ?? null,
    read: row.read === 1,
    archived: row.archived === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Query options
// ─────────────────────────────────────────────────────────────────────────────

export interface InboxListOptions {
  /** Include archived items (default: false) */
  includeArchived?: boolean;
  /** Include read items (default: true) */
  includeRead?: boolean;
  /** Maximum number of items to return */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Repository
// ─────────────────────────────────────────────────────────────────────────────

export class InboxItemRepository {
  private readonly insertStmt: Statement;
  private readonly getByIdStmt: Statement;
  private readonly markReadStmt: Statement;
  private readonly markAllReadStmt: Statement;
  private readonly archiveStmt: Statement;
  private readonly deleteStmt: Statement;
  private readonly countUnreadStmt: Statement;

  // Pre-computed list statements for all 4 combinations of includeArchived × includeRead
  private readonly listStmts: Record<string, Statement>;

  constructor(db: Database) {
    this.insertStmt = db.prepare(`
      INSERT INTO inbox_items (id, title, description, icon, source, actions, entity_uri, cta_label, read, archived, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)
    `);

    this.getByIdStmt = db.prepare('SELECT * FROM inbox_items WHERE id = ?');

    this.markReadStmt = db.prepare('UPDATE inbox_items SET read = 1, updated_at = ? WHERE id = ?');

    this.markAllReadStmt = db.prepare('UPDATE inbox_items SET read = 1, updated_at = ? WHERE read = 0');

    this.archiveStmt = db.prepare('UPDATE inbox_items SET archived = 1, updated_at = ? WHERE id = ?');

    this.deleteStmt = db.prepare('DELETE FROM inbox_items WHERE id = ?');

    this.countUnreadStmt = db.prepare('SELECT COUNT(*) as count FROM inbox_items WHERE read = 0 AND archived = 0');

    // Pre-prepare all 4 list query variants
    this.listStmts = {
      'archived:0,read:1': db.prepare('SELECT * FROM inbox_items WHERE archived = 0 ORDER BY created_at DESC LIMIT ? OFFSET ?'),
      'archived:0,read:0': db.prepare('SELECT * FROM inbox_items WHERE archived = 0 AND read = 0 ORDER BY created_at DESC LIMIT ? OFFSET ?'),
      'archived:1,read:1': db.prepare('SELECT * FROM inbox_items ORDER BY created_at DESC LIMIT ? OFFSET ?'),
      'archived:1,read:0': db.prepare('SELECT * FROM inbox_items WHERE read = 0 ORDER BY created_at DESC LIMIT ? OFFSET ?'),
    };
  }

  /** Push a new inbox item. */
  create(input: CreateInboxItemInput): InboxItemRecord {
    const id = randomUUID();
    const now = Date.now();
    const actionsJson = JSON.stringify(input.actions ?? []);

    this.insertStmt.run(
      id,
      input.title,
      input.description ?? null,
      input.icon ?? null,
      input.source ?? null,
      actionsJson,
      input.entityUri ?? null,
      input.ctaLabel ?? null,
      now,
      now,
    );

    return this.getById(id)!;
  }

  /** Get an inbox item by ID. */
  getById(id: string): InboxItemRecord | null {
    const row = this.getByIdStmt.get(id) as InboxItemRow | undefined;
    return row ? rowToRecord(row) : null;
  }

  /** List inbox items in reverse chronological order. */
  list(opts: InboxListOptions = {}): InboxItemRecord[] {
    const {
      includeArchived = false,
      includeRead = true,
      limit = 100,
      offset = 0,
    } = opts;

    const key = `archived:${includeArchived ? 1 : 0},read:${includeRead ? 1 : 0}`;
    const rows = this.listStmts[key]!.all(limit, offset) as InboxItemRow[];
    return rows.map(rowToRecord);
  }

  /** Mark a single item as read. Returns true if the item existed. */
  markRead(id: string): boolean {
    const result = this.markReadStmt.run(Date.now(), id);
    return result.changes > 0;
  }

  /** Mark all unread items as read. Returns the number of items marked. */
  markAllRead(): number {
    const result = this.markAllReadStmt.run(Date.now());
    return result.changes;
  }

  /** Archive an item. Returns true if the item existed. */
  archive(id: string): boolean {
    const result = this.archiveStmt.run(Date.now(), id);
    return result.changes > 0;
  }

  /** Delete an item permanently. Returns true if the item existed. */
  delete(id: string): boolean {
    const result = this.deleteStmt.run(id);
    return result.changes > 0;
  }

  /** Count unread, non-archived items. */
  countUnread(): number {
    const row = this.countUnreadStmt.get() as { count: number };
    return row.count;
  }
}
