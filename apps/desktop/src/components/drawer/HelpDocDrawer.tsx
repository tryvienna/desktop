/**
 * HelpDocDrawer — Renders markdown documentation in a drawer tab.
 *
 * @ai-context
 * - Reads title and content from the help-doc content descriptor payload
 * - Uses the shared Markdown component from @tryvienna/ui
 * - Wrapped in DrawerContainer for consistent drawer chrome
 * - Shows prev/next navigation derived from docs-site sidebar ordering
 * - YouTube iframes are extracted and rendered as Electron <webview> tags
 * - Includes a "View on web" link to the full docs site page
 */

import { useMemo, useEffect, useRef } from 'react';
import { DrawerBody, Markdown } from '@tryvienna/ui';
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { getApi } from '@vienna/ipc/renderer';
import { api } from '../../ipc/index';
import type { DrawerContentDescriptor } from '../../lib/drawer';
import { DrawerContainer, useDrawerNavigationOptional } from '../../lib/drawer';
import { getHelpDocPayload, helpDocContent, type HelpDocPayload } from './content';
import { getHelpDoc, getHelpDocWebUrl } from '../../in-app-docs';
import type { HelpDocLink } from '../../in-app-docs';

// ─── YouTube Embed Handling ─────────────────────────────────────────────────

interface VideoEmbed {
  videoId: string;
  title: string;
}

const IFRAME_RE = /<iframe[^>]*src="https:\/\/www\.youtube\.com\/embed\/([^"?]+)[^"]*"[^>]*><\/iframe>/g;
const TITLE_RE = /title="([^"]*)"/;
const PLACEHOLDER_PREFIX = '<!-- youtube:';
const PLACEHOLDER_SUFFIX = ' -->';

/**
 * Extract YouTube iframes from markdown, replacing them with placeholders.
 * Returns the cleaned content and the list of extracted embeds.
 */
function extractVideoEmbeds(content: string): { content: string; embeds: VideoEmbed[] } {
  const embeds: VideoEmbed[] = [];
  const cleaned = content.replace(IFRAME_RE, (match, videoId: string) => {
    const titleMatch = match.match(TITLE_RE);
    embeds.push({ videoId, title: titleMatch?.[1] || 'Video' });
    return `${PLACEHOLDER_PREFIX}${embeds.length - 1}${PLACEHOLDER_SUFFIX}`;
  });
  return { content: cleaned, embeds };
}

function YouTubeWebview({ videoId, title }: VideoEmbed) {
  return (
    <div className="not-prose my-4 rounded-lg overflow-hidden border border-border" style={{ position: 'relative', width: '100%', paddingBottom: '56.25%' }}>
      <webview
        src={`https://www.youtube.com/embed/${videoId}?origin=https://tryvienna.dev`}
        title={title}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
        httpreferrer="https://tryvienna.dev"
        partition="persist:youtube"
      />
    </div>
  );
}

/**
 * Renders markdown content with YouTube embeds replaced by <webview> elements.
 * Splits content at placeholder boundaries and interleaves Markdown + webviews.
 */
function HelpDocContent({ content: rawContent }: { content: string }) {
  const { content, embeds } = useMemo(() => extractVideoEmbeds(rawContent), [rawContent]);

  if (embeds.length === 0) {
    return <Markdown content={content} />;
  }

  // Split on placeholders and interleave markdown segments with webviews
  const segments: React.ReactNode[] = [];
  let remaining = content;

  for (let i = 0; i < embeds.length; i++) {
    const placeholder = `${PLACEHOLDER_PREFIX}${i}${PLACEHOLDER_SUFFIX}`;
    const idx = remaining.indexOf(placeholder);
    if (idx === -1) continue;

    const before = remaining.slice(0, idx).trim();
    if (before) {
      segments.push(<Markdown key={`md-${i}`} content={before} />);
    }
    segments.push(<YouTubeWebview key={`yt-${i}`} {...embeds[i]!} />);
    remaining = remaining.slice(idx + placeholder.length);
  }

  const tail = remaining.trim();
  if (tail) {
    segments.push(<Markdown key="md-tail" content={tail} />);
  }

  return <>{segments}</>;
}

// ─── Prev / Next Navigation ─────────────────────────────────────────────────

function PrevNextNav({ prev, next }: { prev: HelpDocLink | null; next: HelpDocLink | null }) {
  const navigation = useDrawerNavigationOptional();

  if ((!prev && !next) || !navigation) return null;

  const handleNavigate = (link: HelpDocLink) => {
    const doc = getHelpDoc(link.link);
    if (doc) {
      navigation.push(
        helpDocContent(doc.path, doc.label, doc.content),
        doc.label,
      );
    }
  };

  return (
    <div className="mt-6 border-t border-border pt-4 flex items-center justify-between gap-2">
      {prev ? (
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
          onClick={() => handleNavigate(prev)}
        >
          <ChevronLeft size={12} className="opacity-50" />
          {prev.text}
        </button>
      ) : <span />}
      {next ? (
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
          onClick={() => handleNavigate(next)}
        >
          {next.text}
          <ChevronRight size={12} className="opacity-50" />
        </button>
      ) : <span />}
    </div>
  );
}

// ─── Main Drawer ────────────────────────────────────────────────────────────

export function HelpDocDrawer({ content }: { content: DrawerContentDescriptor }) {
  const payload = getHelpDocPayload(content);
  if (!payload) return null;
  return <HelpDocDrawerInner payload={payload} />;
}

function HelpDocDrawerInner({ payload }: { payload: HelpDocPayload }) {
  const doc = getHelpDoc(payload.docId);
  const prev = doc?.prev ?? null;
  const next = doc?.next ?? null;
  const webUrl = getHelpDocWebUrl(payload.docId);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bodyRef.current?.closest('[data-slot="drawer-content"]')?.scrollTo({ top: 0 });
  }, [payload.docId]);

  return (
    <DrawerContainer title={payload.title}>
      <DrawerBody>
        <div ref={bodyRef} className="prose prose-sm dark:prose-invert max-w-none px-1">
          <HelpDocContent content={payload.content} />
        </div>
        <PrevNextNav prev={prev} next={next} />
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            onClick={() => {
              const ipc = getApi(api);
              ipc.shell.openExternal({ url: webUrl }).catch(() => {});
            }}
          >
            View on web
            <ExternalLink size={10} />
          </button>
        </div>
      </DrawerBody>
    </DrawerContainer>
  );
}
