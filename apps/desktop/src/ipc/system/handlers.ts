import { app } from 'electron';
import type { ApiHandlers } from '@vienna/ipc';
import { createRendererEnv } from '@vienna/env/renderer';
import { mainEnv } from '@vienna/env/main';
import type { systemApi } from './contract';
import type { UpdateChecker } from '../../main/update/UpdateChecker';
import { setTrayLabel } from '../../main/tray';

declare const __VIENNA_COMMIT__: string;

const rendererEnv = createRendererEnv(mainEnv);

const emptyUpdateState = {
  available: false as const,
  currentVersion: app.getVersion(),
  latestVersion: null,
  releaseNotes: null,
  downloadUrl: null,
  publishedAt: null,
};

export function createSystemHandlers(updateChecker?: UpdateChecker): ApiHandlers<typeof systemApi> {
  return {
    system: {
      getVersions: () => ({
        app: app.getVersion(),
        commit: typeof __VIENNA_COMMIT__ !== 'undefined' ? __VIENNA_COMMIT__ : 'dev',
        electron: process.versions.electron,
        node: process.versions.node,
        chrome: process.versions.chrome,
      }),
      getEnv: () => rendererEnv,
      checkForUpdate: async () => {
        if (!updateChecker) return emptyUpdateState;
        return updateChecker.check();
      },
      getUpdateState: () => {
        if (!updateChecker) return emptyUpdateState;
        return updateChecker.getState();
      },
      downloadUpdate: async () => {
        if (!updateChecker) return { success: false, error: 'Update checker not configured' };
        return updateChecker.downloadAndOpen();
      },
      setTrayLabel: ({ label }) => {
        setTrayLabel(label);
        return { success: true };
      },
    },
  };
}
