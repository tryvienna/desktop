/**
 * useUpdateAvailable — Reads cached update state from the main process.
 *
 * @ai-context
 * - Polls the main process for update state every 5 minutes
 * - Returns null while loading, then the UpdateState object
 * - Does NOT trigger network requests — reads cached state from UpdateChecker
 */

import { useEffect, useMemo, useState } from 'react';
import { getApi } from '@vienna/ipc/renderer';
import { api } from '../ipc';

export interface UpdateState {
  available: boolean;
  currentVersion: string;
  latestVersion: string | null;
  releaseNotes: string | null;
  downloadUrl: string | null;
  publishedAt: string | null;
}

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

/** Check whether an update state has all required fields to show the update UI. */
export function isActionableUpdate(
  state: UpdateState | null,
): state is UpdateState & { latestVersion: string; releaseNotes: string; downloadUrl: string } {
  return !!(state?.available && state.latestVersion && state.releaseNotes && state.downloadUrl);
}

export function useUpdateAvailable(): UpdateState | null {
  const ipc = useMemo(() => getApi(api), []);
  const [state, setState] = useState<UpdateState | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchState = () => {
      ipc.system.getUpdateState({}).then((s: UpdateState) => {
        if (!cancelled) setState(s);
      }).catch(() => {});
    };

    fetchState();
    const id = setInterval(fetchState, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [ipc]);

  return state;
}
