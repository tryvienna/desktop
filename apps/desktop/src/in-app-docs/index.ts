/**
 * In-App Documentation Registry
 *
 * @ai-context
 * - Fetches help docs from the docs site's help-manifest.json
 * - Falls back to a bundled manifest snapshot for offline use
 * - Pages opt-in via command-palette-label / command-palette-description frontmatter
 * - Prev/next navigation derived from VitePress sidebar ordering
 * - The manifest is fetched once and cached for the session
 */

import fallbackManifest from './fallback-manifest.json';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface HelpDocLink {
  text: string;
  link: string;
}

export interface HelpDoc {
  /** Display title for the command palette and drawer header */
  label: string;
  /** Short description shown under the title in the command palette */
  description: string;
  /** Markdown content (frontmatter stripped) */
  content: string;
  /** Docs site path (e.g. /features/workstreams) */
  path: string;
  /** Previous doc in sidebar order */
  prev: HelpDocLink | null;
  /** Next doc in sidebar order */
  next: HelpDocLink | null;
}

interface HelpManifest {
  commands: HelpDoc[];
}

// ─── Manifest URL ────────────────────────────────────────────────────────────

// In dev mode, fetch from the local VitePress dev server.
// The docs dev server serves the manifest via a Vite plugin at /docs/help-manifest.json.
// Override the port with VITE_DOCS_DEV_PORT if VitePress starts on a different port.
const MANIFEST_URL = import.meta.env.DEV
  ? `http://localhost:${import.meta.env.VITE_DOCS_DEV_PORT || '5173'}/docs/help-manifest.json`
  : 'https://tryvienna.dev/docs/help-manifest.json';

// ─── Cache ───────────────────────────────────────────────────────────────────

let cachedDocs: Map<string, HelpDoc> | null = null;
let fetchPromise: Promise<void> | null = null;

function buildDocMap(manifest: HelpManifest): Map<string, HelpDoc> {
  const map = new Map<string, HelpDoc>();
  for (const entry of manifest.commands) {
    map.set(entry.path, entry);
  }
  return map;
}

/** Load the fallback manifest synchronously (always available). */
function getFallbackDocs(): Map<string, HelpDoc> {
  return buildDocMap(fallbackManifest as HelpManifest);
}

/** Ensure docs are loaded — fetches from network or uses fallback. */
export function loadHelpDocs(): Promise<void> {
  if (cachedDocs) return Promise.resolve();
  if (fetchPromise) return fetchPromise;

  fetchPromise = fetch(MANIFEST_URL)
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<HelpManifest>;
    })
    .then((manifest) => {
      cachedDocs = buildDocMap(manifest);
    })
    .catch(() => {
      // Network unavailable — use bundled fallback
      cachedDocs = getFallbackDocs();
    });

  return fetchPromise;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Get the docs map synchronously. On first call, returns the bundled fallback
 * and kicks off a network fetch. When the fetch resolves, it overwrites
 * cachedDocs so subsequent calls return the fresh data. The fetch is deduped
 * via fetchPromise — concurrent calls reuse the same in-flight request.
 */
function getDocs(): Map<string, HelpDoc> {
  if (!cachedDocs) {
    loadHelpDocs();
    cachedDocs = getFallbackDocs();
  }
  return cachedDocs;
}

export function getHelpDoc(path: string): HelpDoc | null {
  return getDocs().get(path) ?? null;
}

/** Returns all registered docs as [path, doc] pairs. */
export function getAllHelpDocs(): Array<[string, HelpDoc]> {
  return Array.from(getDocs().entries());
}

/** Full URL to view a help doc on the docs site. */
export function getHelpDocWebUrl(path: string): string {
  return `https://tryvienna.dev/docs${path}`;
}
