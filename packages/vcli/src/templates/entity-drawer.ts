import type { TemplateContext, EntityNaming } from '../types.ts';

export function renderEntityDrawer(ctx: TemplateContext, entity: EntityNaming): string {
  const { naming } = ctx;
  const pascal = naming.pascalName;

  return `/**
 * ${pascal}${entity.entityPascal}EntityDrawer — Entity detail drawer for ${entity.entityDisplayName}.
 *
 * Displayed when a user clicks a ${entity.entityDisplayName} entity chip or card.
 */

import { useEntity } from '@tryvienna/sdk/react';
import { DrawerBody } from '@tryvienna/ui';
import type { EntityDrawerProps } from '@tryvienna/sdk';

export function ${pascal}${entity.entityPascal}EntityDrawer({ uri }: EntityDrawerProps) {
  const { entity, loading, error } = useEntity(uri);

  if (loading) {
    return (
      <DrawerBody>
        <div className="flex items-center justify-center p-4">
          <span className="text-xs text-muted-foreground">Loading...</span>
        </div>
      </DrawerBody>
    );
  }

  if (error || !entity) {
    return (
      <DrawerBody>
        <div className="flex items-center justify-center p-4">
          <span className="text-xs text-destructive">
            {error?.message ?? 'Entity not found'}
          </span>
        </div>
      </DrawerBody>
    );
  }

  return (
    <DrawerBody>
      <div className="flex flex-col gap-3 p-4">
        <h3 className="text-sm font-medium">{entity.title}</h3>
        {entity.description && (
          <p className="text-xs text-muted-foreground">{entity.description}</p>
        )}
        {/* TODO: Add entity-specific details here */}
      </div>
    </DrawerBody>
  );
}
`;
}
