import type { TemplateContext } from '../types.ts';

export function renderEntityUri(ctx: TemplateContext): string {
  const { naming } = ctx;

  return `/**
 * URI segment constants for ${naming.displayName} entities.
 *
 * All entities in this plugin share the same URI structure.
 * Modify the segments array to match your data model.
 *
 * Example URI: @drift//<entity_type>/<id>
 */

// TODO: Adjust URI segments to match your entity's identifying fields
// For example, GitHub PRs use ['owner', 'repo', 'number']
export const ${naming.pluginId.toUpperCase()}_URI_SEGMENTS = ['id'] as const;
`;
}
