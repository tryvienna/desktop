import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Watchdog } from './Watchdog';

describe('Watchdog', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not call callbacks when healthy', () => {
    const onUnhealthy = vi.fn();
    const watchdog = new Watchdog(
      { isHealthy: () => true, onUnhealthy },
      { checkIntervalMs: 1000 }
    );

    watchdog.start();
    vi.advanceTimersByTime(5000);
    watchdog.stop();

    expect(onUnhealthy).not.toHaveBeenCalled();
  });

  it('calls onUnhealthy when health check fails', () => {
    const onUnhealthy = vi.fn();
    const watchdog = new Watchdog(
      { isHealthy: () => false, onUnhealthy },
      { checkIntervalMs: 1000 }
    );

    watchdog.start();
    vi.advanceTimersByTime(1000);
    watchdog.stop();

    expect(onUnhealthy).toHaveBeenCalledTimes(1);
  });

  it('calls onRestart when autoRestart is enabled and unhealthy', async () => {
    const onRestart = vi.fn().mockResolvedValue(undefined);
    const watchdog = new Watchdog(
      { isHealthy: () => false, onUnhealthy: vi.fn(), onRestart },
      { checkIntervalMs: 1000, autoRestart: true, maxRestarts: 3 }
    );

    watchdog.start();
    await vi.advanceTimersByTimeAsync(1000);
    watchdog.stop();

    expect(onRestart).toHaveBeenCalledTimes(1);
  });

  it('stops restarting after maxRestarts is exceeded', async () => {
    const onRestart = vi.fn().mockResolvedValue(undefined);
    const watchdog = new Watchdog(
      { isHealthy: () => false, onUnhealthy: vi.fn(), onRestart },
      { checkIntervalMs: 1000, autoRestart: true, maxRestarts: 2 }
    );

    watchdog.start();
    // Trigger 3 checks — only 2 should restart
    await vi.advanceTimersByTimeAsync(3000);
    watchdog.stop();

    expect(onRestart).toHaveBeenCalledTimes(2);
  });

  it('resetRestartCount allows more restarts', async () => {
    const onRestart = vi.fn().mockResolvedValue(undefined);
    const watchdog = new Watchdog(
      { isHealthy: () => false, onUnhealthy: vi.fn(), onRestart },
      { checkIntervalMs: 1000, autoRestart: true, maxRestarts: 1 }
    );

    watchdog.start();
    await vi.advanceTimersByTimeAsync(2000); // 2 checks, 1 restart (maxed out)
    expect(onRestart).toHaveBeenCalledTimes(1);

    watchdog.resetRestartCount();
    await vi.advanceTimersByTimeAsync(1000); // 1 more check, restart is allowed again
    expect(onRestart).toHaveBeenCalledTimes(2);

    watchdog.stop();
  });

  it('does not restart when autoRestart is false', async () => {
    const onRestart = vi.fn();
    const watchdog = new Watchdog(
      { isHealthy: () => false, onUnhealthy: vi.fn(), onRestart },
      { checkIntervalMs: 1000, autoRestart: false }
    );

    watchdog.start();
    await vi.advanceTimersByTimeAsync(3000);
    watchdog.stop();

    expect(onRestart).not.toHaveBeenCalled();
  });

  it('start is idempotent (no duplicate intervals)', () => {
    const onUnhealthy = vi.fn();
    const watchdog = new Watchdog(
      { isHealthy: () => false, onUnhealthy },
      { checkIntervalMs: 1000 }
    );

    watchdog.start();
    watchdog.start(); // second call should be a no-op
    vi.advanceTimersByTime(1000);
    watchdog.stop();

    expect(onUnhealthy).toHaveBeenCalledTimes(1);
  });

  it('stop is idempotent (no error on double stop)', () => {
    const watchdog = new Watchdog(
      { isHealthy: () => true, onUnhealthy: vi.fn() },
      { checkIntervalMs: 1000 }
    );

    watchdog.start();
    watchdog.stop();
    expect(() => watchdog.stop()).not.toThrow();
  });

  it('handles onRestart failure gracefully', async () => {
    const onRestart = vi.fn().mockRejectedValue(new Error('restart failed'));
    const onUnhealthy = vi.fn();
    const watchdog = new Watchdog(
      { isHealthy: () => false, onUnhealthy, onRestart },
      { checkIntervalMs: 1000, autoRestart: true, maxRestarts: 3 }
    );

    watchdog.start();
    await vi.advanceTimersByTimeAsync(1000);
    watchdog.stop();

    // Should not throw, just catch and continue
    expect(onRestart).toHaveBeenCalledTimes(1);
    expect(onUnhealthy).toHaveBeenCalledTimes(1);
  });

  it('uses default options when none provided', () => {
    const onUnhealthy = vi.fn();
    const watchdog = new Watchdog({ isHealthy: () => false, onUnhealthy });

    watchdog.start();
    // Default interval is 30_000ms
    vi.advanceTimersByTime(29_999);
    expect(onUnhealthy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onUnhealthy).toHaveBeenCalledTimes(1);

    watchdog.stop();
  });
});
