/**
 * usePlaybackMarkers — Fire callbacks at specific playback timestamps.
 *
 * Markers fire when playback crosses their timestamp going forward.
 * If the user rewinds past a marker, it re-arms and fires again on
 * the next forward crossing. Works with any content tracked by the
 * DetachableContext playback system.
 *
 * @example
 * usePlaybackMarkers('my-video', [
 *   { time: 7, action: (ctx) => ctx.detach('my-video') },
 *   { time: 30, action: () => console.log('30s reached') },
 *   { time: 60, action: (ctx) => ctx.enterFullscreen('my-video') },
 * ]);
 */

import { useEffect, useRef } from 'react';
import { useDetachableSafe, type DetachableContextValue } from './DetachableContext';

export interface PlaybackMarker {
  /** Timestamp in seconds when this marker fires. */
  time: number;
  /** Callback invoked when playback crosses this timestamp. Receives the detachable context. */
  action: (ctx: DetachableContextValue) => void;
}

export function usePlaybackMarkers(cardId: string, markers: PlaybackMarker[]) {
  const ctx = useDetachableSafe();
  const lastTimeRef = useRef<number>(-1);
  const markersRef = useRef(markers);
  markersRef.current = markers;

  useEffect(() => {
    if (!ctx) return;

    const interval = setInterval(() => {
      const pb = ctx.playbackStates.get(cardId);
      if (!pb || !pb.playing) return;

      const now = pb.currentTime;
      const last = lastTimeRef.current;

      // Detect rewind: if current time is significantly before last time,
      // just update lastTime — markers will re-fire on the next forward pass
      if (now < last - 1) {
        lastTimeRef.current = now;
        return;
      }

      // Fire any markers that were crossed since last check
      for (const marker of markersRef.current) {
        if (last < marker.time && now >= marker.time) {
          marker.action(ctx);
        }
      }

      lastTimeRef.current = now;
    }, 500);

    return () => clearInterval(interval);
  }, [ctx, cardId]);
}
