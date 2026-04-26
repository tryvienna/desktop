/**
 * Events GraphQL Types
 *
 * @module graphql/domains/events/types
 */

import type { EventSummary } from '@tryvienna/sdk';
import { builder } from '../../schema/builder';

export const RegisteredEventRef = builder.objectRef<EventSummary>('RegisteredEvent');

builder.objectType(RegisteredEventRef, {
  description: 'A registered event in the plugin event system',
  fields: (t) => ({
    qualifiedName: t.exposeString('qualifiedName', {
      description: 'Fully-qualified event name (e.g. "core.reference.detected")',
    }),
    localName: t.exposeString('localName', {
      description: 'Local event name without plugin prefix',
    }),
    description: t.exposeString('description', {
      description: 'Human-readable description of when this event fires',
    }),
    ownerPluginId: t.exposeString('ownerPluginId', {
      description: 'Plugin ID that owns/defined this event',
    }),
    listenerCount: t.exposeInt('listenerCount', {
      description: 'Number of listeners currently registered for this event',
    }),
    payloadSchema: t.exposeString('payloadSchema', {
      nullable: true,
      description: 'Human-readable payload schema description',
    }),
  }),
});
