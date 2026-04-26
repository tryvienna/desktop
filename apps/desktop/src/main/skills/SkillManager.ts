/**
 * SkillManager — Orchestrates skill installation, activation, and lifecycle.
 *
 * Skills are discovered from registries, installed to the profile's skills/
 * directory, and activated as one-shot prompt injections in chat sessions.
 *
 * @module main/skills/SkillManager
 */

import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import type { InstalledSkillRepository, InstalledSkillRecord, CreateInstalledSkillInput } from '@vienna/app-db';
import { mainEnv } from '@vienna/env/main';
import type { RegistryManager } from '../registry/RegistryManager';
import type { RegistrySkill } from '../registry/types';
import type { GitClient } from '../registry/GitClient';
import { parseSkillFile, extractBody } from './SkillParser';

/** Validate that a skill/registry ID is safe for use in filesystem paths. */
const SAFE_ID_RE = /^[a-z0-9][a-z0-9._-]{0,127}$/;
function assertSafeId(id: string, label: string): void {
  if (!SAFE_ID_RE.test(id)) {
    throw new Error(`${label} "${id}" contains unsafe characters`);
  }
}

/** Validate that a resolved path stays within the expected parent directory. */
function assertPathContainment(child: string, parent: string): void {
  const resolvedChild = path.resolve(child);
  const resolvedParent = path.resolve(parent);
  if (!resolvedChild.startsWith(resolvedParent + path.sep) && resolvedChild !== resolvedParent) {
    throw new Error(`Path "${child}" escapes parent "${parent}"`);
  }
}

/** Validate that a git repo URL uses https:// protocol (no file://, ssh://, etc.). */
function assertSafeRepoUrl(url: string): void {
  if (!url.startsWith('https://')) {
    throw new Error(`Repo URL must use https:// protocol, got: "${url}"`);
  }
}

/** Replace `{{VAR_NAME}}` placeholders with values from a variable map. */
export function interpolateTemplateVars(body: string, vars: Record<string, string>): string {
  return body.replace(/\{\{([A-Z_][A-Z0-9_]*)\}\}/g, (match, key: string) => vars[key] ?? match);
}

export interface SkillManagerDeps {
  repository: InstalledSkillRepository;
  registryManager: RegistryManager;
  skillsDir: string;
  gitClient: GitClient;
  logger: {
    info: (msg: string, ctx?: Record<string, unknown>) => void;
    warn: (msg: string, ctx?: Record<string, unknown>) => void;
    error: (msg: string, ctx?: Record<string, unknown>) => void;
  };
}

export class SkillManager {
  private readonly repository: InstalledSkillRepository;
  private readonly registryManager: RegistryManager;
  private readonly skillsDir: string;
  private readonly gitClient: GitClient;
  private readonly logger: SkillManagerDeps['logger'];
  private onSkillsChanged: (() => void) | null = null;

  constructor(deps: SkillManagerDeps) {
    this.repository = deps.repository;
    this.registryManager = deps.registryManager;
    this.skillsDir = deps.skillsDir;
    this.gitClient = deps.gitClient;
    this.logger = deps.logger;
  }

  /**
   * Register a callback invoked after skill state changes (install, uninstall, toggle, sync).
   * Used to re-sync command palette entries.
   */
  setOnSkillsChanged(callback: () => void): void {
    this.onSkillsChanged = callback;
  }

  /** Notify listeners that skill state has changed. */
  private notifySkillsChanged(): void {
    this.onSkillsChanged?.();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Lifecycle
  // ─────────────────────────────────────────────────────────────────────────────

  async ensureSkillsDir(): Promise<void> {
    await fs.mkdir(this.skillsDir, { recursive: true });
  }

  /**
   * In development, sync skills from a local source directory into the profile's
   * skills directory. Overwrites existing files so edits are picked up on restart.
   * Each subdirectory in sourceDir becomes a skill (must contain SKILL.md).
   */
  async syncDevSkills(sourceDir: string): Promise<void> {
    let entries: import('node:fs').Dirent[];
    try {
      entries = await fs.readdir(sourceDir, { withFileTypes: true });
    } catch {
      return; // Source dir doesn't exist — nothing to sync
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const skillId = entry.name;
      const src = path.join(sourceDir, skillId);
      const dest = path.join(this.skillsDir, skillId);

      // Verify it has a SKILL.md
      try {
        await fs.access(path.join(src, 'SKILL.md'));
      } catch {
        continue;
      }

      await fs.cp(src, dest, { recursive: true });

      // Upsert DB record so the skill appears in the UI
      const parsed = await parseSkillFile(path.join(dest, 'SKILL.md'));
      const existing = this.repository.getById(skillId);
      if (existing) {
        this.repository.delete(skillId);
      }
      this.repository.create({
        id: skillId,
        name: parsed.frontmatter.name,
        description: parsed.frontmatter.description,
        version: parsed.frontmatter.version ?? null,
        registryVersion: null,
        source: 'inline',
        sourceRef: 'dev',
        registry: null,
        path: dest,
        icon: parsed.frontmatter.icon ?? null,
        category: parsed.frontmatter.category ?? null,
        tags: parsed.frontmatter.tags,
        author: parsed.frontmatter.author ?? null,
      });

      this.logger.info('Synced dev skill', { skillId });
    }
  }

  /**
   * Scan `.claude/skills/` directories for local skills and sync them into
   * the installed skills DB. Unlike syncDevSkills, files are NOT copied —
   * the DB path points to the original location.
   *
   * @param dirs.global - Path to `~/.claude/skills/`
   * @param dirs.projectDirs - Paths to project directories (scans `<dir>/.claude/skills/`)
   */
  async syncLocalSkills(dirs: { global: string; projectDirs: string[] }): Promise<void> {
    const discovered = new Map<string, { skillPath: string; scope: 'global' | 'project' }>();

    // Scan global ~/.claude/skills/
    await this.scanSkillsDir(dirs.global, 'global', discovered);

    // Scan per-project <dir>/.claude/skills/ (project wins on conflict)
    for (const projectDir of dirs.projectDirs) {
      const projectSkillsDir = path.join(projectDir, '.claude', 'skills');
      await this.scanSkillsDir(projectSkillsDir, 'project', discovered);
    }

    // Upsert discovered skills
    for (const [skillId, { skillPath, scope }] of discovered) {
      try {
        const parsed = await parseSkillFile(path.join(skillPath, 'SKILL.md'));

        // Don't overwrite non-local skills (registry/github installs take precedence)
        const existing = this.repository.getById(skillId);
        if (existing && existing.source !== 'local') continue;

        // Delete existing local record to re-sync metadata
        if (existing) {
          this.repository.delete(skillId);
        }

        this.repository.create({
          id: skillId,
          name: parsed.frontmatter.name,
          description: parsed.frontmatter.description,
          version: parsed.frontmatter.version ?? null,
          registryVersion: null,
          source: 'local',
          sourceRef: scope,
          registry: null,
          path: skillPath,
          icon: parsed.frontmatter.icon ?? null,
          category: parsed.frontmatter.category ?? null,
          tags: parsed.frontmatter.tags,
          author: parsed.frontmatter.author ?? null,
        });

        this.logger.info('Synced local skill', { skillId, scope });
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        this.logger.warn('Failed to sync local skill', { skillId, error });
      }
    }

    // Remove stale local skills — either the path no longer exists OR
    // the skill wasn't discovered in any scanned directory (e.g. symlink removed)
    const allInstalled = this.repository.listAll();
    for (const skill of allInstalled) {
      if (skill.source !== 'local') continue;
      if (!discovered.has(skill.id)) {
        this.repository.delete(skill.id);
        this.logger.info('Removed stale local skill', { skillId: skill.id });
      }
    }

    this.notifySkillsChanged();
  }

  /** Scan a directory for skill subdirectories containing SKILL.md. */
  private async scanSkillsDir(
    dir: string,
    scope: 'global' | 'project',
    discovered: Map<string, { skillPath: string; scope: 'global' | 'project' }>,
  ): Promise<void> {
    let entries: import('node:fs').Dirent[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return; // Directory doesn't exist
    }

    for (const entry of entries) {
      // Follow symlinks — check with stat, not lstat
      const entryPath = path.join(dir, entry.name);
      let isDir = entry.isDirectory();
      if (entry.isSymbolicLink()) {
        try {
          const stat = await fs.stat(entryPath);
          isDir = stat.isDirectory();
        } catch {
          continue; // Broken symlink
        }
      }
      if (!isDir) continue;

      const skillId = entry.name;
      if (!SAFE_ID_RE.test(skillId)) continue;

      // Verify SKILL.md exists
      try {
        await fs.access(path.join(entryPath, 'SKILL.md'));
      } catch {
        continue;
      }

      // Resolve symlinks for the actual path
      let resolvedPath: string;
      try {
        resolvedPath = await fs.realpath(entryPath);
      } catch {
        resolvedPath = entryPath;
      }

      discovered.set(skillId, { skillPath: resolvedPath, scope });
    }
  }

  /**
   * Scan `~/.claude/commands/` for markdown files.
   * Returns parsed commands for registration in the command palette.
   */
  async scanClaudeCommands(commandsDir: string): Promise<Array<{ id: string; name: string; body: string }>> {
    let entries: import('node:fs').Dirent[];
    try {
      entries = await fs.readdir(commandsDir, { withFileTypes: true });
    } catch {
      return []; // Directory doesn't exist
    }

    const commands: Array<{ id: string; name: string; body: string }> = [];
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
      const id = entry.name.replace(/\.md$/, '');
      const name = id.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      try {
        const body = await fs.readFile(path.join(commandsDir, entry.name), 'utf-8');
        if (body.trim()) {
          commands.push({ id, name, body: body.trim() });
        }
      } catch {
        // Skip unreadable files
      }
    }
    return commands;
  }

  /**
   * On first launch, install default skills from the registry.
   * Idempotent: skips if any skills are already installed.
   */
  async ensureDefaults(): Promise<void> {
    const existing = this.repository.listAll();
    if (existing.length > 0) return;

    try {
      const defaultIds = await this.registryManager.getSkillDefaults();
      if (defaultIds.length === 0) return;

      const registrySkills = await this.registryManager.getSkills();
      const toInstall = registrySkills.filter((s) => defaultIds.includes(s.id));

      for (const skill of toInstall) {
        try {
          await this.install(skill);
        } catch (err) {
          const error = err instanceof Error ? err.message : String(err);
          this.logger.warn('Failed to install default skill', { skillId: skill.id, error });
        }
      }

      if (toInstall.length > 0) {
        this.logger.info('Installed default skills', { count: toInstall.length });
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      this.logger.warn('Failed to install default skills', { error });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Installation
  // ─────────────────────────────────────────────────────────────────────────────

  async install(registrySkill: RegistrySkill, destination?: string): Promise<InstalledSkillRecord> {
    assertSafeId(registrySkill.id, 'Skill ID');
    const baseDir = destination ?? this.skillsDir;

    // Defense in depth: validate destination is under allowed paths
    if (destination) {
      const resolved = path.resolve(destination);
      const globalSkills = path.join(os.homedir(), '.claude', 'skills');
      const isGlobal = resolved === globalSkills || resolved.startsWith(globalSkills + '/');
      const isProjectSkills = resolved.endsWith('/.claude/skills');
      const isDefaultDir = resolved === path.resolve(this.skillsDir);
      if (!isGlobal && !isProjectSkills && !isDefaultDir) {
        throw new Error('Invalid install destination: must be a .claude/skills directory');
      }
    }

    await fs.mkdir(baseDir, { recursive: true });
    const skillDir = path.join(baseDir, registrySkill.id);

    // Check if already installed
    const existing = this.repository.getById(registrySkill.id);
    if (existing) {
      throw new Error(`Skill "${registrySkill.id}" is already installed`);
    }

    if (registrySkill.source === 'inline') {
      await this.installInline(registrySkill, skillDir);
    } else if (registrySkill.source === 'github') {
      await this.installFromGithub(registrySkill, skillDir);
    } else {
      throw new Error(`Unknown skill source: ${registrySkill.source}`);
    }

    // Parse the installed SKILL.md to get version + metadata
    const skillMdPath = path.join(skillDir, 'SKILL.md');
    const parsed = await parseSkillFile(skillMdPath);

    const input: CreateInstalledSkillInput = {
      id: registrySkill.id,
      name: parsed.frontmatter.name,
      description: parsed.frontmatter.description,
      version: parsed.frontmatter.version ?? null,
      registryVersion: registrySkill.version ?? null,
      source: registrySkill.source,
      sourceRef: registrySkill.source === 'github' ? (registrySkill.repo ?? null) : (registrySkill.registry ?? null),
      registry: registrySkill.registry ?? null,
      path: skillDir,
      icon: parsed.frontmatter.icon ?? registrySkill.icon ?? null,
      category: parsed.frontmatter.category ?? registrySkill.category ?? null,
      tags: parsed.frontmatter.tags.length > 0 ? parsed.frontmatter.tags : registrySkill.tags,
      author: parsed.frontmatter.author ?? registrySkill.author?.name ?? null,
    };

    const record = this.repository.create(input);
    this.logger.info('Skill installed', { skillId: record.id, source: registrySkill.source });
    this.notifySkillsChanged();
    return record;
  }

  async uninstall(skillId: string): Promise<boolean> {
    const skill = this.repository.getById(skillId);
    if (!skill) return false;

    // Local skills: only remove DB record, don't delete user's files
    if (skill.source !== 'local') {
      try {
        await fs.rm(skill.path, { recursive: true, force: true });
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        this.logger.warn('Failed to remove skill directory', { skillId, error });
      }
    }

    const deleted = this.repository.delete(skillId);
    if (deleted) {
      this.logger.info('Skill uninstalled', { skillId });
      this.notifySkillsChanged();
    }
    return deleted;
  }

  async update(skillId: string): Promise<InstalledSkillRecord> {
    assertSafeId(skillId, 'Skill ID');
    const existing = this.repository.getById(skillId);
    if (!existing) {
      throw new Error(`Skill "${skillId}" is not installed`);
    }
    if (existing.source === 'local') {
      throw new Error(`Local skill "${skillId}" cannot be updated via registry — edit the SKILL.md file directly`);
    }

    // Validate the stored path is under an allowed location
    const resolvedPath = path.resolve(existing.path);
    const globalSkills = path.join(os.homedir(), '.claude', 'skills');
    const isUnderAllowed =
      resolvedPath.startsWith(path.resolve(this.skillsDir) + '/') ||
      resolvedPath.startsWith(globalSkills + '/') ||
      resolvedPath.includes('/.claude/skills/');
    if (!isUnderAllowed) {
      throw new Error(`Skill path "${existing.path}" is not under an allowed directory`);
    }

    // Find the skill in the registry
    const registrySkills = await this.registryManager.getSkills();
    const registrySkill = registrySkills.find((s) => s.id === skillId);
    if (!registrySkill) {
      throw new Error(`Skill "${skillId}" not found in any registry`);
    }

    // Install to a temporary directory first, then swap atomically.
    // This prevents data loss if the install step fails.
    // Use the stored path so updates go to wherever the skill was originally installed.
    const skillDir = existing.path;
    const backupDir = `${skillDir}__backup`;
    const tmpDir = `${skillDir}__update`;

    try {
      // Install new version to temp directory
      if (registrySkill.source === 'inline') {
        await this.installInline(registrySkill, tmpDir);
      } else if (registrySkill.source === 'github') {
        await this.installFromGithub(registrySkill, tmpDir);
      } else {
        throw new Error(`Unknown skill source: ${registrySkill.source}`);
      }

      // Swap: old → backup, new → target
      await fs.rename(skillDir, backupDir).catch(() => {});
      await fs.rename(tmpDir, skillDir);

      // Remove backup
      await fs.rm(backupDir, { recursive: true, force: true }).catch(() => {});
    } catch (err) {
      // Restore backup if swap failed
      const backupExists = await fs.access(backupDir).then(() => true, () => false);
      const targetExists = await fs.access(skillDir).then(() => true, () => false);
      if (backupExists && !targetExists) {
        await fs.rename(backupDir, skillDir).catch(() => {});
      }
      // Clean up temp dir
      await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
      throw err;
    }

    // Update DB record: delete old, re-parse and re-create
    this.repository.delete(skillId);
    const skillMdPath = path.join(skillDir, 'SKILL.md');
    const parsed = await parseSkillFile(skillMdPath);

    const input: CreateInstalledSkillInput = {
      id: registrySkill.id,
      name: parsed.frontmatter.name,
      description: parsed.frontmatter.description,
      version: parsed.frontmatter.version ?? null,
      registryVersion: registrySkill.version ?? null,
      source: registrySkill.source,
      sourceRef: registrySkill.source === 'github' ? (registrySkill.repo ?? null) : (registrySkill.registry ?? null),
      registry: registrySkill.registry ?? null,
      path: skillDir,
      icon: parsed.frontmatter.icon ?? registrySkill.icon ?? null,
      category: parsed.frontmatter.category ?? registrySkill.category ?? null,
      tags: parsed.frontmatter.tags.length > 0 ? parsed.frontmatter.tags : registrySkill.tags,
      author: parsed.frontmatter.author ?? registrySkill.author?.name ?? null,
    };

    const record = this.repository.create(input);
    this.logger.info('Skill updated', { skillId: record.id, source: registrySkill.source });
    this.notifySkillsChanged();
    return record;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Queries
  // ─────────────────────────────────────────────────────────────────────────────

  list(): InstalledSkillRecord[] {
    return this.repository.listAll();
  }

  listEnabled(): InstalledSkillRecord[] {
    return this.repository.listEnabled();
  }

  getById(id: string): InstalledSkillRecord | null {
    return this.repository.getById(id);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Activation (one-shot prompt injection)
  // ─────────────────────────────────────────────────────────────────────────────

  /** Build the template variable map for skill body interpolation. */
  private getTemplateVariables(): Record<string, string> {
    const isDev = mainEnv.NODE_ENV === 'development';
    return {
      DOCS_BASE_URL: isDev ? 'http://localhost:5173/docs' : 'https://tryvienna.dev/docs',
    };
  }

  /**
   * Activate a skill: read its SKILL.md body, interpolate template variables,
   * record usage, and return the resolved body.
   * The caller is responsible for injecting this into the message context.
   */
  async activate(skillId: string): Promise<string> {
    const skill = this.repository.getById(skillId);
    if (!skill) {
      throw new Error(`Skill "${skillId}" is not installed`);
    }
    if (!skill.enabled) {
      throw new Error(`Skill "${skillId}" is disabled`);
    }

    const skillMdPath = path.join(skill.path, 'SKILL.md');
    try {
      const content = await fs.readFile(skillMdPath, 'utf-8');
      const body = extractBody(content);
      if (!body) {
        throw new Error(`SKILL.md for "${skillId}" has no body content`);
      }

      const resolved = interpolateTemplateVars(body, this.getTemplateVariables());
      this.repository.recordUsage(skillId);
      return resolved;
    } catch (err) {
      if (err instanceof Error && err.message.includes('has no body')) throw err;
      throw new Error(`Failed to read SKILL.md for "${skillId}": ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Updates
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Check installed skills against registry versions.
   * Returns skills that have a newer version available.
   */
  async checkUpdates(): Promise<Array<{ id: string; installedVersion: string | null; registryVersion: string | null }>> {
    const installed = this.repository.listAll();
    const registrySkills = await this.registryManager.getSkills();
    const registryMap = new Map(registrySkills.map((s) => [s.id, s]));

    const updates: Array<{ id: string; installedVersion: string | null; registryVersion: string | null }> = [];

    for (const skill of installed) {
      if (skill.source === 'local') continue; // Local skills are user-managed
      const registrySkill = registryMap.get(skill.id);
      if (!registrySkill) continue;

      const registryVersion = registrySkill.version ?? null;

      // Update the stored registry version
      if (registryVersion !== skill.registryVersion) {
        this.repository.updateRegistryVersion(skill.id, registryVersion ?? '');
      }

      // Report if versions differ
      if (registryVersion && registryVersion !== skill.version) {
        updates.push({
          id: skill.id,
          installedVersion: skill.version,
          registryVersion,
        });
      }
    }

    return updates;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Enable / Pin
  // ─────────────────────────────────────────────────────────────────────────────

  toggleEnabled(id: string, enabled: boolean): InstalledSkillRecord | null {
    const result = this.repository.setEnabled(id, enabled);
    if (result) this.notifySkillsChanged();
    return result;
  }

  togglePinned(id: string, pinned: boolean): InstalledSkillRecord | null {
    return this.repository.setPinned(id, pinned);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Internal
  // ─────────────────────────────────────────────────────────────────────────────

  private async installInline(registrySkill: RegistrySkill, destDir: string): Promise<void> {
    // Find which registry has this skill
    const registries = this.registryManager.listEnabled();
    let sourceContent: string | null = null;

    for (const reg of registries) {
      sourceContent = await this.registryManager.getSkillContent(reg.name, registrySkill.id);
      if (sourceContent) break;
    }

    if (!sourceContent) {
      throw new Error(`Inline skill "${registrySkill.id}" not found in any registry cache`);
    }

    // Create directory and write SKILL.md
    await fs.mkdir(destDir, { recursive: true });
    await fs.writeFile(path.join(destDir, 'SKILL.md'), sourceContent, 'utf-8');

    // Also copy any other files from the registry skill directory
    for (const reg of registries) {
      assertSafeId(reg.name, 'Registry name');
      const regSkillDir = path.join(this.skillsDir, '..', 'registry-cache', reg.name, 'skills', registrySkill.id);
      try {
        const entries = await fs.readdir(regSkillDir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.name === 'SKILL.md') continue; // already copied
          const srcPath = path.join(regSkillDir, entry.name);
          const dstPath = path.join(destDir, entry.name);
          if (entry.isDirectory()) {
            await fs.cp(srcPath, dstPath, { recursive: true });
          } else {
            await fs.copyFile(srcPath, dstPath);
          }
        }
        break; // Found the registry with this skill
      } catch {
        // Try next registry
      }
    }
  }

  private async installFromGithub(registrySkill: RegistrySkill, destDir: string): Promise<void> {
    if (!registrySkill.repo) {
      throw new Error(`GitHub skill "${registrySkill.id}" missing repo URL`);
    }
    assertSafeRepoUrl(registrySkill.repo);

    if (registrySkill.path) {
      // Clone to a temp directory, then copy only the subdirectory
      const tmpDir = `${destDir}__tmp`;
      try {
        await this.gitClient.clone(registrySkill.repo, tmpDir, { depth: 1 });
        const srcDir = path.join(tmpDir, registrySkill.path);
        // Ensure the resolved path stays within the cloned repo
        assertPathContainment(srcDir, tmpDir);
        // Verify the subdirectory exists
        await fs.access(srcDir);
        await fs.mkdir(destDir, { recursive: true });
        await fs.cp(srcDir, destDir, { recursive: true });
      } finally {
        await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
      }
    } else {
      await this.gitClient.clone(registrySkill.repo, destDir, { depth: 1 });
      // Remove .git directory to save space
      try {
        await fs.rm(path.join(destDir, '.git'), { recursive: true, force: true });
      } catch {
        // Non-critical
      }
    }
  }
}
