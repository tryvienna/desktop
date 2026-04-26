# Plugin Event System & Workstream References

## Overview

This change adds two features:
1. **Plugin Event System** — typed event bus in the SDK for inter-plugin communication with Zod-validated payloads
2. **Workstream References** — auto-detection and tracking of entity mentions in conversation text, with a core `reference.detected` event
3. **Event Registry UI** — Settings > Advanced section showing all registered events
4. **Event System Documentation** — new docs page at /guide/events

---

## 1. Event Registry in Settings

### Steps
1. Start the app in dev mode
2. Navigate to **Settings > Advanced**
3. Scroll down past the Profiler toggle

### Expected
- An **"Event Registry"** section is visible
- It shows a summary like "1 event registered across 1 source"
- The `core.reference.detected` event is listed under the "core" group
- The event card shows:
  - Qualified name: `core.reference.detected`
  - Description text
  - Payload schema (human-readable Zod description)
  - No listener badge (0 listeners unless a plugin listens)

---

## 2. Workstream References (Entity Auto-Detection)

### Setup
- Ensure the GitHub plugin is loaded and authenticated

### Steps
1. Open a workstream
2. Send a message containing a GitHub entity reference, e.g. `owner/repo#123`
3. Check the workstream's linked entities / references panel

### Expected
- The entity reference is auto-detected from the conversation text
- The reference appears in the workstream's reference list
- The `core.reference.detected` event fires (visible in dev logs if developer mode is on)

---

## 3. Event System SDK (Developer Verification)

### Steps
1. Open the app with developer mode enabled
2. Verify no errors in the main process logs related to:
   - `setLogger is not a function`
   - `registerCoreEvent is not a function`
   - `emit` failures

### Expected
- App starts cleanly
- Plugin system initializes with event registry
- Core events are registered without errors

---

## 4. Documentation

### Steps
1. Run the docs dev server: `cd apps/docs && pnpm dev`
2. Navigate to **Plugin Development > Event System** in the sidebar

### Expected
- The event system docs page renders correctly
- Sidebar shows "Event System" under Plugin Development
- Page covers: defining events, registering, emitting, listening, querying, architecture, API reference
- The page appears in the command palette help manifest (check `/docs/help-manifest.json` for a `Plugin Events` entry)

---

## 5. GraphQL API

### Steps
1. Open the GraphQL playground or use the dev tools console
2. Run:
   ```graphql
   query {
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

### Expected
- Returns an array with at least `core.reference.detected`
- All fields are populated (payloadSchema is a human-readable string)

---

## Edge Cases
- App should start correctly even if no plugins define events (empty event registry)
- The Event Registry section should show "No events registered." if somehow no events exist
- Plugin hot-reload should re-register events without duplicates
