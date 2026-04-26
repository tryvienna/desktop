# Plugin Entity Linking Context Fix

## What changed
The `EntityLinkingContext` was duplicated — `@tryvienna/ui` had its own `createContext()` and the host app (`apps/desktop/src/components/domain/entity-linking/context.tsx`) had a separate one. The host's `EntityLinkingProvider` was providing value to the domain copy, but plugins importing `LinkedWorkstreams` from `@tryvienna/ui` read from the UI package's copy — which had no provider.

Now the domain `context.tsx` re-exports from `@tryvienna/ui`, and the full entity-linking API is exported from `@tryvienna/ui`'s top-level barrel.

## Test plan

### 1. Plugin entity drawers open without crash
- Load the GitHub CLI plugin (or any plugin with entity drawers)
- Add at least one tracked repository in GitHub settings
- Click a PR or Issue in the sidebar nav section
- **Expected**: The entity drawer opens with full content (metadata, description, comments, linked workstreams section)
- **Previously**: Drawer opened empty with a React error boundary

### 2. LinkedWorkstreams renders in plugin entity drawers
- Open a GitHub PR or Issue entity drawer
- Scroll to the "Linked Workstreams" section
- **Expected**: Section renders (shows linked workstreams or "Not linked to any workstreams")
- **Previously**: `useEntityLinking must be used within an EntityLinkingProvider` error

### 3. Core entity drawers still work
- Open a Task entity drawer (core linkable type)
- Verify the linked workstreams / linked entities sections still render
- Verify entity search dialog still works (these use the domain context re-exports)

### 4. No console errors
- Open DevTools console
- Navigate between plugin and core entity drawers
- **Expected**: No `EntityLinkingContext` or `useEntityLinking` errors
