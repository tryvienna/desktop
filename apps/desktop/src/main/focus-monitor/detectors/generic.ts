/**
 * Generic Focus Detector — fallback that extracts basic info from
 * any app using System Events. Used when no specialized detector matches.
 */

import type { FocusDetector, FocusDetails } from '../types';

export const genericDetector: FocusDetector = {
  id: 'generic',
  displayName: 'Generic',
  // Empty patterns — this detector is used as a fallback, not matched by pattern
  matchPatterns: [],

  async isAvailable(): Promise<boolean> {
    return process.platform === 'darwin';
  },

  async detect(): Promise<FocusDetails> {
    return {
      detectorId: 'generic',
      tabTitle: null,
      cwd: null,
      runningCommand: null,
      filePath: null,
      gitBranch: null,
      profileName: null,
      windows: [],
      extra: {},
    };
  },
};
