/**
 * GraphQL types for content profiles.
 *
 * @module graphql/domains/profiles/types
 */

import { builder } from '../../schema/builder';
import type { ContentProfileShape, ProfileMetadataShape } from '../../schema/builder';

// ─────────────────────────────────────────────────────────────────────────────
// Object types
// ─────────────────────────────────────────────────────────────────────────────

export const ProfileAuthorRef = builder.objectRef<{ name: string; url?: string }>('ProfileAuthor');
builder.objectType(ProfileAuthorRef, {
  description: 'Author of a content profile',
  fields: (t) => ({
    name: t.exposeString('name'),
    url: t.exposeString('url', { nullable: true }),
  }),
});

export const ProfileMetadataRef = builder.objectRef<ProfileMetadataShape>('ProfileMetadata');
builder.objectType(ProfileMetadataRef, {
  description: 'Identity metadata for a shareable content profile',
  fields: (t) => ({
    displayName: t.exposeString('displayName', { nullable: true }),
    description: t.exposeString('description', { nullable: true }),
    author: t.field({
      type: ProfileAuthorRef,
      nullable: true,
      resolve: (parent) => parent.author ?? null,
    }),
    icon: t.exposeString('icon', { nullable: true }),
    tags: t.exposeStringList('tags'),
    sourceUrl: t.exposeString('sourceUrl', { nullable: true }),
  }),
});

export const ContentProfileRef = builder.objectRef<ContentProfileShape>('ContentProfile');
builder.objectType(ContentProfileRef, {
  description: 'A content profile — a curated bundle of skills, plugins, quick actions, and settings',
  fields: (t) => ({
    name: t.exposeString('name'),
    directory: t.exposeString('directory'),
    isDefault: t.exposeBoolean('isDefault'),
    isActive: t.exposeBoolean('isActive'),
    isFork: t.exposeBoolean('isFork'),
    metadata: t.field({
      type: ProfileMetadataRef,
      nullable: true,
      resolve: (parent) => parent.metadata ?? null,
    }),
  }),
});
