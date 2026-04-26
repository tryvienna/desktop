# Entity Tool — Dev Debug Settings & Preview Page

## Prerequisites

- Developer Mode must be enabled (Settings > Advanced > Developer Mode)
- At least one plugin with entity UI overrides installed (e.g., GitHub CLI, Linear, Tasks)

## 1. Settings Sidebar Visibility

1. Open Settings
2. **Verify** "Entity Tool" appears in the sidebar (before "About"), with a Bug icon
3. Disable Developer Mode in Settings > Advanced
4. **Verify** "Entity Tool" disappears from the sidebar
5. Re-enable Developer Mode

## 2. Adding Entities via Search

1. Navigate to Settings > Entity Tool
2. Click "Search Entities"
3. **Verify** the EntitySearchDialog opens
4. Search for a known entity (e.g., a GitHub PR, Linear issue, or task)
5. Select an entity from the results
6. **Verify** the entity appears in the list with its type badge and URI

## 3. Adding Entities via Manual URI Paste

1. Click "Paste URI"
2. **Verify** a text input expands
3. Type an invalid string (e.g., "hello") and press Enter
4. **Verify** an error message appears: "Invalid entity URI..."
5. Type a valid entity URI (e.g., `@vienna//github_pr/owner/repo/123`) and press Enter
6. **Verify** the entry is added to the list
7. Press Escape in the input — **verify** the manual input collapses

## 4. Removing Entities

1. Click the trash icon on an entry
2. **Verify** a confirmation dialog appears
3. Confirm removal
4. **Verify** the entry is removed from the list

## 5. Navigating to Debug Page

1. Click on an entry row (not the delete button)
2. **Verify** navigation to the Entity Debug page (`/entity-tool/<encodedUri>`)
3. **Verify** the page shows:
   - Back button ("Back to Entity Tool")
   - Entity type badge
   - Plugin ID badge (if a plugin provides UI for this type)
   - The URI in an editable text input
   - Resolved entity title/description (if the integration is authenticated)
   - Preview sections for each UI surface (Card, Feed Card, Drawer, Workstream Widget)

## 6. UI Surface Previews

For an entity type with registered UI overrides:

1. **Verify** registered components render inside their labeled preview sections
2. **Verify** unregistered components show "Not registered" with a dashed border
3. **Verify** plugin errors are caught by the error boundary (not crashing the page)

## 7. Editing URI — Preview vs Save

1. On the debug page, modify the URI in the text input
2. Click "Preview"
3. **Verify** the widgets re-render with the new URI (local state only)
4. **Verify** an "unsaved" badge appears
5. Click "Save"
6. **Verify** the route updates to reflect the new URI
7. Navigate back to Entity Tool settings
8. **Verify** the entry in the list reflects the saved URI

## 8. Keyboard Shortcuts

1. On the debug page, type a new URI and press Enter
2. **Verify** it triggers Preview (same as clicking the Preview button)

## Edge Cases

- Add a URI for an entity type with no plugin UI overrides — all 4 sections should show "Not registered"
- Add a URI for an unauthenticated integration — should show the amber warning about resolution failure
- Verify the debug page works after app restart (data persists in JSON file store)
