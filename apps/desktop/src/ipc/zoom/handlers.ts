import { BrowserWindow } from 'electron';
import type { ApiHandlers } from '@vienna/ipc';
import type { SettingsRepository } from '@vienna/app-db';
import type { zoomApi } from './contract';

const MIN_ZOOM = -5;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.5;

export function createZoomHandlers(settings: SettingsRepository): ApiHandlers<typeof zoomApi> {
  function getWebContents() {
    return BrowserWindow.getFocusedWindow()?.webContents ?? BrowserWindow.getAllWindows()[0]?.webContents;
  }

  return {
    zoom: {
      zoomIn: () => {
        const wc = getWebContents();
        if (!wc) return { zoomLevel: 0 };
        const next = Math.min(wc.getZoomLevel() + ZOOM_STEP, MAX_ZOOM);
        wc.setZoomLevel(next);
        settings.update('appearance', { zoomLevel: next });
        return { zoomLevel: next };
      },
      zoomOut: () => {
        const wc = getWebContents();
        if (!wc) return { zoomLevel: 0 };
        const next = Math.max(wc.getZoomLevel() - ZOOM_STEP, MIN_ZOOM);
        wc.setZoomLevel(next);
        settings.update('appearance', { zoomLevel: next });
        return { zoomLevel: next };
      },
      resetZoom: () => {
        const wc = getWebContents();
        if (!wc) return { zoomLevel: 0 };
        wc.setZoomLevel(0);
        settings.update('appearance', { zoomLevel: 0 });
        return { zoomLevel: 0 };
      },
    },
  };
}
