/**
 * Skills GraphQL Types — Pothos object types for installed and registry skills.
 *
 * @module graphql/domains/skills/types
 */

import { builder } from '../../schema/builder';
import type { InstalledSkillShape, RegistrySkillShape, SkillUpdateShape } from '../../schema/builder';

// ─────────────────────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────────────────────

export const SkillSourceEnum = builder.enumType('SkillSource', {
  values: ['inline', 'github', 'local'] as const,
});

// ─────────────────────────────────────────────────────────────────────────────
// InstalledSkill (backed by installed_skills table)
// ─────────────────────────────────────────────────────────────────────────────

export const InstalledSkillRef = builder.objectRef<InstalledSkillShape>('InstalledSkill');

builder.objectType(InstalledSkillRef, {
  description: 'A skill installed on disk from a registry or GitHub repo',
  fields: (t) => ({
    id: t.exposeID('id'),
    name: t.exposeString('name'),
    description: t.exposeString('description'),
    version: t.exposeString('version', { nullable: true }),
    registryVersion: t.exposeString('registryVersion', { nullable: true }),
    source: t.expose('source', { type: SkillSourceEnum }),
    sourceRef: t.exposeString('sourceRef', { nullable: true }),
    registry: t.exposeString('registry', { nullable: true }),
    path: t.exposeString('path'),
    icon: t.exposeString('icon', { nullable: true }),
    category: t.exposeString('category', { nullable: true }),
    tags: t.exposeStringList('tags'),
    author: t.exposeString('author', { nullable: true }),
    enabled: t.exposeBoolean('enabled'),
    pinned: t.exposeBoolean('pinned'),
    installDate: t.exposeString('installDate'),
    lastUsed: t.exposeString('lastUsed', { nullable: true }),
    useCount: t.exposeInt('useCount'),
    hasUpdate: t.boolean({
      description: 'Whether a newer version is available in the registry',
      resolve: (skill) =>
        skill.registryVersion !== null &&
        skill.version !== null &&
        skill.registryVersion !== skill.version,
    }),
  }),
});

// ─────────────────────────────────────────────────────────────────────────────
// RegistrySkill (read from registry repos, not DB-backed)
// ─────────────────────────────────────────────────────────────────────────────

interface RegistrySkillAuthorShape {
  name: string;
}

const RegistrySkillAuthorRef = builder.objectRef<RegistrySkillAuthorShape>('RegistrySkillAuthor');

builder.objectType(RegistrySkillAuthorRef, {
  description: 'Author of a registry skill',
  fields: (t) => ({
    name: t.exposeString('name'),
  }),
});

export const RegistrySkillRef = builder.objectRef<RegistrySkillShape>('RegistrySkill');

builder.objectType(RegistrySkillRef, {
  description: 'A skill available in a registry (not yet installed)',
  fields: (t) => ({
    id: t.exposeString('id'),
    name: t.exposeString('name'),
    description: t.exposeString('description'),
    version: t.exposeString('version', { nullable: true }),
    source: t.expose('source', { type: SkillSourceEnum }),
    repo: t.exposeString('repo', { nullable: true }),
    icon: t.exposeString('icon', { nullable: true }),
    category: t.exposeString('category', { nullable: true }),
    tags: t.exposeStringList('tags'),
    author: t.field({
      type: RegistrySkillAuthorRef,
      nullable: true,
      resolve: (skill) => skill.author ?? null,
    }),
    registry: t.exposeString('registry', { nullable: true }),
  }),
});

// ─────────────────────────────────────────────────────────────────────────────
// SkillUpdate (version comparison)
// ─────────────────────────────────────────────────────────────────────────────

export const SkillUpdateRef = builder.objectRef<SkillUpdateShape>('SkillUpdate');

builder.objectType(SkillUpdateRef, {
  description: 'Version update information for an installed skill',
  fields: (t) => ({
    id: t.exposeString('id'),
    installedVersion: t.exposeString('installedVersion', { nullable: true }),
    registryVersion: t.exposeString('registryVersion', { nullable: true }),
  }),
});
