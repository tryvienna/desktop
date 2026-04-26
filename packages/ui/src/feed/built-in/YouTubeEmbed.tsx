/**
 * YouTubeEmbed — Webview-based YouTube player with playback tracking.
 *
 * Tracks playback position via polling the <video> element inside the
 * webview. When the webview remounts (detach/reattach/navigation), it
 * restores the position and auto-plays if the video was playing.
 *
 * Shows a loading skeleton until the webview is ready. Adds a pointer-event
 * shield on hover so overlay buttons can receive clicks above the webview.
 */

import { useRef, useEffect, useState, useMemo } from 'react';
import { cn } from '../../utils/cn';
import { useDetachableSafe } from '../detachable/DetachableContext';

export interface YouTubeEmbedProps {
  videoId: string;
  cardId: string;
  title?: string;
}

export function YouTubeEmbed({ videoId, cardId, title }: YouTubeEmbedProps) {
  const ctx = useDetachableSafe();
  const webviewRef = useRef<HTMLWebViewElement>(null);
  const [hovered, setHovered] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Compute embed URL ONCE on mount — never changes, so webview never reloads
  const embedUrl = useMemo(() => {
    const saved = ctx?.playbackStates.get(cardId);
    // Add 1s to compensate for polling interval + load time
    const startTime = saved?.currentTime ? Math.floor(saved.currentTime) + 1 : 0;
    const autoplay = saved?.playing ? 1 : 0;
    return `https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=https://tryvienna.dev&start=${startTime}&autoplay=${autoplay}`;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll playback position from the YouTube player
  useEffect(() => {
    const wv = webviewRef.current;
    if (!wv || !ctx) return;

    let polling: ReturnType<typeof setInterval> | null = null;

    const startPolling = () => {
      polling = setInterval(async () => {
        try {
          const result = await (wv as any).executeJavaScript(`
            (function() {
              try {
                var p = document.querySelector('video');
                if (p) return JSON.stringify({ currentTime: p.currentTime, playing: !p.paused });
              } catch(e) {}
              return null;
            })()
          `);
          if (result) {
            const state = JSON.parse(result);
            ctx.playbackStates.set(cardId, state);
          }
        } catch {
          // webview not ready or navigating
        }
      }, 1000);
    };

    const handleDomReady = () => {
      setLoaded(true);
      startPolling();
    };
    wv.addEventListener('dom-ready', handleDomReady);

    return () => {
      wv.removeEventListener('dom-ready', handleDomReady);
      if (polling) clearInterval(polling);
    };
  }, [cardId, ctx]);

  return (
    <div
      className="relative w-full"
      style={{ paddingBottom: '56.25%' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Loading skeleton */}
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
          <div className="flex flex-col items-center gap-2">
            <div className={cn(
              'flex items-center justify-center w-12 h-12 rounded-full',
              'bg-muted-foreground/10',
            )}>
              <svg width={20} height={20} viewBox="0 0 24 24" fill="currentColor" className="text-muted-foreground/40 ml-0.5">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            <span className="text-xs text-muted-foreground">Loading video...</span>
          </div>
        </div>
      )}
      <webview
        ref={webviewRef as any}
        src={embedUrl}
        title={title ?? 'YouTube video'}
        httpreferrer="https://tryvienna.dev"
        partition="persist:youtube"
        style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none',
          opacity: loaded ? 1 : 0,
          transition: 'opacity 200ms ease-in',
        }}
      />
      {/* Pointer-event shield: blocks webview from eating clicks when overlay is visible */}
      {hovered && (
        <div
          style={{ position: 'absolute', top: 0, right: 0, width: '80px', height: '40px', zIndex: 5 }}
        />
      )}
    </div>
  );
}
