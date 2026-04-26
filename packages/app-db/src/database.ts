/**
 * Database — SQLite Setup & Migrations
 *
 * Creates and configures the SQLite database with WAL mode,
 * runs migrations, and provides the raw database handle.
 *
 * @module app-db/database
 */

import Database from 'better-sqlite3';
import type { Database as DatabaseType } from 'better-sqlite3';

// ─────────────────────────────────────────────────────────────────────────────
// Inline Migrations (embedded to avoid runtime fs lookups in packaged apps)
// ─────────────────────────────────────────────────────────────────────────────

type Migration = { version: number; sql: string } | { version: number; runSql: (db: import('better-sqlite3').Database) => void };

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    sql: `
-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Workstreams
CREATE TABLE IF NOT EXISTS workstreams (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'idle',
  model TEXT,
  is_pinned INTEGER NOT NULL DEFAULT 0,
  message_count INTEGER NOT NULL DEFAULT 0,
  last_activity_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_workstreams_project ON workstreams(project_id, status);
CREATE INDEX IF NOT EXISTS idx_workstreams_activity ON workstreams(last_activity_at DESC);

-- Migration tracking
CREATE TABLE IF NOT EXISTS _migrations (
  version INTEGER PRIMARY KEY,
  applied_at INTEGER NOT NULL
);
`,
  },
  {
    version: 2,
    sql: `
-- Workstream extended columns
ALTER TABLE workstreams ADD COLUMN is_routine_workstream INTEGER NOT NULL DEFAULT 0;
ALTER TABLE workstreams ADD COLUMN active_session_id TEXT;

-- Working directories per workstream
CREATE TABLE IF NOT EXISTS workstream_directories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workstream_id TEXT NOT NULL REFERENCES workstreams(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  label TEXT,
  is_inherited INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ws_dirs_workstream ON workstream_directories(workstream_id);

-- Linked entities per workstream
CREATE TABLE IF NOT EXISTS workstream_linked_entities (
  workstream_id TEXT NOT NULL REFERENCES workstreams(id) ON DELETE CASCADE,
  entity_uri TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_title TEXT,
  context_override TEXT,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (workstream_id, entity_uri)
);

-- Routines (scheduled workstreams)
CREATE TABLE IF NOT EXISTS routines (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  prompt TEXT NOT NULL,
  workstream_id TEXT NOT NULL REFERENCES workstreams(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active',
  schedule TEXT NOT NULL,
  preferences TEXT NOT NULL DEFAULT '{}',
  run_count INTEGER NOT NULL DEFAULT 0,
  last_run_at INTEGER,
  next_run_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Routine execution history
CREATE TABLE IF NOT EXISTS routine_runs (
  id TEXT PRIMARY KEY,
  routine_id TEXT NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  triggered_by TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  completed_at INTEGER,
  summary TEXT,
  error TEXT,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_routine_runs_routine ON routine_runs(routine_id, started_at DESC);
`,
  },
  {
    version: 3,
    sql: `
-- Prevent duplicate directory entries per workstream
CREATE UNIQUE INDEX IF NOT EXISTS idx_ws_dirs_unique
  ON workstream_directories(workstream_id, path);

-- Branch selections: per-directory branch overrides with optional worktree
CREATE TABLE IF NOT EXISTS workstream_branch_selections (
  id TEXT PRIMARY KEY,
  workstream_id TEXT NOT NULL REFERENCES workstreams(id) ON DELETE CASCADE,
  directory_path TEXT NOT NULL,
  branch TEXT NOT NULL,
  worktree_path TEXT,
  base_branch TEXT NOT NULL DEFAULT 'main',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(workstream_id, directory_path)
);
CREATE INDEX IF NOT EXISTS idx_ws_branch_sel_workstream
  ON workstream_branch_selections(workstream_id);
`,
  },
  {
    version: 4,
    sql: `
-- Project-level directories (inherited by all workstreams in the project)
CREATE TABLE IF NOT EXISTS project_directories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  label TEXT,
  created_at INTEGER NOT NULL,
  UNIQUE(project_id, path)
);
CREATE INDEX IF NOT EXISTS idx_proj_dirs_project ON project_directories(project_id);
`,
  },
  {
    version: 5,
    sql: `
-- Content registries (Git-backed sources for quick actions, plugins, etc.)
CREATE TABLE IF NOT EXISTS registries (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  url TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  priority INTEGER NOT NULL DEFAULT 10,
  source TEXT NOT NULL DEFAULT 'local',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_registries_priority ON registries(priority ASC, name ASC);
`,
  },
  {
    version: 6,
    sql: `
-- Workstream Groups: a named collection of related workstreams within a project
CREATE TABLE IF NOT EXISTS workstream_groups (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_pinned INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ws_groups_project ON workstream_groups(project_id);

-- Add optional group membership to workstreams (SET NULL on group delete)
ALTER TABLE workstreams ADD COLUMN group_id TEXT REFERENCES workstream_groups(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_workstreams_group ON workstreams(group_id);

-- Entities linked at the group level — inherited by all workstreams in the group
CREATE TABLE IF NOT EXISTS workstream_group_linked_entities (
  group_id TEXT NOT NULL REFERENCES workstream_groups(id) ON DELETE CASCADE,
  entity_uri TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_title TEXT,
  context_override TEXT,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (group_id, entity_uri)
);

-- Directories shared at the group level — inherited by workstreams on creation
CREATE TABLE IF NOT EXISTS workstream_group_directories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id TEXT NOT NULL REFERENCES workstream_groups(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  label TEXT,
  created_at INTEGER NOT NULL,
  UNIQUE(group_id, path)
);
CREATE INDEX IF NOT EXISTS idx_ws_group_dirs_group ON workstream_group_directories(group_id);
`,
  },
  {
    version: 7,
    sql: `
-- Add auto_create_worktrees toggle to workstream groups
ALTER TABLE workstream_groups ADD COLUMN auto_create_worktrees INTEGER NOT NULL DEFAULT 0;

-- Group-level branch selections (default branch per directory, inherited on workstream creation)
CREATE TABLE IF NOT EXISTS workstream_group_branch_selections (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES workstream_groups(id) ON DELETE CASCADE,
  directory_path TEXT NOT NULL,
  branch TEXT NOT NULL,
  base_branch TEXT NOT NULL DEFAULT 'main',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(group_id, directory_path)
);
CREATE INDEX IF NOT EXISTS idx_ws_group_branch_sel_group
  ON workstream_group_branch_selections(group_id);
`,
  },
  {
    version: 8,
    sql: `
-- Permission policies: scoped permission overrides (project / group / workstream)
CREATE TABLE IF NOT EXISTS permission_policies (
  id TEXT PRIMARY KEY,
  scope_type TEXT NOT NULL CHECK(scope_type IN ('project', 'group', 'workstream')),
  scope_id TEXT NOT NULL,
  rules TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(scope_type, scope_id)
);
CREATE INDEX IF NOT EXISTS idx_perm_policies_scope
  ON permission_policies(scope_type, scope_id);
`,
  },
  {
    version: 9,
    sql: `
-- Installed skills: skills downloaded from registries or GitHub repos
CREATE TABLE IF NOT EXISTS installed_skills (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  version TEXT,
  registry_version TEXT,
  source TEXT NOT NULL DEFAULT 'inline' CHECK(source IN ('inline', 'github')),
  source_ref TEXT,
  registry TEXT,
  path TEXT NOT NULL,
  icon TEXT,
  category TEXT,
  tags_json TEXT,
  author TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  pinned INTEGER NOT NULL DEFAULT 0,
  install_date TEXT NOT NULL,
  last_used TEXT,
  use_count INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_installed_skills_enabled ON installed_skills(enabled);
CREATE INDEX IF NOT EXISTS idx_installed_skills_category ON installed_skills(category);
`,
  },
  {
    version: 10,
    sql: `
-- Labels: per-project executable tags for workstreams
CREATE TABLE IF NOT EXISTS labels (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  instructions TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366F1',
  max_depth INTEGER NOT NULL DEFAULT 3,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(project_id, name)
);
CREATE INDEX IF NOT EXISTS idx_labels_project ON labels(project_id);

-- DAG edges between labels (dependency relationships)
CREATE TABLE IF NOT EXISTS label_dependencies (
  id TEXT PRIMARY KEY,
  label_id TEXT NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
  depends_on_label_id TEXT NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  UNIQUE(label_id, depends_on_label_id),
  CHECK(label_id != depends_on_label_id)
);
CREATE INDEX IF NOT EXISTS idx_label_deps_label ON label_dependencies(label_id);
CREATE INDEX IF NOT EXISTS idx_label_deps_dep ON label_dependencies(depends_on_label_id);

-- Labels applied to workstreams (junction + execution tracking)
CREATE TABLE IF NOT EXISTS workstream_labels (
  id TEXT PRIMARY KEY,
  workstream_id TEXT NOT NULL REFERENCES workstreams(id) ON DELETE CASCADE,
  label_id TEXT NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','running','completed','failed','skipped')),
  applied_at INTEGER NOT NULL,
  started_at INTEGER,
  completed_at INTEGER,
  error TEXT,
  applied_by TEXT NOT NULL DEFAULT 'manual' CHECK(applied_by IN ('manual','agent','trigger','pipeline')),
  depth INTEGER NOT NULL DEFAULT 0,
  UNIQUE(workstream_id, label_id)
);
CREATE INDEX IF NOT EXISTS idx_ws_labels_workstream ON workstream_labels(workstream_id);
CREATE INDEX IF NOT EXISTS idx_ws_labels_label ON workstream_labels(label_id);
CREATE INDEX IF NOT EXISTS idx_ws_labels_status ON workstream_labels(status);

-- Event-based auto-triggers for labels
CREATE TABLE IF NOT EXISTS label_triggers (
  id TEXT PRIMARY KEY,
  label_id TEXT NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL CHECK(trigger_type IN ('status_change','label_completed')),
  trigger_config TEXT NOT NULL DEFAULT '{}',
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_label_triggers_label ON label_triggers(label_id);
CREATE INDEX IF NOT EXISTS idx_label_triggers_type ON label_triggers(trigger_type);

-- Pipeline runs (tracks a full DAG execution)
CREATE TABLE IF NOT EXISTS label_pipeline_runs (
  id TEXT PRIMARY KEY,
  workstream_id TEXT NOT NULL REFERENCES workstreams(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'running' CHECK(status IN ('running','completed','failed','cancelled')),
  started_at INTEGER NOT NULL,
  completed_at INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_workstream ON label_pipeline_runs(workstream_id);

-- Pipeline run steps (individual label executions within a pipeline)
CREATE TABLE IF NOT EXISTS label_pipeline_run_steps (
  id TEXT PRIMARY KEY,
  pipeline_run_id TEXT NOT NULL REFERENCES label_pipeline_runs(id) ON DELETE CASCADE,
  workstream_label_id TEXT NOT NULL REFERENCES workstream_labels(id) ON DELETE CASCADE,
  label_id TEXT NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','running','completed','failed','skipped')),
  started_at INTEGER,
  completed_at INTEGER,
  error TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pipeline_steps_run ON label_pipeline_run_steps(pipeline_run_id);
`,
  },
  {
    version: 11,
    sql: `
-- Labels: add spawn_workstream and use_parent_worktree flags
ALTER TABLE labels ADD COLUMN spawn_workstream INTEGER NOT NULL DEFAULT 0;
ALTER TABLE labels ADD COLUMN use_parent_worktree INTEGER NOT NULL DEFAULT 1;

-- Workstream labels: add delegation tracking columns
ALTER TABLE workstream_labels ADD COLUMN delegated_workstream_id TEXT REFERENCES workstreams(id) ON DELETE SET NULL;
ALTER TABLE workstream_labels ADD COLUMN source_workstream_label_id TEXT REFERENCES workstream_labels(id) ON DELETE SET NULL;
`,
  },
  {
    version: 12,
    sql: `
-- Replace use_parent_worktree boolean with worktree_mode enum text
-- 'same' = reuse parent worktree (old use_parent_worktree=1)
-- 'fork' = new worktree from parent's current branch
-- 'from_main' = new worktree from baseBranch (old use_parent_worktree=0)
ALTER TABLE labels ADD COLUMN worktree_mode TEXT NOT NULL DEFAULT 'same';

-- Migrate existing data
UPDATE labels SET worktree_mode = 'from_main' WHERE use_parent_worktree = 0;
`,
  },
  {
    version: 13,
    sql: `
-- Composite index for common query: get pending labels for a workstream
CREATE INDEX IF NOT EXISTS idx_ws_labels_workstream_status ON workstream_labels(workstream_id, status);

-- Composite index for pipeline step queries within a run
CREATE INDEX IF NOT EXISTS idx_pipeline_steps_run_status ON label_pipeline_run_steps(pipeline_run_id, status);
`,
  },
  {
    version: 14,
    sql: `
-- Recreate workstream_labels with snapshot columns (no FK to labels table).
-- Snapshot freezes label definition at apply time so deleting labels from JSON
-- doesn't affect historical records.

CREATE TABLE workstream_labels_new (
  id TEXT PRIMARY KEY,
  workstream_id TEXT NOT NULL REFERENCES workstreams(id) ON DELETE CASCADE,
  label_name TEXT NOT NULL,
  -- Snapshot (frozen at apply time)
  label_instructions TEXT NOT NULL DEFAULT '',
  label_color TEXT NOT NULL DEFAULT '#3B82F6',
  label_max_depth INTEGER NOT NULL DEFAULT 3,
  label_spawn_workstream INTEGER NOT NULL DEFAULT 0,
  label_worktree_mode TEXT NOT NULL DEFAULT 'same',
  label_depends_on TEXT NOT NULL DEFAULT '[]',
  -- Execution state
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','running','completed','failed','skipped')),
  applied_at INTEGER NOT NULL,
  started_at INTEGER,
  completed_at INTEGER,
  error TEXT,
  applied_by TEXT NOT NULL DEFAULT 'manual' CHECK(applied_by IN ('manual','agent','trigger','pipeline')),
  depth INTEGER NOT NULL DEFAULT 0,
  delegated_workstream_id TEXT REFERENCES workstreams(id) ON DELETE SET NULL,
  source_workstream_label_id TEXT,
  UNIQUE(workstream_id, label_name)
);

-- Backfill from existing data, joining labels table for snapshot columns
INSERT INTO workstream_labels_new (
  id, workstream_id, label_name,
  label_instructions, label_color, label_max_depth,
  label_spawn_workstream, label_worktree_mode, label_depends_on,
  status, applied_at, started_at, completed_at, error, applied_by, depth,
  delegated_workstream_id, source_workstream_label_id
)
SELECT
  wl.id,
  wl.workstream_id,
  l.name,
  l.instructions,
  l.color,
  l.max_depth,
  l.spawn_workstream,
  l.worktree_mode,
  COALESCE(
    (SELECT '[' || GROUP_CONCAT('"' || dl.name || '"') || ']'
     FROM label_dependencies ld
     JOIN labels dl ON ld.depends_on_label_id = dl.id
     WHERE ld.label_id = l.id),
    '[]'
  ),
  wl.status,
  wl.applied_at,
  wl.started_at,
  wl.completed_at,
  wl.error,
  wl.applied_by,
  wl.depth,
  wl.delegated_workstream_id,
  wl.source_workstream_label_id
FROM workstream_labels wl
JOIN labels l ON wl.label_id = l.id;

-- Drop old tables (order matters for FK constraints)
DROP TABLE IF EXISTS label_pipeline_run_steps;
DROP TABLE IF EXISTS label_pipeline_runs;
DROP TABLE IF EXISTS label_triggers;
DROP TABLE IF EXISTS workstream_labels;
DROP TABLE IF EXISTS label_dependencies;
DROP TABLE IF EXISTS labels;

-- Rename new table
ALTER TABLE workstream_labels_new RENAME TO workstream_labels;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_ws_labels_workstream ON workstream_labels(workstream_id);
CREATE INDEX IF NOT EXISTS idx_ws_labels_status ON workstream_labels(status);
CREATE INDEX IF NOT EXISTS idx_ws_labels_workstream_status ON workstream_labels(workstream_id, status);
`,
  },
  {
    version: 15,
    sql: `
-- Rename workstream_labels → workstream_tags with all label_* columns → tag_*

CREATE TABLE workstream_tags (
  id TEXT PRIMARY KEY,
  workstream_id TEXT NOT NULL REFERENCES workstreams(id) ON DELETE CASCADE,
  tag_name TEXT NOT NULL,
  -- Snapshot (frozen at apply time)
  tag_instructions TEXT NOT NULL DEFAULT '',
  tag_color TEXT NOT NULL DEFAULT '#3B82F6',
  tag_max_depth INTEGER NOT NULL DEFAULT 3,
  tag_spawn_workstream INTEGER NOT NULL DEFAULT 0,
  tag_worktree_mode TEXT NOT NULL DEFAULT 'same',
  tag_depends_on TEXT NOT NULL DEFAULT '[]',
  -- Execution state
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','running','completed','failed','skipped')),
  applied_at INTEGER NOT NULL,
  started_at INTEGER,
  completed_at INTEGER,
  error TEXT,
  applied_by TEXT NOT NULL DEFAULT 'manual' CHECK(applied_by IN ('manual','agent','trigger','pipeline')),
  depth INTEGER NOT NULL DEFAULT 0,
  delegated_workstream_id TEXT REFERENCES workstreams(id) ON DELETE SET NULL,
  source_workstream_tag_id TEXT,
  UNIQUE(workstream_id, tag_name)
);

-- Copy data from old table
INSERT INTO workstream_tags (
  id, workstream_id, tag_name,
  tag_instructions, tag_color, tag_max_depth,
  tag_spawn_workstream, tag_worktree_mode, tag_depends_on,
  status, applied_at, started_at, completed_at, error, applied_by, depth,
  delegated_workstream_id, source_workstream_tag_id
)
SELECT
  id, workstream_id, label_name,
  label_instructions, label_color, label_max_depth,
  label_spawn_workstream, label_worktree_mode, label_depends_on,
  status, applied_at, started_at, completed_at, error, applied_by, depth,
  delegated_workstream_id, source_workstream_label_id
FROM workstream_labels;

-- Drop old table
DROP TABLE IF EXISTS workstream_labels;

-- Recreate indexes with new names
CREATE INDEX IF NOT EXISTS idx_ws_tags_workstream ON workstream_tags(workstream_id);
CREATE INDEX IF NOT EXISTS idx_ws_tags_status ON workstream_tags(status);
CREATE INDEX IF NOT EXISTS idx_ws_tags_workstream_status ON workstream_tags(workstream_id, status);
`,
  },
  {
    version: 16,
    sql: `
-- Widen installed_skills.source CHECK to allow 'local' skills from .claude directories
-- SQLite doesn't support ALTER CHECK, so recreate the table
CREATE TABLE installed_skills_new (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  version TEXT,
  registry_version TEXT,
  source TEXT NOT NULL DEFAULT 'inline' CHECK(source IN ('inline', 'github', 'local')),
  source_ref TEXT,
  registry TEXT,
  path TEXT NOT NULL,
  icon TEXT,
  category TEXT,
  tags_json TEXT,
  author TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  pinned INTEGER NOT NULL DEFAULT 0,
  install_date TEXT NOT NULL,
  last_used TEXT,
  use_count INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
INSERT INTO installed_skills_new SELECT * FROM installed_skills;
DROP TABLE installed_skills;
ALTER TABLE installed_skills_new RENAME TO installed_skills;
CREATE INDEX IF NOT EXISTS idx_installed_skills_enabled ON installed_skills(enabled);
CREATE INDEX IF NOT EXISTS idx_installed_skills_category ON installed_skills(category);
`,
  },
  {
    version: 17,
    sql: `
-- Replace 'archived' status with an archived_at timestamp column
ALTER TABLE workstreams ADD COLUMN archived_at INTEGER;

-- Backfill: existing archived workstreams get their updated_at as archived_at
UPDATE workstreams SET archived_at = updated_at WHERE status = 'archived';
UPDATE workstreams SET status = 'idle' WHERE status = 'archived';
`,
  },
  {
    version: 18,
    sql: `
-- Installed plugins (registry-sourced plugins installed on disk)
CREATE TABLE IF NOT EXISTS installed_plugins (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  version TEXT,
  registry_version TEXT,
  source TEXT NOT NULL CHECK(source IN ('inline', 'github')),
  source_ref TEXT,
  registry TEXT,
  path TEXT NOT NULL,
  icon TEXT,
  category TEXT,
  tags_json TEXT,
  author TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  install_date TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_installed_plugins_enabled ON installed_plugins(enabled);
`,
  },
  {
    version: 19,
    sql: `
-- Add optional emoji to workstream groups (shown as section icon when idle/active)
ALTER TABLE workstream_groups ADD COLUMN emoji TEXT;
`,
  },
  {
    version: 20,
    sql: `
-- Add project_directory column to registries for project-declared registries.
-- When source='project', this tracks which project directory declared the registry.
ALTER TABLE registries ADD COLUMN project_directory TEXT;
`,
  },
  {
    version: 21,
    sql: `
-- Add is_feed_workstream flag for home feed system workstreams.
ALTER TABLE workstreams ADD COLUMN is_feed_workstream INTEGER NOT NULL DEFAULT 0;
`,
  },
  {
    version: 22,
    sql: `
-- Track which permission template was applied to a scoped policy.
ALTER TABLE permission_policies ADD COLUMN template_id TEXT;
`,
  },
  {
    version: 23,
    sql: `
-- Fork provenance: track which workstream a fork originated from
ALTER TABLE workstreams ADD COLUMN forked_from_workstream_id TEXT;
ALTER TABLE workstreams ADD COLUMN forked_at_message_id TEXT;
`,
  },
  {
    version: 24,
    sql: `
-- Tasks: core task management
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  identifier TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo',
  priority TEXT NOT NULL DEFAULT 'none',
  assignee_type TEXT,
  assignee_workstream_id TEXT,
  due_date TEXT,
  parent_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
  links TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX idx_tasks_project ON tasks(project_id, status);
CREATE INDEX idx_tasks_parent ON tasks(parent_id);
CREATE INDEX idx_tasks_assignee ON tasks(assignee_type, assignee_workstream_id);

-- Task labels
CREATE TABLE task_labels (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_task_labels_project ON task_labels(project_id);

-- Task ↔ Label many-to-many
CREATE TABLE task_label_assignments (
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  label_id TEXT NOT NULL REFERENCES task_labels(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, label_id)
);

-- Per-project task identifier counter
ALTER TABLE projects ADD COLUMN next_task_number INTEGER NOT NULL DEFAULT 1;
`,
  },
  {
    version: 25,
    sql: `
-- Fix tasks table: add FK on assignee_workstream_id, unique constraint on identifier

-- Recreate tasks with FK on assignee_workstream_id
CREATE TABLE tasks_new (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  identifier TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo',
  priority TEXT NOT NULL DEFAULT 'none',
  assignee_type TEXT,
  assignee_workstream_id TEXT REFERENCES workstreams(id) ON DELETE SET NULL,
  due_date TEXT,
  parent_id TEXT,
  links TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

INSERT INTO tasks_new SELECT * FROM tasks;

-- Drop dependent tables, then old tasks
DROP TABLE IF EXISTS task_label_assignments;
DROP TABLE IF EXISTS tasks;
ALTER TABLE tasks_new RENAME TO tasks;

-- Add self-referential FK via trigger (SQLite limitation: can't self-reference in CREATE TABLE after rename)
-- parent_id cascading delete is handled in the repository layer

-- Recreate task_label_assignments
CREATE TABLE task_label_assignments (
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  label_id TEXT NOT NULL REFERENCES task_labels(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, label_id)
);

-- Rebuild all indexes including new ones
CREATE INDEX idx_tasks_project ON tasks(project_id, status);
CREATE INDEX idx_tasks_parent ON tasks(parent_id);
CREATE INDEX idx_tasks_assignee ON tasks(assignee_type, assignee_workstream_id);
CREATE UNIQUE INDEX idx_tasks_identifier_unique ON tasks(project_id, identifier);
CREATE INDEX idx_tasks_assignee_workstream ON tasks(assignee_workstream_id);
`,
  },
  {
    version: 26,
    sql: `
-- Workstream references: auto-detected or agent-added entity references in conversations.
-- Lightweight alternative to linked entities — does not inject into agent system prompt.
CREATE TABLE IF NOT EXISTS workstream_references (
  workstream_id TEXT NOT NULL REFERENCES workstreams(id) ON DELETE CASCADE,
  entity_uri TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_title TEXT,
  external_url TEXT,
  first_referenced_at INTEGER NOT NULL,
  PRIMARY KEY (workstream_id, entity_uri)
);
CREATE INDEX IF NOT EXISTS idx_ws_references_workstream ON workstream_references(workstream_id);
`,
  },
  {
    version: 27,
    sql: `
-- Inbox items: global notification/action items pushed by plugins or core Vienna.
CREATE TABLE IF NOT EXISTS inbox_items (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  source TEXT,
  action_id TEXT,
  action_payload TEXT,
  entity_uri TEXT,
  read INTEGER NOT NULL DEFAULT 0,
  archived INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_inbox_items_created ON inbox_items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inbox_items_read_archived ON inbox_items(read, archived);
`,
  },
  {
    version: 28,
    // v27 already includes updated_at in CREATE TABLE for fresh databases.
    // This migration only runs ALTER TABLE for databases created before
    // updated_at was added to v27.
    runSql: (db: import('better-sqlite3').Database) => {
      const columns = db.pragma('table_info(inbox_items)') as Array<{ name: string }>;
      if (!columns.some((c) => c.name === 'updated_at')) {
        db.exec(`ALTER TABLE inbox_items ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0`);
        db.exec(`UPDATE inbox_items SET updated_at = created_at WHERE updated_at = 0`);
      }
    },
  },
  {
    version: 29,
    // Replace action_id + action_payload with a JSON actions array.
    // Migrate existing single actions into the new format.
    runSql: (db: import('better-sqlite3').Database) => {
      const columns = db.pragma('table_info(inbox_items)') as Array<{ name: string }>;
      if (!columns.some((c) => c.name === 'actions')) {
        db.exec(`ALTER TABLE inbox_items ADD COLUMN actions TEXT NOT NULL DEFAULT '[]'`);
        // Migrate existing single-action items into the actions array
        const rows = db.prepare(
          `SELECT id, action_id, action_payload FROM inbox_items WHERE action_id IS NOT NULL`
        ).all() as Array<{ id: string; action_id: string; action_payload: string | null }>;
        const update = db.prepare(`UPDATE inbox_items SET actions = ? WHERE id = ?`);
        for (const row of rows) {
          let payload: unknown;
          try { payload = row.action_payload ? JSON.parse(row.action_payload) : undefined; } catch { payload = undefined; }
          const action = { id: row.action_id, label: row.action_id, payload };
          update.run(JSON.stringify([action]), row.id);
        }
      }
    },
  },
  {
    version: 30,
    // Add cta_label column to inbox_items for optional call-to-action button text.
    runSql: (db: import('better-sqlite3').Database) => {
      const columns = db.pragma('table_info(inbox_items)') as Array<{ name: string }>;
      if (!columns.some((c) => c.name === 'cta_label')) {
        db.exec(`ALTER TABLE inbox_items ADD COLUMN cta_label TEXT`);
      }
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Database Factory
// ─────────────────────────────────────────────────────────────────────────────

export interface AppDatabaseOptions {
  /** Path to the SQLite file. Use ':memory:' for in-memory (tests). */
  path: string;
}

/**
 * Open (or create) the app database and run pending migrations.
 *
 * The database uses WAL mode for concurrent read/write performance.
 * Prepared statements are ~10x faster than ad-hoc queries.
 */
export function openAppDatabase(options: AppDatabaseOptions): DatabaseType {
  const db = new Database(options.path);

  // Performance: WAL mode (writes don't block reads)
  db.pragma('journal_mode = WAL');
  // Performance: synchronous=NORMAL is safe with WAL
  db.pragma('synchronous = NORMAL');
  // Safety: enforce foreign keys
  db.pragma('foreign_keys = ON');

  runMigrations(db);

  return db;
}

/**
 * Run pending migrations in order.
 * Each migration runs inside a transaction for atomicity.
 */
function runMigrations(db: DatabaseType): void {
  // Ensure _migrations table exists (bootstrap)
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY,
      applied_at INTEGER NOT NULL
    );
  `);

  const applied = new Set(
    db
      .prepare('SELECT version FROM _migrations')
      .all()
      .map((row) => (row as { version: number }).version)
  );

  for (const migration of MIGRATIONS) {
    if (applied.has(migration.version)) continue;

    const runMigration = db.transaction(() => {
      if ('runSql' in migration) {
        migration.runSql(db);
      } else {
        db.exec(migration.sql);
      }
      db.prepare('INSERT INTO _migrations (version, applied_at) VALUES (?, ?)').run(
        migration.version,
        Date.now()
      );
    });

    runMigration();
  }
}

/**
 * Close the database handle. Call this on app shutdown.
 */
export function closeAppDatabase(db: DatabaseType): void {
  db.close();
}
