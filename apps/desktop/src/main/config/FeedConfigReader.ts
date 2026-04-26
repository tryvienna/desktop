/**
 * FeedConfigReader — Reads feed.md from profile, global, and project directories.
 *
 * Discovers feed.md files across three tiers:
 * - Profile: <contentProfileDir>/feed.md (active content profile's baseline)
 * - Global: <profileDir>/feed.md (user's personal overrides)
 * - Project: <projectDir>/.vienna/feed.md (per project directory)
 *
 * Merges by concatenation with tier headers. Later tiers have stronger AI priority.
 *
 * Follows the same error-tolerant pattern as ProjectConfigReader.
 *
 * @module main/config/FeedConfigReader
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

export interface FeedMdSource {
  tier: 'profile' | 'global' | 'project';
  path: string;
  content: string;
}

export interface FeedConfigResult {
  /** Merged feed.md content with tier headers */
  mergedContent: string;
  /** Individual sources that were found */
  sources: FeedMdSource[];
}

export interface FeedConfigReaderDeps {
  logger: {
    info: (msg: string, ctx?: Record<string, unknown>) => void;
    warn: (msg: string, ctx?: Record<string, unknown>) => void;
  };
}

/**
 * Regex that matches tier headers injected by FeedConfigReader during merge.
 * Used by FeedManager to strip auto-injected headers before checking for real user content.
 */
export const TIER_HEADER_RE = /^##\s+(?:Profile|Global|Project)\s+Feed Instructions.*$/gm;

export class FeedConfigReader {
  private readonly logger: FeedConfigReaderDeps['logger'];

  constructor(deps: FeedConfigReaderDeps) {
    this.logger = deps.logger;
  }

  /**
   * Read feed.md from all tiers and return merged content.
   * Returns null if no feed.md is found at any tier.
   */
  readAndMerge(params: {
    contentProfileDir?: string;
    profileDir: string;
    projectDirs: string[];
  }): FeedConfigResult | null {
    const sources: FeedMdSource[] = [];

    // Profile tier: <contentProfileDir>/feed.md (lowest priority)
    if (params.contentProfileDir) {
      const profilePath = path.join(params.contentProfileDir, 'feed.md');
      const profileContent = this.readFile(profilePath);
      if (profileContent) {
        sources.push({ tier: 'profile', path: profilePath, content: profileContent });
      }
    }

    // Global tier: <profileDir>/feed.md
    const globalPath = path.join(params.profileDir, 'feed.md');
    const globalContent = this.readFile(globalPath);
    if (globalContent) {
      sources.push({ tier: 'global', path: globalPath, content: globalContent });
    }

    // Project tier: <projectDir>/.vienna/feed.md (highest priority)
    for (const dir of params.projectDirs) {
      const projectPath = path.join(dir, '.vienna', 'feed.md');
      const projectContent = this.readFile(projectPath);
      if (projectContent) {
        sources.push({ tier: 'project', path: projectPath, content: projectContent });
      }
    }

    if (sources.length === 0) {
      return null;
    }

    this.logger.info('Loaded feed.md configuration', {
      sources: sources.map((s) => ({ tier: s.tier, path: s.path })),
    });

    // Merge: concatenate with tier headers, project content last (strongest signal)
    const sections = sources.map((source) => {
      const label =
        source.tier === 'profile'
          ? '## Profile Feed Instructions'
          : source.tier === 'global'
            ? '## Global Feed Instructions'
            : `## Project Feed Instructions: ${path.dirname(path.dirname(source.path))}`;
      return `${label}\n\n${source.content}`;
    });

    return {
      mergedContent: sections.join('\n\n'),
      sources,
    };
  }

  private readFile(filePath: string): string | null {
    try {
      const content = fs.readFileSync(filePath, 'utf-8').trim();
      return content || null;
    } catch {
      return null;
    }
  }
}
