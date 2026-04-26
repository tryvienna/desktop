import { z } from 'zod';
import { defineApi, method } from '@vienna/ipc';

export const zoomApi = defineApi({
  zoom: {
    zoomIn: method({
      input: z.object({}),
      output: z.object({ zoomLevel: z.number() }),
    }),
    zoomOut: method({
      input: z.object({}),
      output: z.object({ zoomLevel: z.number() }),
    }),
    resetZoom: method({
      input: z.object({}),
      output: z.object({ zoomLevel: z.number() }),
    }),
  },
});
