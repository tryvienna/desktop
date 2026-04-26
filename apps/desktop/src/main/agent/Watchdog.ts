/**
 * Watchdog — Health monitoring and auto-restart for agent sessions
 *
 * Periodically checks if the agent provider process is healthy.
 * If the process has died unexpectedly, emits a crash event and
 * optionally triggers auto-restart.
 *
 * @module main/agent/Watchdog
 */

export interface WatchdogOptions {
  /** Check interval in milliseconds. Default: 30_000 */
  checkIntervalMs?: number;
  /** Auto-restart on crash. Default: false */
  autoRestart?: boolean;
  /** Maximum auto-restart attempts. Default: 3 */
  maxRestarts?: number;
}

export interface WatchdogCallbacks {
  isHealthy: () => boolean;
  onUnhealthy: () => void;
  onRestart?: () => Promise<void>;
}

export class Watchdog {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private restartCount = 0;
  private options: Required<WatchdogOptions>;
  private callbacks: WatchdogCallbacks;

  constructor(callbacks: WatchdogCallbacks, options: WatchdogOptions = {}) {
    this.callbacks = callbacks;
    this.options = {
      checkIntervalMs: options.checkIntervalMs ?? 30_000,
      autoRestart: options.autoRestart ?? false,
      maxRestarts: options.maxRestarts ?? 3,
    };
  }

  /** Start the health check loop */
  start(): void {
    if (this.intervalId) return;

    this.intervalId = setInterval(() => {
      this.check();
    }, this.options.checkIntervalMs);
  }

  /** Stop the health check loop */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /** Reset restart counter (call after successful user interaction) */
  resetRestartCount(): void {
    this.restartCount = 0;
  }

  private async check(): Promise<void> {
    if (this.callbacks.isHealthy()) return;

    this.callbacks.onUnhealthy();

    if (this.options.autoRestart && this.restartCount < this.options.maxRestarts) {
      this.restartCount++;
      if (this.callbacks.onRestart) {
        try {
          await this.callbacks.onRestart();
        } catch {
          // Restart failed — will be caught on next check
        }
      }
    }
  }
}
