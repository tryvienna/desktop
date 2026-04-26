/**
 * TagPipelineExecutor — Event-driven DAG pipeline executor for tags
 *
 * When a tag is applied to a workstream, this executor:
 * 1. Reads tag definitions from TagFileStore (JSON files)
 * 2. Expands transitive dependencies
 * 3. Applies all tags with snapshot data as "pending"
 * 4. Starts root tags (those with no unmet dependencies)
 * 5. When a tag completes, checks if any pending tags now have all deps met
 *
 * @module main/tags/TagPipelineExecutor
 */

import type { TagRepository, AppDb, WorkstreamTagRecord, WorkstreamTagAppliedBy } from '@vienna/app-db';
import type { TagFileStore, TagDefinition } from '@vienna/app-db';
import { expandTransitiveDependencies, connectedComponent } from '@vienna/app-db';
import type { Logger } from '@vienna/logger';
import type { WorkstreamManager } from '../workstream/WorkstreamManager';

const VALID_APPLIED_BY = new Set<string>(['manual', 'agent', 'trigger', 'pipeline']);

/** Subset of @vienna/git-utils used for worktree creation */
export interface GitOpsForTags {
  createWorktree(repoPath: string, branch: string, targetPath: string, startPoint?: string): Promise<void>;
  generateWorktreePath(repoPath: string, branch: string): string;
}

export interface TagPipelineExecutorDeps {
  tagRepo: TagRepository;
  tagFileStore: TagFileStore;
  db: AppDb;
  workstreamManager: WorkstreamManager;
  logger: Logger;
  gitOps?: GitOpsForTags;
  /** Called after tag DB mutations so the renderer can refetch queries */
  onInvalidate?: () => void;
}

interface SnapshotItem {
  tagName: string;
  color: string;
  status: string;
  dependsOn?: string[];
  waitingOn?: string[];
  delegatedWorkstreamId?: string;
  delegatedWorkstreamTitle?: string;
}

export class TagPipelineExecutor {
  private deps: TagPipelineExecutorDeps;
  private log: Logger;

  constructor(deps: TagPipelineExecutorDeps) {
    this.deps = deps;
    this.log = deps.logger.child({ service: 'TagPipelineExecutor' });
  }

  /** Notify renderer that workstream tag data changed */
  private invalidate(): void {
    this.deps.onInvalidate?.();
  }

  /**
   * Apply tags (by name) and all transitive dependencies to a workstream.
   * Reads definitions from TagFileStore, snapshots into DB.
   */
  async executePipeline(
    workstreamId: string,
    tagNames: string[],
    appliedBy: string,
    projectId: string,
  ): Promise<string> {
    if (tagNames.length === 0) {
      throw new Error('At least one tag name is required');
    }

    // Read merged tags from JSON files
    const allTags = this.deps.tagFileStore.getMerged(projectId);
    const tagsByName = new Map(allTags.map((l) => [l.name, l]));

    // Validate requested tags exist
    for (const name of tagNames) {
      if (!tagsByName.has(name)) {
        throw new Error(`Tag "${name}" not found`);
      }
    }

    // Build dependency edges from JSON definitions (using names as IDs)
    const allEdges = this.deps.tagFileStore.getDependencyEdges(projectId);

    // Expand to include all transitive dependencies
    const expandedNames = expandTransitiveDependencies(tagNames, allEdges);

    this.log.info('Applying tag pipeline', {
      workstreamId,
      tagNames,
      expandedCount: expandedNames.length,
    });

    const validatedAppliedBy: WorkstreamTagAppliedBy = VALID_APPLIED_BY.has(appliedBy)
      ? (appliedBy as WorkstreamTagAppliedBy)
      : 'manual';

    // Apply all tags to workstream as "pending" with snapshot data
    for (const name of expandedNames) {
      const tag = tagsByName.get(name);
      if (!tag) continue;

      const appliedByType: WorkstreamTagAppliedBy = tagNames.includes(name)
        ? validatedAppliedBy
        : 'pipeline';

      this.deps.tagRepo.applyTag(workstreamId, tag, appliedByType);
    }

    this.invalidate();

    // Start root tags — those with no dependencies among the applied set
    await this.startReadyTags(workstreamId);

    return 'ok';
  }

  /**
   * Called when the agent reports a tag as completed.
   */
  async onTagCompleted(workstreamId: string, completedTagName: string): Promise<void> {
    this.log.info('Tag completed, checking dependents', {
      workstreamId,
      completedTagName,
    });

    await this.startReadyTags(workstreamId);
    this.invalidate();
  }

  /**
   * Called when a tag fails. Skips all transitive dependents that can no longer run.
   */
  async onTagFailed(workstreamId: string, failedTagName: string): Promise<void> {
    this.log.info('Tag failed, skipping dependents', {
      workstreamId,
      failedTagName,
    });

    this.skipDependentsOf(workstreamId, failedTagName);
    await this.startReadyTags(workstreamId);
    this.invalidate();
  }

  /**
   * Skip all pending tags that transitively depend on the given tag.
   * Uses snapshot data from workstream_tags (no JSON lookup needed).
   */
  private skipDependentsOf(workstreamId: string, tagName: string): void {
    const wsTags = this.deps.tagRepo.getWorkstreamTags(workstreamId);
    const appliedNames = new Set(wsTags.map((wsl) => wsl.tagName));

    // Build edges from snapshot dependsOn arrays
    const edges = this.buildEdgesFromSnapshots(wsTags);

    // Find all tags that transitively depend on the failed tag
    const toSkip = new Set<string>();
    const stack = [tagName];
    while (stack.length > 0) {
      const current = stack.pop()!;
      for (const edge of edges) {
        if (edge.dependsOnTagId === current && appliedNames.has(edge.tagId) && !toSkip.has(edge.tagId)) {
          toSkip.add(edge.tagId);
          stack.push(edge.tagId);
        }
      }
    }

    for (const skipName of toSkip) {
      const wsl = wsTags.find((w) => w.tagName === skipName && w.status === 'pending');
      if (wsl) {
        this.deps.tagRepo.completeWorkstreamTag(
          wsl.id,
          'failed',
          `Skipped: dependency "${tagName}" failed`,
        );
        this.log.info('Skipped dependent tag', {
          workstreamId,
          tagName: skipName,
          reason: `dependency ${tagName} failed`,
        });
      }
    }
  }

  /**
   * Find pending tags whose dependencies are all completed, and start them.
   * All data comes from snapshot fields in workstream_tags (no JSON lookup).
   */
  private async startReadyTags(workstreamId: string): Promise<void> {
    const wsTags = this.deps.tagRepo.getWorkstreamTags(workstreamId);

    // Build edges from snapshot dependsOn arrays
    const edges = this.buildEdgesFromSnapshots(wsTags);

    // Build set of completed tag names on this workstream
    const completedNames = new Set(
      wsTags.filter((wsl) => wsl.status === 'completed').map((wsl) => wsl.tagName),
    );

    // Applied tag names
    const appliedNames = new Set(wsTags.map((wsl) => wsl.tagName));

    const pendingTags = wsTags.filter((wsl) => wsl.status === 'pending');

    for (const wsl of pendingTags) {
      // Get this tag's dependencies (only those within the applied set)
      const deps = edges.filter(
        (e) => e.tagId === wsl.tagName && appliedNames.has(e.dependsOnTagId),
      );

      const allDepsMet = deps.every((d) => completedNames.has(d.dependsOnTagId));

      if (allDepsMet) {
        // Atomically claim the tag
        const claimed = this.deps.tagRepo.claimPendingTag(wsl.id);
        if (!claimed) {
          this.log.debug('Tag already claimed, skipping', {
            workstreamId,
            tagName: wsl.tagName,
          });
          continue;
        }

        this.log.info('Starting tag (all deps met)', {
          workstreamId,
          tagName: wsl.tagName,
          spawnWorkstream: wsl.tagSpawnWorkstream,
        });

        if (wsl.tagSpawnWorkstream) {
          try {
            await this.delegateToNewWorkstream(workstreamId, wsl, edges);
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.deps.tagRepo.completeWorkstreamTag(wsl.id, 'failed', message);
            this.log.error('Failed to delegate tag to new workstream', {
              workstreamId,
              tagName: wsl.tagName,
              error: message,
            });
          }
        } else {
          try {
            await this.deps.workstreamManager.ensureAgent(workstreamId);

            // Re-read for updated snapshot
            const updatedWsTags = this.deps.tagRepo.getWorkstreamTags(workstreamId);
            const snapshot = this.buildSnapshot(updatedWsTags, edges, wsl.tagName);

            this.deps.workstreamManager.injectEvent(workstreamId, {
              type: 'tag_execution',
              tagName: wsl.tagName,
              color: wsl.tagColor,
              status: 'running',
              instructions: wsl.tagInstructions,
              workstreamId,
              snapshot,
              timestamp: Date.now(),
            });

            const prompt = this.buildTagPrompt(workstreamId, wsl);
            await this.deps.workstreamManager.sendMessage(workstreamId, prompt, { silent: true });
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.deps.tagRepo.completeWorkstreamTag(wsl.id, 'failed', message);
            this.log.error('Failed to send tag instructions', {
              workstreamId,
              tagName: wsl.tagName,
              error: message,
            });
          }
        }
      }
    }
  }

  /**
   * Delegate tag execution to a newly created workstream.
   * Uses snapshot data from WorkstreamTagRecord.
   */
  private async delegateToNewWorkstream(
    sourceWorkstreamId: string,
    wsl: WorkstreamTagRecord,
    allEdges: { tagId: string; dependsOnTagId: string }[],
  ): Promise<void> {
    const db = this.deps.db;
    const sourceWorkstream = db.workstreams.getById(sourceWorkstreamId);
    if (!sourceWorkstream) throw new Error(`Source workstream ${sourceWorkstreamId} not found`);

    // Build a TagDefinition from the snapshot for applyTag
    const tagDef: TagDefinition = {
      name: wsl.tagName,
      instructions: wsl.tagInstructions,
      color: wsl.tagColor,
      maxDepth: wsl.tagMaxDepth,
      spawnWorkstream: wsl.tagSpawnWorkstream,
      worktreeMode: wsl.tagWorktreeMode,
      dependsOn: wsl.tagDependsOn,
    };

    // 1. Create new workstream
    const newTitle = `${wsl.tagName} (from ${sourceWorkstream.title})`;
    const newWorkstream = db.workstreams.create({
      projectId: sourceWorkstream.projectId,
      groupId: sourceWorkstream.groupId ?? undefined,
      title: newTitle,
    });

    this.log.info('Created delegated workstream', {
      sourceWorkstreamId,
      newWorkstreamId: newWorkstream.id,
      tagName: wsl.tagName,
      title: newTitle,
    });

    // 2. Copy directories from source workstream
    const sourceDirs = db.workstreamDirectories.getByWorkstream(sourceWorkstreamId);
    for (const dir of sourceDirs) {
      db.workstreamDirectories.add(newWorkstream.id, dir.path, dir.label ?? undefined, dir.isInherited);
    }

    // 3. Handle branch selections / worktree setup
    const sourceBranches = db.branchSelections.list(sourceWorkstreamId);
    const tagSlug = wsl.tagName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    for (const bs of sourceBranches) {
      if (wsl.tagWorktreeMode === 'same' || !this.deps.gitOps) {
        db.branchSelections.set({
          workstreamId: newWorkstream.id,
          directoryPath: bs.directoryPath,
          branch: bs.branch,
          worktreePath: bs.worktreePath ?? undefined,
          baseBranch: bs.baseBranch,
        });
      } else {
        const startPoint = wsl.tagWorktreeMode === 'fork' ? bs.branch : bs.baseBranch;
        const newBranch = `${startPoint}-${tagSlug}`;
        const targetPath = this.deps.gitOps.generateWorktreePath(bs.directoryPath, newBranch);
        try {
          await this.deps.gitOps.createWorktree(bs.directoryPath, newBranch, targetPath, startPoint);
          db.branchSelections.set({
            workstreamId: newWorkstream.id,
            directoryPath: bs.directoryPath,
            branch: newBranch,
            worktreePath: targetPath,
            baseBranch: wsl.tagWorktreeMode === 'fork' ? bs.branch : bs.baseBranch,
          });
        } catch (err) {
          this.log.warn('Failed to create worktree for delegated tag, using parent worktree', {
            error: err instanceof Error ? err.message : String(err),
            worktreeMode: wsl.tagWorktreeMode,
            newBranch,
            directoryPath: bs.directoryPath,
          });
          db.branchSelections.set({
            workstreamId: newWorkstream.id,
            directoryPath: bs.directoryPath,
            branch: bs.branch,
            worktreePath: bs.worktreePath ?? undefined,
            baseBranch: bs.baseBranch,
          });
        }
      }
    }

    // 4. Apply tag on new workstream with source backlink
    this.deps.tagRepo.applyTagWithSource(newWorkstream.id, tagDef, 'pipeline', wsl.id);

    // 5. Stamp delegation on original workstream_tags row
    this.deps.tagRepo.setDelegatedWorkstreamId(wsl.id, newWorkstream.id);

    // 6. Inject tag_delegation event into source workstream chat
    this.deps.workstreamManager.injectEvent(sourceWorkstreamId, {
      type: 'tag_delegation',
      tagName: wsl.tagName,
      color: wsl.tagColor,
      delegatedWorkstreamId: newWorkstream.id,
      delegatedWorkstreamTitle: newTitle,
      timestamp: Date.now(),
    });

    // 7. Claim the tag on the new workstream
    const preClaimWsTags = this.deps.tagRepo.getWorkstreamTags(newWorkstream.id);
    const newWsl = preClaimWsTags.find((w) => w.tagName === wsl.tagName);
    if (newWsl) {
      this.deps.tagRepo.claimPendingTag(newWsl.id);
    }

    // 8. Start agent on new workstream
    await this.deps.workstreamManager.ensureAgent(newWorkstream.id);

    // 9. Inject tag_execution event + send prompt
    const newWsTags = this.deps.tagRepo.getWorkstreamTags(newWorkstream.id);
    const snapshot = this.buildSnapshot(newWsTags, allEdges, wsl.tagName);
    this.deps.workstreamManager.injectEvent(newWorkstream.id, {
      type: 'tag_execution',
      tagName: wsl.tagName,
      color: wsl.tagColor,
      status: 'running',
      instructions: wsl.tagInstructions,
      workstreamId: newWorkstream.id,
      snapshot,
      timestamp: Date.now(),
    });

    const prompt = this.buildTagPrompt(newWorkstream.id, wsl);
    await this.deps.workstreamManager.sendMessage(newWorkstream.id, prompt, { silent: true });
    this.invalidate();
  }

  /**
   * Build dependency edges from snapshot data in WorkstreamTagRecords.
   */
  private buildEdgesFromSnapshots(
    wsTags: WorkstreamTagRecord[],
  ): { tagId: string; dependsOnTagId: string }[] {
    const edges: { tagId: string; dependsOnTagId: string }[] = [];
    for (const wsl of wsTags) {
      for (const dep of wsl.tagDependsOn) {
        edges.push({ tagId: wsl.tagName, dependsOnTagId: dep });
      }
    }
    return edges;
  }

  /**
   * Build a snapshot of related tags for the chat widget.
   * Only includes tags in the same connected component of the dependency graph.
   * All data comes from snapshot fields in WorkstreamTagRecord.
   */
  private buildSnapshot(
    wsTags: WorkstreamTagRecord[],
    allEdges: { tagId: string; dependsOnTagId: string }[],
    forTagName: string,
  ): SnapshotItem[] {
    const related = connectedComponent(forTagName, allEdges);
    const snapshot: SnapshotItem[] = [];

    for (const wsl of wsTags) {
      if (!related.has(wsl.tagName)) continue;

      const item: SnapshotItem = {
        tagName: wsl.tagName,
        color: wsl.tagColor,
        status: wsl.status,
      };

      if (wsl.tagDependsOn.length > 0) {
        item.dependsOn = wsl.tagDependsOn;
      }

      if (wsl.status === 'pending' && wsl.tagDependsOn.length > 0) {
        item.waitingOn = wsl.tagDependsOn;
      }

      if (wsl.delegatedWorkstreamId) {
        item.delegatedWorkstreamId = wsl.delegatedWorkstreamId;
        const delegatedWs = this.deps.db.workstreams.getById(wsl.delegatedWorkstreamId);
        if (delegatedWs) {
          item.delegatedWorkstreamTitle = delegatedWs.title;
        }
      }

      snapshot.push(item);
    }

    return snapshot;
  }

  /**
   * Build the text prompt sent to the agent.
   * Uses snapshot data from WorkstreamTagRecord.
   */
  private buildTagPrompt(
    workstreamId: string,
    wsl: WorkstreamTagRecord,
  ): string {
    return [
      `[Tag: ${wsl.tagName}]`,
      '',
      wsl.tagInstructions,
      '',
      '---',
      `When you have completed the above instructions, call the \`update-tag-status\` action on this workstream (entity URI: @vienna//workstream/${workstreamId}) with tagName "${wsl.tagName}" and status "completed".`,
      `If you cannot fulfill the instructions, call it with status "failed" and include an error message explaining why.`,
    ].join('\n');
  }
}
