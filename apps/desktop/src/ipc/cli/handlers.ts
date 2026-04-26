import type { ApiHandlers } from '@vienna/ipc';
import type { MainLogger } from '@vienna/logger/main';
import type { cliApi } from './contract';
import {
  installVcliCommand,
  uninstallVcliCommand,
  isVcliInstalled,
  getBundledVcliIndexPath,
} from '../../main/cli/vcli-shell-install';
import { findNodeBinary } from '../../main/mcp/index';

export function createCliHandlers(logger: MainLogger): ApiHandlers<typeof cliApi> {
  const log = logger.child({ domain: 'cli' });

  return {
    cli: {
      getVcliCommand: async () => {
        const vcliIndex = getBundledVcliIndexPath();
        if (!vcliIndex) {
          return { command: null, strategy: 'bundled vcli not found' };
        }

        const nodeBin = findNodeBinary(log);
        if (!nodeBin) {
          return { command: null, strategy: 'node binary not found' };
        }

        return {
          command: `"${nodeBin}" "${vcliIndex}"`,
          strategy: `bundled (${vcliIndex})`,
        };
      },
      installVcli: async () => {
        log.info('Installing vcli shell command');
        return installVcliCommand(log);
      },
      uninstallVcli: async () => {
        log.info('Uninstalling vcli shell command');
        return uninstallVcliCommand(log);
      },
      isVcliInstalled: async () => {
        return isVcliInstalled(log);
      },
    },
  };
}
