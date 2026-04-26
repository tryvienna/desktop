/**
 * SkillSymlinkManager — Bridges .vienna/skills/ to .claude/skills/ via symlinks.
 *
 * Vienna manages skills in .vienna/skills/ directories (global and per-project).
 * This manager automatically creates symlinks in the corresponding .claude/skills/
 * directories so that Claude Code can discover them natively.
 *
 * Symlink ownership: only symlinks pointing into .vienna/ directories are managed.
 * User-created symlinks or regular directories in .claude/skills/ are never touched.
 *
 * @module main/skills/SkillSymlinkManager
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';

export interface SkillSymlinkManagerDeps {
  logger: {
    info: (msg: string, ctx?: Record<string, unknown>) => void;
    warn: (msg: string, ctx?: Record<string, unknown>) => void;
  };
}

export class SkillSymlinkManager {
  private readonly logger: SkillSymlinkManagerDeps['logger'];

  constructor(deps: SkillSymlinkManagerDeps) {
    this.logger = deps.logger;
  }

  /**
   * Sync symlinks from a specific profile's skills directory → ~/.claude/skills/.
   * Called on startup and after profile switches with the active profile's skills dir.
   */
  async syncGlobalFromProfile(profileSkillsDir: string): Promise<void> {
    const claudeSkillsDir = path.join(os.homedir(), '.claude', 'skills');
    await this.reconcile(profileSkillsDir, claudeSkillsDir);
  }

  /**
   * Sync symlinks for a single project directory:
   * <projectDir>/.vienna/skills/ → <projectDir>/.claude/skills/
   */
  async syncProject(projectDir: string): Promise<void> {
    const viennaSkillsDir = path.join(projectDir, '.vienna', 'skills');
    const claudeSkillsDir = path.join(projectDir, '.claude', 'skills');
    await this.reconcile(viennaSkillsDir, claudeSkillsDir);
  }

  /**
   * Sync symlinks for multiple project directories.
   */
  async syncProjects(projectDirs: string[]): Promise<void> {
    for (const dir of projectDirs) {
      await this.syncProject(dir);
    }
  }

  /**
   * Reconcile symlinks: create missing, update stale, remove orphaned.
   *
   * Only manages symlinks that point into .vienna/ directories.
   * Regular files/dirs and symlinks to other targets are untouched.
   */
  private async reconcile(viennaDir: string, claudeDir: string): Promise<void> {
    // Scan vienna skills
    const viennaSkills = await this.scanSkillIds(viennaDir);
    if (viennaSkills.size === 0 && !(await dirExists(claudeDir))) {
      // No vienna skills and no claude dir — nothing to do
      return;
    }

    // Ensure claude skills directory exists
    await fs.mkdir(claudeDir, { recursive: true });

    // Create or update symlinks for each vienna skill
    for (const [skillId, skillPath] of viennaSkills) {
      const linkPath = path.join(claudeDir, skillId);
      const existingTarget = await readSymlinkTarget(linkPath);

      if (existingTarget === skillPath) {
        continue; // Already correct
      }

      if (existingTarget !== null) {
        // Symlink exists but points elsewhere
        if (isViennaManaged(existingTarget)) {
          // Stale vienna-managed symlink — replace it
          await fs.rm(linkPath, { recursive: true });
        } else {
          // Non-vienna symlink or regular file — don't touch
          this.logger.warn('Skipping skill symlink — target exists and is not vienna-managed', {
            skillId,
            existing: existingTarget,
          });
          continue;
        }
      } else {
        // Check if a non-symlink entry exists
        const exists = await entryExists(linkPath);
        if (exists) {
          this.logger.warn('Skipping skill symlink — non-symlink entry exists', {
            skillId,
            path: linkPath,
          });
          continue;
        }
      }

      await fs.symlink(skillPath, linkPath);
      this.logger.info('Created skill symlink', { skillId, from: linkPath, to: skillPath });
    }

    // Remove stale vienna-managed symlinks
    try {
      const entries = await fs.readdir(claudeDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isSymbolicLink()) continue;

        const linkPath = path.join(claudeDir, entry.name);
        const target = await readSymlinkTarget(linkPath);
        if (target !== null && isViennaManaged(target) && !viennaSkills.has(entry.name)) {
          await fs.rm(linkPath);
          this.logger.info('Removed stale skill symlink', { skillId: entry.name, target });
        }
      }
    } catch {
      // Directory read failed — not critical
    }
  }

  /**
   * Scan a directory for skill subdirectories (directories containing SKILL.md).
   * Returns a map of skillId → absolute path.
   */
  private async scanSkillIds(dir: string): Promise<Map<string, string>> {
    const skills = new Map<string, string>();

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;

        const skillDir = path.join(dir, entry.name);
        const skillMdPath = path.join(skillDir, 'SKILL.md');

        try {
          await fs.access(skillMdPath);
          // Resolve to absolute path (follows symlinks)
          const resolved = await fs.realpath(skillDir);
          skills.set(entry.name, resolved);
        } catch {
          // No SKILL.md — skip
        }
      }
    } catch {
      // Directory doesn't exist or can't be read — return empty
    }

    return skills;
  }
}

/** Check if a symlink target is managed by Vienna (points into a .vienna/ directory). */
function isViennaManaged(target: string): boolean {
  // Normalize path separators for cross-platform
  const normalized = target.replace(/\\/g, '/');
  return normalized.includes('/.vienna/');
}

/** Read the target of a symlink, or null if not a symlink. */
async function readSymlinkTarget(linkPath: string): Promise<string | null> {
  try {
    const stat = await fs.lstat(linkPath);
    if (!stat.isSymbolicLink()) return null;
    const target = await fs.readlink(linkPath);
    // Resolve relative symlinks to absolute
    return path.isAbsolute(target) ? target : path.resolve(path.dirname(linkPath), target);
  } catch {
    return null;
  }
}

/** Check if a filesystem entry exists (doesn't follow symlinks). */
async function entryExists(p: string): Promise<boolean> {
  try {
    await fs.lstat(p);
    return true;
  } catch {
    return false;
  }
}

/** Check if a directory exists. */
async function dirExists(p: string): Promise<boolean> {
  try {
    const stat = await fs.stat(p);
    return stat.isDirectory();
  } catch {
    return false;
  }
}
