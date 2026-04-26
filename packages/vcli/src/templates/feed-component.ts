import type { TemplateContext } from '../types.ts';

export function renderFeedComponent(ctx: TemplateContext): string {
  const { naming } = ctx;
  const pascal = naming.pascalName;

  return `import type { FeedCanvasProps } from '@tryvienna/sdk';

/**
 * ${naming.displayName} — Feed canvas component.
 *
 * Rendered on the home feed when \`@vienna//plugin/${naming.pluginId}\` is
 * included in a feed.md file.
 */
export function ${pascal}FeedComponent({ pluginId, data, hostApi, logger, onNavigate }: FeedCanvasProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4">
      <h3 className="text-sm font-medium">${naming.displayName}</h3>
      <p className="text-xs text-muted-foreground">Feed content goes here.</p>
    </div>
  );
}
`;
}
