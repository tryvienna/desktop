/**
 * Shared renderer logger instance.
 *
 * All renderer-side code should import from here rather than calling
 * createRendererLogger() directly — this ensures a single logger
 * with consistent bindings across all hooks and components.
 */

import { createRendererLogger } from '@vienna/logger/renderer';

export const rendererLogger = createRendererLogger();
export type { RendererLogger } from '@vienna/logger/renderer';
