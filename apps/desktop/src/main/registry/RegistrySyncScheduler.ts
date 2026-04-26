/**
 * RegistrySyncScheduler — Periodic background sync for registries.
 *
 * Checks for remote changes every 6 hours, pulls registries with
 * updates, and triggers a callback when content changes.
 *
 * @module main/registry/RegistrySyncScheduler
 */

import type { RegistryManager } from './RegistryManager';

export interface RegistrySyncSchedulerDeps {
  manager: RegistryManager;
  logger: {
    info: (msg: string, ctx?: Record<string, unknown>) => void;
    warn: (msg: string, ctx?: Record<string, unknown>) => void;
    debug: (msg: string, ctx?: Record<string, unknown>) => void;
  };
  onSynced?: () => void | Promise<void>;
}

export class RegistrySyncScheduler {
  private readonly manager: RegistryManager;
  private readonly logger: RegistrySyncSchedulerDeps['logger'];
  private readonly onSynced?: () => void | Promise<void>;
  private delayTimer: ReturnType<typeof setTimeout> | null = null;
  private intervalTimer: ReturnType<typeof setInterval> | null = null;
  private syncing = false;

  constructor(deps: RegistrySyncSchedulerDeps) {
    this.manager = deps.manager;
    this.logger = deps.logger;
    this.onSynced = deps.onSynced;
  }

  start(intervalMs = 6 * 60 * 60 * 1000): void {
    if (this.delayTimer || this.intervalTimer) return;
    this.logger.info('RegistrySyncScheduler starting', { intervalMs });

    // Initial delay to let startup complete
    this.delayTimer = setTimeout(() => {
      this.delayTimer = null;
      void this.tick();
      this.intervalTimer = setInterval(() => void this.tick(), intervalMs);
    }, 15_000);
  }

  stop(): void {
    if (this.delayTimer) {
      clearTimeout(this.delayTimer);
      this.delayTimer = null;
    }
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
    this.logger.info('RegistrySyncScheduler stopped');
  }

  private async tick(): Promise<void> {
    if (this.syncing) {
      this.logger.debug('Sync tick skipped — already syncing');
      return;
    }

    this.syncing = true;
    this.logger.info('RegistrySyncScheduler tick');

    try {
      const result = await this.manager.sync();

      if (result.synced > 0 && this.onSynced) {
        try {
          await this.onSynced();
        } catch (err) {
          const error = err instanceof Error ? err.message : String(err);
          this.logger.warn('Post-sync callback failed', { error });
        }
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      this.logger.warn('RegistrySyncScheduler tick failed', { error });
    } finally {
      this.syncing = false;
    }
  }
}
