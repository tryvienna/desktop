import { useEffect, useMemo } from 'react';
import { useQuery } from '@vienna/graphql/client';
import { GET_SETTINGS } from '@vienna/graphql/client';
import { getApi } from '@vienna/ipc/renderer';
import { api } from '../../ipc';
import { rendererLogger } from '../logger';

/**
 * Returns the effective developer mode state and syncs loggers accordingly.
 *
 * Resolution: explicit user setting (true/false) wins;
 * null (unset) falls back to the build environment
 * (true for dev builds, false for production).
 */
export function useDeveloperMode(): boolean {
  const { data } = useQuery(GET_SETTINGS);
  const ipc = useMemo(() => getApi(api), []);

  const stored = data?.settings?.advanced?.developerMode ?? null;
  const effective = stored ?? import.meta.env.DEV;

  useEffect(() => {
    rendererLogger.setEnabled(effective);
    void ipc.logger.setEnabled({ enabled: effective });
  }, [effective, ipc]);

  return effective;
}
