/**
 * EntityLinkingContext — Re-exports from @tryvienna/ui for domain components.
 *
 * The canonical context lives in @tryvienna/ui so plugins and host share the
 * same React context identity. This file re-exports everything so existing
 * domain imports continue to work.
 */

export {
  EntityLinkingContext,
  useEntityLinking,
} from '@tryvienna/ui';

export type {
  EntityLinkingAdapter,
  EntityLinkedWorkstream,
  LinkedEntity,
  EntitySearchResult,
  EntityTypeInfo,
} from '@tryvienna/ui';
