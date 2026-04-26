/**
 * FeedManager — Orchestrates the home feed system.
 *
 * Manages the feed workstream lifecycle:
 * - Discovers/creates the feed workstream per project
 * - Reads feed.md, builds the AI prompt, and sends it to the workstream
 * - Supports refresh (clear + re-process)
 *
 * Follows the RoutineExecutor pattern for system-owned workstreams.
 *
 * @module main/feed/FeedManager
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { WorkstreamRepository } from '@vienna/app-db';
import type { EventRepository } from '@vienna/agent-db';
import type { WorkstreamManager } from '../workstream/WorkstreamManager';
import type { PluginSystem } from '@tryvienna/sdk';
import { FeedConfigReader, TIER_HEADER_RE } from '../config/FeedConfigReader';
import { buildFeedSystemPrompt } from '@tryvienna/ui/feed/prompt';
import { parseFeedMd, extractPromptText, extractInlineSpecs } from '@tryvienna/ui/feed/parse-feed-md';
import type { FeedCardSpec, FeedMdSegment } from '@tryvienna/ui/feed';

/** Returns true if the file exists and has non-whitespace content. */
function hasNonEmptyFile(filePath: string): boolean {
  try {
    return fs.readFileSync(filePath, 'utf-8').trim().length > 0;
  } catch {
    return false;
  }
}

export interface FeedManagerDeps {
  workstreamManager: WorkstreamManager;
  workstreamRepo: WorkstreamRepository;
  eventRepo: EventRepository;
  pluginSystem: PluginSystem;
  profileDir: string;
  /** Returns the active content profile's directory. Dynamic — changes on profile switch. */
  getContentProfileDir?: () => string;
  /** Invalidate GraphQL cache to notify the renderer of new workstreams. */
  onInvalidate?: (payload: { typename: string }) => void;
  logger: {
    info: (msg: string, ctx?: Record<string, unknown>) => void;
    warn: (msg: string, ctx?: Record<string, unknown>) => void;
    error: (msg: string, ctx?: Record<string, unknown>) => void;
  };
}

export class FeedManager {
  private readonly workstreamManager: WorkstreamManager;
  private readonly workstreamRepo: WorkstreamRepository;
  private readonly eventRepo: EventRepository;
  private readonly pluginSystem: PluginSystem;
  private readonly feedConfigReader: FeedConfigReader;
  private readonly profileDir: string;
  private readonly getContentProfileDir?: () => string;
  private readonly onInvalidate?: FeedManagerDeps['onInvalidate'];
  private readonly logger: FeedManagerDeps['logger'];

  /** Cache: projectId → feed workstream ID */
  private feedWorkstreams = new Map<string, string>();
  /** Cache: projectId → parsed feed.md segments (for inline spec retrieval) */
  private feedSegments = new Map<string, FeedMdSegment[]>();
  /** Guard against concurrent ensureFeedWorkstream calls for the same project */
  private pendingEnsure = new Map<string, Promise<string>>();

  constructor(deps: FeedManagerDeps) {
    this.workstreamManager = deps.workstreamManager;
    this.workstreamRepo = deps.workstreamRepo;
    this.eventRepo = deps.eventRepo;
    this.pluginSystem = deps.pluginSystem;
    this.profileDir = deps.profileDir;
    this.getContentProfileDir = deps.getContentProfileDir;
    this.onInvalidate = deps.onInvalidate;
    this.logger = deps.logger;
    this.feedConfigReader = new FeedConfigReader({ logger: deps.logger });

    this.migrateDefaultWidgets();
  }

  /**
   * One-time migration: add default native widgets to existing feed.md files.
   * Each widget has its own sentinel file so new widgets can be added in future
   * releases without re-running old migrations. New users get all widgets via
   * the defaultFeedContent() template in FeedEditorDrawer.
   */
  private migrateDefaultWidgets(): void {
    const DEFAULT_WIDGETS = [
      {
        line: '@vienna//widget/workstreams?sections=needs_action,completed',
        pattern: /@vienna\/\/widget\/workstreams(\?|$)/,
        sentinel: '.feed-widget-workstreams-migrated',
      },
      {
        line: '@vienna//widget/tasks?statuses=todo,in_progress',
        pattern: /@vienna\/\/widget\/tasks(\?|$)/,
        sentinel: '.feed-widget-tasks-migrated',
      },
    ];

    const contentProfileDir = this.getContentProfileDir?.();
    const feedPath = contentProfileDir
      ? path.join(contentProfileDir, 'feed.md')
      : path.join(this.profileDir, 'feed.md');

    for (const widget of DEFAULT_WIDGETS) {
      const sentinelPath = path.join(this.profileDir, widget.sentinel);
      try {
        if (fs.existsSync(sentinelPath)) continue;

        if (fs.existsSync(feedPath)) {
          const content = fs.readFileSync(feedPath, 'utf-8');
          if (!widget.pattern.test(content)) {
            const newContent = `${widget.line}\n\n${content}`;
            fs.writeFileSync(feedPath, newContent, 'utf-8');
            this.logger.info('Migrated default widget into feed.md', { widget: widget.line, feedPath });
          }
        }

        fs.mkdirSync(path.dirname(sentinelPath), { recursive: true });
        fs.writeFileSync(sentinelPath, new Date().toISOString(), 'utf-8');
      } catch (err) {
        this.logger.warn('Failed to migrate default feed widget', {
          widget: widget.line,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  /**
   * Find or create the feed workstream for a project.
   * Returns the workstream ID.
   */
  async ensureFeedWorkstream(projectId: string): Promise<string> {
    // Coalesce concurrent calls for the same project
    const pending = this.pendingEnsure.get(projectId);
    if (pending) return pending;

    const promise = this.doEnsureFeedWorkstream(projectId).finally(() => {
      this.pendingEnsure.delete(projectId);
    });
    this.pendingEnsure.set(projectId, promise);
    return promise;
  }

  private async doEnsureFeedWorkstream(projectId: string): Promise<string> {
    // Check cache
    const cached = this.feedWorkstreams.get(projectId);
    if (cached) {
      const existing = this.workstreamRepo.getById(cached);
      if (existing) return cached;
      // Stale cache entry
      this.feedWorkstreams.delete(projectId);
    }

    // Check database
    const existing = this.workstreamRepo.getFeedByProject(projectId);
    if (existing) {
      this.feedWorkstreams.set(projectId, existing.id);
      return existing.id;
    }

    // Create new feed workstream
    const record = this.workstreamRepo.create({
      projectId,
      title: 'Home Feed',
      model: 'sonnet',
      isFeedWorkstream: true,
    });

    this.feedWorkstreams.set(projectId, record.id);
    this.logger.info('Created feed workstream', {
      projectId,
      workstreamId: record.id,
    });

    // Invalidate Apollo cache so the sidebar picks up the new workstream
    this.onInvalidate?.({ typename: 'Workstream' });

    return record.id;
  }

  /**
   * Process the feed: read feed.md, build prompt, send to workstream.
   * Returns false if no feed.md is found.
   */
  async processFeed(
    projectId: string,
    projectDirs: string[],
  ): Promise<boolean> {
    // Read and merge feed.md from all tiers
    const feedConfig = this.feedConfigReader.readAndMerge({
      contentProfileDir: this.getContentProfileDir?.(),
      profileDir: this.profileDir,
      projectDirs,
    });

    if (!feedConfig) {
      this.logger.info('No feed.md found', { projectId });
      return false;
    }

    try {
      // Parse feed.md into segments: prompt text vs inline json-render specs
      const segments = parseFeedMd(feedConfig.mergedContent);
      this.feedSegments.set(projectId, segments);

      // Extract only prompt text to send to the LLM (inline specs are rendered directly)
      const promptText = extractPromptText(segments);
      const inlineSpecs = extractInlineSpecs(segments);

      this.logger.info('Parsed feed.md segments', {
        projectId,
        totalSegments: segments.length,
        promptSegments: segments.filter((s) => s.type === 'prompt').length,
        inlineSpecs: inlineSpecs.length,
        pluginFeeds: segments.filter((s) => s.type === 'plugin-feed').length,
        entityFeeds: segments.filter((s) => s.type === 'entity-feed').length,
      });

      // If there are no prompt segments (empty feed, plugin-only, inline-spec-only),
      // skip workstream creation entirely — no LLM processing needed.
      // Strip auto-injected tier headers (e.g. "## Global Feed Instructions") before checking,
      // since they're added by FeedConfigReader and aren't real user content.
      const userPromptText = promptText.replace(TIER_HEADER_RE, '').trim();
      if (!userPromptText) {
        this.logger.info('Feed has no prompt text, skipping LLM call and workstream creation', { projectId });
        return true;
      }

      // Build plugin component descriptions for the prompt
      const pluginFeedCanvases = this.pluginSystem.getFeedCanvases();
      const pluginDescriptions = pluginFeedCanvases.map((canvas: { pluginId: string; config: { label: string; description?: string } }) => ({
        name: `${canvas.pluginId}.${canvas.config.label}`,
        description: canvas.config.description ?? `Feed canvas from ${canvas.pluginId} plugin`,
        props: {} as Record<string, { type: string; description: string }>,
      }));

      // Build the system prompt with component catalog
      const systemPrompt = buildFeedSystemPrompt(pluginDescriptions);

      // Ensure the feed workstream exists
      const workstreamId = await this.ensureFeedWorkstream(projectId);

      // Combine system instructions and prompt-only feed content.
      // Inline specs have been stripped — only LLM-processable instructions remain.
      const message = `${systemPrompt}\n\n---\n\n## Feed Instructions from feed.md\n\n${promptText}`;

      await this.workstreamManager.sendMessage(workstreamId, message);
      this.logger.info('Feed processing started', {
        projectId,
        workstreamId,
        sources: feedConfig.sources.length,
      });
      return true;
    } catch (err) {
      this.logger.error('Failed to process feed', {
        projectId,
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
      return false;
    }
  }

  /**
   * Refresh the feed: clear conversation and re-process.
   */
  async refreshFeed(
    projectId: string,
    projectDirs: string[],
  ): Promise<boolean> {
    // Clear cached segments so they're re-parsed from the updated feed.md
    this.feedSegments.delete(projectId);

    const workstreamId = this.feedWorkstreams.get(projectId);
    if (workstreamId) {
      try {
        await this.workstreamManager.clearConversation(workstreamId);
      } catch {
        // Ignore clear errors — may not have a conversation yet
      }
    }

    return this.processFeed(projectId, projectDirs);
  }

  /**
   * Check if any feed.md has non-empty content for a project.
   * A file that exists but is empty or whitespace-only is treated as absent.
   */
  hasFeedConfig(projectDirs: string[]): boolean {
    const contentProfileDir = this.getContentProfileDir?.();
    if (contentProfileDir && hasNonEmptyFile(path.join(contentProfileDir, 'feed.md'))) return true;
    if (hasNonEmptyFile(path.join(this.profileDir, 'feed.md'))) return true;
    return projectDirs.some((dir) => hasNonEmptyFile(path.join(dir, '.vienna', 'feed.md')));
  }

  /**
   * Get cached feed content: the last AI response text and when it was generated.
   * Returns null if no feed workstream or no response yet.
   */
  getFeedContent(projectId: string): { responseText: string; lastActivityAt: number } | null {
    const workstreamId = this.getFeedWorkstreamId(projectId);
    if (!workstreamId) return null;

    const record = this.workstreamRepo.getById(workstreamId);
    if (!record?.lastActivityAt) return null;

    // Get the last events across all sessions for this workstream.
    // activeSessionId is cleared when a session ends, so we query by workstream instead.
    const tailEvents = this.eventRepo.getByWorkstreamTail(workstreamId, 50);
    // Find the last text_done event (contains the full AI response).
    // better-sqlite3 returns raw snake_case column names (event_type),
    // despite the EventRecord type alias using camelCase.
    const textDoneEvent = [...tailEvents].reverse().find(
      (e) => (e as unknown as { event_type: string }).event_type === 'text_done',
    );
    if (!textDoneEvent) return null;

    const payload = JSON.parse(textDoneEvent.payload) as { fullText?: string; text?: string };
    const responseText = payload.fullText ?? payload.text;
    if (!responseText) return null;

    return { responseText, lastActivityAt: record.lastActivityAt };
  }

  /**
   * List all possible feed.md file locations for a project.
   */
  listFeedFiles(projectDirs: string[]): Array<{ tier: 'profile' | 'global' | 'project'; path: string; exists: boolean; label: string }> {
    const files: Array<{ tier: 'profile' | 'global' | 'project'; path: string; exists: boolean; label: string }> = [];

    // Profile tier (content profile)
    const contentProfileDir = this.getContentProfileDir?.();
    if (contentProfileDir) {
      const profilePath = path.join(contentProfileDir, 'feed.md');
      files.push({
        tier: 'profile',
        path: profilePath,
        exists: fs.existsSync(profilePath),
        label: 'Profile',
      });
    }

    // Global tier
    const globalPath = path.join(this.profileDir, 'feed.md');
    files.push({
      tier: 'global',
      path: globalPath,
      exists: fs.existsSync(globalPath),
      label: 'Global',
    });

    // Project tier(s)
    for (const dir of projectDirs) {
      const projectPath = path.join(dir, '.vienna', 'feed.md');
      const dirName = path.basename(dir);
      files.push({
        tier: 'project',
        path: projectPath,
        exists: fs.existsSync(projectPath),
        label: `Project: ${dirName}`,
      });
    }

    return files;
  }

  /**
   * Validate that a file path is a known feed.md location.
   * Prevents path traversal attacks from the renderer process.
   */
  private isAllowedFeedPath(filePath: string, projectDirs: string[]): boolean {
    const resolved = path.resolve(filePath);
    // Content profile tier
    const contentProfileDir = this.getContentProfileDir?.();
    if (contentProfileDir && resolved === path.resolve(contentProfileDir, 'feed.md')) return true;
    // Global tier
    const globalPath = path.resolve(this.profileDir, 'feed.md');
    if (resolved === globalPath) return true;
    // Project tier
    return projectDirs.some((dir) =>
      resolved === path.resolve(dir, '.vienna', 'feed.md'),
    );
  }

  /**
   * Read a specific feed.md file. Validates the path is a known feed location.
   */
  readFeedFile(filePath: string, projectDirs: string[]): { content: string; exists: boolean } {
    if (!this.isAllowedFeedPath(filePath, projectDirs)) {
      this.logger.warn('Blocked read of non-feed path', { filePath });
      return { content: '', exists: false };
    }
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return { content, exists: true };
    } catch {
      return { content: '', exists: false };
    }
  }

  /**
   * Write content to a feed.md file. Validates the path is a known feed location.
   * Creates parent directories if needed.
   */
  writeFeedFile(filePath: string, content: string, projectDirs: string[]): { success: boolean; error?: string } {
    if (!this.isAllowedFeedPath(filePath, projectDirs)) {
      this.logger.warn('Blocked write to non-feed path', { filePath });
      return { success: false, error: 'Path is not a valid feed.md location' };
    }
    try {
      const dir = path.dirname(filePath);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(filePath, content, 'utf-8');
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  /**
   * Get inline specs and segment metadata for a project.
   * Parses feed.md on demand if segments aren't cached yet.
   */
  getInlineSpecs(
    projectId: string,
    projectDirs: string[],
  ): { inlineSpecs: Array<{ index: number; spec: FeedCardSpec }>; segments: FeedMdSegment[] } {
    let segments = this.feedSegments.get(projectId);

    if (!segments) {
      // Parse on demand (e.g., loading from cache before processFeed ran)
      const feedConfig = this.feedConfigReader.readAndMerge({
        contentProfileDir: this.getContentProfileDir?.(),
        profileDir: this.profileDir,
        projectDirs,
      });
      if (!feedConfig) {
        return { inlineSpecs: [], segments: [] };
      }
      segments = parseFeedMd(feedConfig.mergedContent);
      this.feedSegments.set(projectId, segments);
    }

    return {
      inlineSpecs: extractInlineSpecs(segments),
      segments,
    };
  }

  /**
   * Get the feed workstream ID for a project (if it exists).
   */
  getFeedWorkstreamId(projectId: string): string | null {
    const cached = this.feedWorkstreams.get(projectId);
    if (cached) return cached;

    const existing = this.workstreamRepo.getFeedByProject(projectId);
    if (existing) {
      this.feedWorkstreams.set(projectId, existing.id);
      return existing.id;
    }

    return null;
  }
}
