/**
 * Detector Registry — exports all built-in focus detectors.
 *
 * To add a new detector:
 *   1. Create a new file in this directory implementing FocusDetector
 *   2. Export it here
 *   3. Add it to the ALL_DETECTORS array
 *
 * The FocusMonitor will automatically match detectors by bundle ID / app name.
 */

import type { FocusDetector } from '../types';
import { itermDetector } from './iterm';
import { terminalDetector } from './terminal';
import { vscodeDetector } from './vscode';

export { itermDetector } from './iterm';
export { terminalDetector } from './terminal';
export { vscodeDetector } from './vscode';
export { genericDetector } from './generic';

/** All built-in detectors in priority order. */
export const ALL_DETECTORS: FocusDetector[] = [
  itermDetector,
  terminalDetector,
  vscodeDetector,
];
