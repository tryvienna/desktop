---
command-palette-label: Plugin Events
command-palette-description: Typed event system for inter-plugin communication
---

# Plugin Event System

Vienna includes a typed event system that allows plugins (and core Vienna) to define, emit, and consume events with runtime-validated payloads. Events are the primary mechanism for decoupled inter-plugin communication.

[[toc]]

---

## Overview

The event system has four key properties:

| Property | Description |
|----------|-------------|
| **Typed payloads** | Every event declares a Zod schema. Payloads are validated at emit time — invalid payloads throw immediately. |
| **Ownership enforcement** | Only the plugin that registered an event can emit it. |
| **Fire-and-forget** | Emitters don't await handlers. Handler errors are isolated and logged. |
| **Static listener declaration** | Plugins declare which events they listen to in `definePlugin()`, not at runtime. |

Events are **global** — not scoped to a workstream. When workstream context is relevant, include it in the payload.

---

## Defining Events

Use `defineEvent()` to create an event definition. Each event has a local name, a description, and a Zod schema for the payload.

```typescript
import { defineEvent } from '@tryvienna/sdk';
import { z } from 'zod';

export const prReferencedEvent = defineEvent({
  name: 'pr.referenced',
  description: 'Emitted when a pull request is referenced in a conversation',
  schema: z.object({
    workstreamId: z.string(),
    prNumber: z.number(),
    repo: z.string(),
  }),
});
```

### Event name rules

- Lowercase alphanumeric, dots, underscores, and hyphens
- Must start with a letter
- 1–128 characters
- Dots are encouraged for hierarchy (e.g., `pr.referenced`, `issue.labeled`)

At registration time, event names are auto-prefixed with the plugin ID. So `pr.referenced` in a plugin with ID `github` becomes `github.pr.referenced`.

---

## Registering Events in a Plugin

Add event definitions to the `events` array in `definePlugin()`:

```typescript
import { definePlugin } from '@tryvienna/sdk';
import { prReferencedEvent } from './events';

export default definePlugin({
  id: 'github',
  name: 'GitHub',
  icon: { svg: '...' },
  integrations: [/* ... */],
  entities: [/* ... */],
  events: [prReferencedEvent],
  listensTo: [],
});
```

### Validation

`definePlugin()` validates that:
- All events are created with `defineEvent()`
- No duplicate event names within a plugin
- All listener declarations reference a non-empty event name and provide a handler function

---

## Emitting Events

Events are emitted from the main process via `PluginSystem`. Only the owning plugin can emit its events.

```typescript
// In a main-process handler or integration
pluginSystem.emit('github', 'github.pr.referenced', {
  workstreamId: 'ws-123',
  prNumber: 42,
  repo: 'owner/repo',
});
```

The `emit()` call:
1. Validates the event exists
2. Validates the caller owns the event
3. Validates the payload against the Zod schema
4. Dispatches to all listeners (fire-and-forget)

If validation fails, `emit()` throws synchronously.

### Core events

Vienna core can register events that aren't owned by any plugin:

```typescript
import { defineEvent } from '@tryvienna/sdk';
import { z } from 'zod';

const referenceDetectedEvent = defineEvent({
  name: 'reference.detected',
  description: 'Emitted when an entity reference is detected in conversation text',
  schema: z.object({
    workstreamId: z.string(),
    entityUri: z.string(),
    entityType: z.string(),
  }),
});

// Register as a core event
pluginSystem.registerCoreEvent(referenceDetectedEvent);

// Emit with the core shorthand
pluginSystem.emitCoreEvent('core.reference.detected', {
  workstreamId: 'ws-123',
  entityUri: '@vienna//github_pr/owner/repo/42',
  entityType: 'github_pr',
});
```

Core events are prefixed with `core.` (e.g., `core.reference.detected`).

---

## Listening to Events

Plugins declare listeners statically in `definePlugin()` via the `listensTo` array:

```typescript
export default definePlugin({
  id: 'analytics',
  name: 'Analytics',
  icon: { svg: '...' },
  integrations: [],
  entities: [],
  events: [],
  listensTo: [
    {
      event: 'core.reference.detected',
      handler: (payload) => {
        // payload is unknown — cast or validate as needed
        const { entityUri, entityType } = payload as {
          entityUri: string;
          entityType: string;
        };
        console.log(`Reference detected: ${entityType} ${entityUri}`);
      },
    },
    {
      event: 'github.pr.referenced',
      handler: (payload) => {
        const { prNumber, repo } = payload as { prNumber: number; repo: string };
        console.log(`PR #${prNumber} in ${repo} was referenced`);
      },
    },
  ],
});
```

### Key behaviors

- **Load-order independent**: Listeners for not-yet-registered events are stored and activate when the source plugin loads.
- **Error isolation**: If a handler throws, the error is logged but other handlers still execute.
- **No return value**: Handlers return `void`. The emitter never sees handler results.

---

## Querying Registered Events

### GraphQL

The event registry is exposed via GraphQL:

```graphql
query GetRegisteredEvents {
  registeredEvents {
    qualifiedName
    localName
    description
    ownerPluginId
    listenerCount
    payloadSchema
  }
}
```

This returns all registered events with their metadata, including a human-readable representation of the payload schema.

### PluginSystem API

From the main process, you can query the event registry directly:

```typescript
// All registered event names
pluginSystem.getEventNames();
// → ['core.reference.detected', 'github.pr.referenced']

// Definition for a specific event
pluginSystem.getEventDefinition('core.reference.detected');
// → { name: 'reference.detected', description: '...', schema: ZodObject }

// Events owned by a plugin
pluginSystem.getPluginEvents('github');
// → ['github.pr.referenced']

// Serializable summaries (used by GraphQL)
pluginSystem.getEventSummaries();
// → [{ qualifiedName, localName, description, ownerPluginId, listenerCount, payloadSchema }]
```

### Settings UI

All registered events are visible in **Settings → Advanced → Event Registry**, showing each event's qualified name, description, payload schema, and listener count.

---

## Architecture

Events live entirely in the main process. The event bus is part of `PluginSystem`, which delegates to an internal `EventRegistry`.

```
defineEvent()  →  PluginDefinition.events[]
                        |
                        v
              PluginSystem.registerPlugin()
                        |
                        v
              EventRegistry (internal)
                  - events map
                  - listeners map
                  - ownership tracking
                        |
              PluginSystem.emit()
                        |
                        v
              Zod validation → fire-and-forget dispatch
```

The renderer does not participate in event emission or handling directly. If a renderer action needs to trigger an event, it goes through GraphQL/IPC to the main process, which then emits.

---

## API Reference

### `defineEvent(config)`

Creates a validated, immutable event definition.

| Parameter | Type | Description |
|-----------|------|-------------|
| `config.name` | `string` | Local event name (auto-prefixed with plugin ID at registration) |
| `config.description` | `string` | Human-readable description of when this event fires |
| `config.schema` | `z.ZodType` | Zod schema for runtime payload validation |

Returns a frozen `EventDefinition` object.

### `EventListenerDeclaration`

Used in `definePlugin({ listensTo })`:

| Field | Type | Description |
|-------|------|-------------|
| `event` | `string` | Fully-qualified event name (e.g., `'core.reference.detected'`) |
| `handler` | `(payload: unknown) => void` | Fire-and-forget handler function |

### `PluginSystem` event methods

| Method | Description |
|--------|-------------|
| `emit(pluginId, eventName, payload)` | Emit an event (validates ownership + schema) |
| `registerCoreEvent(definition)` | Register a core event (owner: `'core'`) |
| `emitCoreEvent(eventName, payload)` | Shorthand for `emit('core', eventName, payload)` |
| `getEventNames()` | All registered qualified event names |
| `getEventDefinition(name)` | Get definition by qualified name |
| `getPluginEvents(pluginId)` | Events owned by a specific plugin |
| `getEventSummaries()` | Serializable summaries for all events |
| `setLogger(logger)` | Set logger for emission diagnostics |
