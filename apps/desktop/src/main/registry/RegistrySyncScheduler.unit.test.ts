import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RegistrySyncScheduler } from './RegistrySyncScheduler';
import type { RegistryManager } from './RegistryManager';

function createMockManager() {
  return {
    sync: vi.fn().mockResolvedValue({ synced: 1 }),
  } as unknown as RegistryManager;
}

describe('RegistrySyncScheduler', () => {
  let manager: ReturnType<typeof createMockManager>;
  type LogFn = (msg: string, ctx?: Record<string, unknown>) => void;
  let logger: { info: ReturnType<typeof vi.fn<LogFn>>; warn: ReturnType<typeof vi.fn<LogFn>>; debug: ReturnType<typeof vi.fn<LogFn>> };

  beforeEach(() => {
    vi.useFakeTimers();
    manager = createMockManager();
    logger = { info: vi.fn<LogFn>(), warn: vi.fn<LogFn>(), debug: vi.fn<LogFn>() };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts with 15s delay then ticks at interval', async () => {
    const scheduler = new RegistrySyncScheduler({ manager, logger });
    scheduler.start(60_000);

    expect(manager.sync).not.toHaveBeenCalled();

    // Advance past initial 15s delay
    await vi.advanceTimersByTimeAsync(15_000);
    expect(manager.sync).toHaveBeenCalledTimes(1);

    // Advance to next interval tick
    await vi.advanceTimersByTimeAsync(60_000);
    expect(manager.sync).toHaveBeenCalledTimes(2);

    scheduler.stop();
  });

  it('is idempotent on start', () => {
    const scheduler = new RegistrySyncScheduler({ manager, logger });
    scheduler.start(60_000);
    scheduler.start(60_000); // No extra timers
    expect(logger.info).toHaveBeenCalledTimes(1);
    scheduler.stop();
  });

  it('stop prevents further ticks', async () => {
    const scheduler = new RegistrySyncScheduler({ manager, logger });
    scheduler.start(60_000);
    scheduler.stop();

    await vi.advanceTimersByTimeAsync(60_000);
    expect(manager.sync).not.toHaveBeenCalled();
  });

  it('stop during interval phase clears interval', async () => {
    const scheduler = new RegistrySyncScheduler({ manager, logger });
    scheduler.start(60_000);

    // Advance past delay into interval phase
    await vi.advanceTimersByTimeAsync(15_000);
    expect(manager.sync).toHaveBeenCalledTimes(1);

    scheduler.stop();

    // Advance — should not tick again
    await vi.advanceTimersByTimeAsync(120_000);
    expect(manager.sync).toHaveBeenCalledTimes(1);
  });

  it('calls onSynced when synced > 0', async () => {
    const onSynced = vi.fn();
    const scheduler = new RegistrySyncScheduler({ manager, logger, onSynced });
    scheduler.start(60_000);

    await vi.advanceTimersByTimeAsync(15_000);
    expect(onSynced).toHaveBeenCalledTimes(1);
    scheduler.stop();
  });

  it('skips onSynced when synced === 0', async () => {
    vi.mocked(manager.sync).mockResolvedValue({ synced: 0 });
    const onSynced = vi.fn();
    const scheduler = new RegistrySyncScheduler({ manager, logger, onSynced });
    scheduler.start(60_000);

    await vi.advanceTimersByTimeAsync(15_000);
    expect(onSynced).not.toHaveBeenCalled();
    scheduler.stop();
  });

  it('catches sync errors', async () => {
    vi.mocked(manager.sync).mockRejectedValue(new Error('network'));
    const scheduler = new RegistrySyncScheduler({ manager, logger });
    scheduler.start(60_000);

    await vi.advanceTimersByTimeAsync(15_000);
    expect(logger.warn).toHaveBeenCalledWith(
      'RegistrySyncScheduler tick failed',
      expect.objectContaining({ error: 'network' }),
    );

    // Should still schedule next tick
    vi.mocked(manager.sync).mockResolvedValue({ synced: 1 });
    await vi.advanceTimersByTimeAsync(60_000);
    expect(manager.sync).toHaveBeenCalledTimes(2);
    scheduler.stop();
  });

  it('catches onSynced callback errors', async () => {
    const onSynced = vi.fn().mockRejectedValue(new Error('callback error'));
    const scheduler = new RegistrySyncScheduler({ manager, logger, onSynced });
    scheduler.start(60_000);

    await vi.advanceTimersByTimeAsync(15_000);
    expect(logger.warn).toHaveBeenCalledWith(
      'Post-sync callback failed',
      expect.objectContaining({ error: 'callback error' }),
    );
    scheduler.stop();
  });

  it('skips concurrent ticks (mutex)', async () => {
    let resolveSync!: () => void;
    vi.mocked(manager.sync).mockReturnValue(
      new Promise<{ synced: number }>((resolve) => {
        resolveSync = () => resolve({ synced: 1 });
      }),
    );

    const scheduler = new RegistrySyncScheduler({ manager, logger });
    scheduler.start(1_000); // Short interval for testing

    // Trigger first tick
    await vi.advanceTimersByTimeAsync(15_000);
    expect(manager.sync).toHaveBeenCalledTimes(1);

    // Advance past interval — should skip because first tick still running
    await vi.advanceTimersByTimeAsync(1_000);
    expect(manager.sync).toHaveBeenCalledTimes(1);
    expect(logger.debug).toHaveBeenCalledWith('Sync tick skipped — already syncing');

    // Resolve first sync
    resolveSync();
    await vi.advanceTimersByTimeAsync(0);

    // Next interval should work
    await vi.advanceTimersByTimeAsync(1_000);
    expect(manager.sync).toHaveBeenCalledTimes(2);
    scheduler.stop();
  });
});
