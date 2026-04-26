import { useApi } from './use-api';
import type { Changelog } from '../api/types';

export function useChangelog(appId: string | null, from?: string, to?: string) {
  const url =
    appId && from && to
      ? `/api/changelog/${appId}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
      : null;

  return useApi<Changelog>(url);
}
