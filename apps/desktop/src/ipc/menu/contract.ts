/**
 * Menu IPC Contract
 *
 * @ai-context
 * Event contract for forwarding native menu accelerator activations to the
 * renderer. Required for shortcuts like Cmd+` that macOS intercepts before
 * they reach the renderer's keydown listener.
 *
 * @module ipc/menu/contract
 */

import { z } from 'zod';
import { defineEvents, event } from '@vienna/ipc';

export const menuEvents = defineEvents({
  menu: {
    onAccelerator: event({
      payload: z.object({ commandId: z.string() }),
    }),
  },
});
