/**
 * Git Query Utilities — Shared helpers for git GraphQL resolvers.
 *
 * @module graphql/domains/git/utils
 */

import { resolve, normalize } from 'path';
import { GraphQLError } from 'graphql';
import type { GitOps, GraphQLContext } from '../../schema/builder';

export function requireGitOps(ctx: { gitOps?: GitOps }): GitOps {
  if (!ctx.gitOps) {
    throw new GraphQLError('Git operations not available', {
      extensions: { code: 'SERVICE_UNAVAILABLE' },
    });
  }
  return ctx.gitOps;
}

/**
 * Validate that a path is absolute and is a known project directory
 * (or a subdirectory of one). Prevents arbitrary filesystem access.
 */
export function validateGitPath(path: string, ctx: GraphQLContext): string {
  const absolute = resolve(path);
  if (!absolute.startsWith('/')) {
    throw new GraphQLError('Path must be absolute', {
      extensions: { code: 'BAD_USER_INPUT', field: 'path' },
    });
  }

  // Check that the path is within a known project directory
  const projects = ctx.db.projects.listAll();
  for (const project of projects) {
    const dirs = ctx.db.projectDirectories.getByProject(project.id);
    for (const dir of dirs) {
      if (absolute === dir.path || absolute.startsWith(dir.path + '/')) {
        return absolute;
      }
    }
  }

  throw new GraphQLError('Path is not within any known project directory', {
    extensions: { code: 'BAD_USER_INPUT', field: 'path' },
  });
}

/**
 * Validate that a relative file path does not escape the repository root
 * via path traversal (e.g., `../../etc/passwd`). The resolved path must
 * remain within the given repo root.
 */
export function validateFilePath(filePath: string, repoPath: string): void {
  const resolved = normalize(resolve(repoPath, filePath));
  const normalizedRepo = normalize(resolve(repoPath));
  if (!resolved.startsWith(normalizedRepo + '/') && resolved !== normalizedRepo) {
    throw new GraphQLError('filePath must not escape the repository root', {
      extensions: { code: 'BAD_USER_INPUT', field: 'filePath' },
    });
  }
}
