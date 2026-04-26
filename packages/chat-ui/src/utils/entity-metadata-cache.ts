/**
 * Entity Metadata Cache
 *
 * Simple cache for entity type display metadata fetched from the registry.
 * Used by entityStyles.ts to resolve colors/icons for dynamically registered types.
 *
 * @module chat-ui/utils/entity-metadata-cache
 */

export interface CachedEntityMetadata {
  emoji: string;
  colors: {
    bg: string;
    text: string;
    border: string;
  };
}

const cache = new Map<string, CachedEntityMetadata>();

/** Store display metadata for an entity type. */
export function setEntityTypeMetadata(type: string, metadata: CachedEntityMetadata): void {
  cache.set(type, metadata);
}

/** Get cached display metadata for an entity type. */
export function getEntityTypeMetadata(type: string): CachedEntityMetadata | undefined {
  return cache.get(type);
}

/** Batch-set metadata for multiple entity types. */
export function setEntityTypeMetadataBatch(
  entries: Array<{ type: string; metadata: CachedEntityMetadata }>
): void {
  for (const entry of entries) {
    cache.set(entry.type, entry.metadata);
  }
}

/** Clear all cached metadata (for testing). */
export function clearEntityTypeMetadataCache(): void {
  cache.clear();
}
