/**
 * ReferenceDetector — Scans workstream conversation events for entity references.
 *
 * Hooks into WorkstreamManager.addEventListener() and processes text_done and
 * user_message events against all registered entity matchers from the plugin system.
 * Detected references are stored in the workstream_references table and an IPC
 * invalidation is emitted so the renderer can refetch.
 *
 * @module main/references/ReferenceDetector
 */

import type { AgentEvent } from '@vienna/agent-core';
import type { Logger } from '@vienna/logger';
import type { PluginSystem, EntityMatcher, EntityDefinition } from '@tryvienna/sdk';
import { getEntityTypeFromURI } from '@tryvienna/sdk';
import type { WorkstreamReferenceRepository } from '@vienna/app-db';
import type { WorkstreamLinkedEntityRepository } from '@vienna/app-db';

/** Matches @vienna//type/id URIs in text. Only captures /-delimited segments. */
const ENTITY_URI_PATTERN = /@vienna\/\/([a-z][a-z0-9_-]*)\/[^\s\]\)>#]+/g;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ReferenceDetectorDeps {
  pluginSystem: PluginSystem;
  referenceRepo: WorkstreamReferenceRepository;
  linkedEntityRepo: WorkstreamLinkedEntityRepository;
  logger: Logger;
  /** Called when a new reference is detected (e.g., to invalidate GraphQL cache). */
  onReferenceDetected?: (workstreamId: string, entityUri: string, entityType: string) => void;
}

interface CachedMatcher {
  entityType: string;
  definition: EntityDefinition;
  matcher: EntityMatcher;
}

// ─────────────────────────────────────────────────────────────────────────────
// ReferenceDetector
// ─────────────────────────────────────────────────────────────────────────────

export class ReferenceDetector {
  private readonly deps: ReferenceDetectorDeps;
  private matcherCache: CachedMatcher[] | null = null;

  constructor(deps: ReferenceDetectorDeps) {
    this.deps = deps;
  }

  /** Process a workstream event. Register via WorkstreamManager.addEventListener(). */
  handleEvent(workstreamId: string, event: AgentEvent): void {
    const text = this.extractText(event);
    if (!text) return;

    try {
      this.scanText(workstreamId, text);
    } catch (err) {
      this.deps.logger.error('ReferenceDetector.scanText failed', {
        workstreamId,
        error: String(err),
      });
    }
  }

  /** Invalidate cached matchers (call when plugins are registered/unregistered). */
  invalidateMatcherCache(): void {
    this.matcherCache = null;
  }

  // ── Private ──────────────────────────────────────────────────────────────

  private extractText(event: AgentEvent): string | null {
    if (event.type === 'text_done' && 'fullText' in event) {
      return (event as { fullText: string }).fullText;
    }
    if (event.type === 'user_message' && 'text' in event) {
      return (event as { text: string }).text;
    }
    return null;
  }

  private getMatchers(): CachedMatcher[] {
    if (!this.matcherCache) {
      this.matcherCache = this.deps.pluginSystem.getAllMatchers();
    }
    return this.matcherCache;
  }

  private scanText(workstreamId: string, text: string): void {
    // 1. Built-in: detect @vienna// URIs directly (works for all entity types)
    this.scanForEntityURIs(workstreamId, text);

    // 2. Plugin matchers: detect patterns like owner/repo#123 or GitHub URLs
    this.scanWithMatchers(workstreamId, text);
  }

  /** Scan for @vienna//type/id URIs — built-in for all entity types. */
  private scanForEntityURIs(workstreamId: string, text: string): void {
    const regex = new RegExp(ENTITY_URI_PATTERN.source, ENTITY_URI_PATTERN.flags);
    for (const match of text.matchAll(regex)) {
      try {
        const uri = match[0];
        const entityType = getEntityTypeFromURI(uri);
        if (!entityType) continue;

        // Verify this entity type is actually registered
        const definition = this.deps.pluginSystem.getEntity(entityType);
        if (!definition) continue;

        // Validate the URI has the correct number of segments for this entity type
        try {
          definition.parseURI(uri);
        } catch {
          continue; // Malformed URI — skip (e.g., wrong segment count)
        }

        this.tryAddReference(workstreamId, uri, entityType, uri);
      } catch (err) {
        this.deps.logger.warn('URI reference detection failed', { error: String(err) });
      }
    }
  }

  /** Scan with plugin-registered matchers (regex + extract). */
  private scanWithMatchers(workstreamId: string, text: string): void {
    const allMatchers = this.getMatchers();
    if (allMatchers.length === 0) return;

    for (const { entityType, definition, matcher } of allMatchers) {
      // Ensure global flag for matchAll
      const flags = matcher.pattern.flags.includes('g')
        ? matcher.pattern.flags
        : matcher.pattern.flags + 'g';
      const regex = new RegExp(matcher.pattern.source, flags);

      for (const match of text.matchAll(regex)) {
        try {
          const segments = matcher.extract(match);
          if (!segments) continue;

          const uri = definition.createURI(segments);
          const title = match[0];
          const externalUrl = definition.externalUrl?.(segments);

          this.tryAddReference(workstreamId, uri, entityType, title, externalUrl);
        } catch (err) {
          this.deps.logger.warn('Matcher extract/store failed', {
            entityType,
            error: String(err),
          });
        }
      }
    }
  }

  /** Attempt to add a reference, skipping if already referenced or linked. */
  private tryAddReference(
    workstreamId: string,
    uri: string,
    entityType: string,
    title: string,
    externalUrl?: string,
  ): void {
    // Skip if already referenced
    if (this.deps.referenceRepo.exists(workstreamId, uri)) return;

    // Skip if already linked (no point referencing what's already providing context)
    const linkedEntities = this.deps.linkedEntityRepo.getByWorkstream(workstreamId);
    if (linkedEntities.some((le) => le.entityUri === uri)) return;

    // Store the reference
    const added = this.deps.referenceRepo.addReference(workstreamId, uri, entityType, title, externalUrl);

    if (added) {
      this.deps.logger.info('Reference detected', {
        workstreamId,
        entityType,
        entityUri: uri,
      });
      this.deps.onReferenceDetected?.(workstreamId, uri, entityType);
    }
  }
}
