import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@tryvienna/ui', () => ({
  NotificationToast: 'NotificationToast',
  CUSTOM_TOAST_CLASS: '!bg-transparent !border-0 !shadow-none !p-0',
  toast: { custom: vi.fn(), dismiss: vi.fn() },
}));

import { toast } from '@tryvienna/ui';
import { createNotificationService, type NotificationSettings } from './notification-service';

function createMockStorage(initial?: Record<string, string>): Storage {
  const data = new Map(Object.entries(initial ?? {}));
  return {
    getItem: vi.fn((key: string) => data.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => data.set(key, value)),
    removeItem: vi.fn((key: string) => data.delete(key)),
    clear: vi.fn(() => data.clear()),
    get length() { return data.size; },
    key: vi.fn((i: number) => [...data.keys()][i] ?? null),
  };
}

function setup(opts?: { storage?: Storage; settings?: Partial<NotificationSettings> }) {
  const storage = opts?.storage ?? createMockStorage(
    opts?.settings
      ? { 'vienna:notification-settings': JSON.stringify(opts.settings) }
      : undefined
  );
  const service = createNotificationService({ storage });
  return { service, storage };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('createNotificationService', () => {
  describe('settings', () => {
    it('loads default settings when storage is empty', () => {
      const { service } = setup();
      expect(service.getSettings().enabled).toBe(true);
    });

    it('loads and merges stored settings', () => {
      const { service } = setup({ settings: { enabled: false } });
      expect(service.getSettings().enabled).toBe(false);
    });

    it('persists settings on update', () => {
      const storage = createMockStorage();
      const { service } = setup({ storage });
      service.updateSettings({ enabled: false });
      expect(storage.setItem).toHaveBeenCalledWith(
        'vienna:notification-settings',
        expect.stringContaining('"enabled":false')
      );
      expect(service.getSettings().enabled).toBe(false);
    });

    it('handles corrupted storage gracefully', () => {
      const storage = createMockStorage({ 'vienna:notification-settings': '{invalid json' });
      const { service } = setup({ storage });
      expect(service.getSettings().enabled).toBe(true);
    });
  });

  describe('generic methods', () => {
    it.each(['info', 'error', 'success', 'warning'] as const)(
      '%s shows toast with correct variant',
      (method) => {
        const { service } = setup();
        service[method]('Test message', { description: 'Details' });
        expect(toast.custom).toHaveBeenCalledOnce();

        const renderFn = (toast.custom as ReturnType<typeof vi.fn>).mock.calls[0][0];
        const element = renderFn('toast-id');
        expect(element.props.variant).toBe(method);
        expect(element.props.title).toBe('Test message');
        expect(element.props.description).toBe('Details');
      }
    );

    it('error toast is persistent (duration 0) by default', () => {
      const { service } = setup();
      service.error('Failed');
      const opts = (toast.custom as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(opts.duration).toBe(0);
    });

    it('respects custom duration', () => {
      const { service } = setup();
      service.info('Quick', { duration: 1000 });
      const opts = (toast.custom as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(opts.duration).toBe(1000);
    });

    it('does nothing when globally disabled', () => {
      const { service } = setup({ settings: { enabled: false } });
      service.info('Hello');
      expect(toast.custom).not.toHaveBeenCalled();
    });

    it('passes onClick to NotificationToast', () => {
      const onClick = vi.fn();
      const { service } = setup();
      service.info('Click me', { onClick });
      const renderFn = (toast.custom as ReturnType<typeof vi.fn>).mock.calls[0][0];
      const element = renderFn('toast-id');
      expect(element.props.onClick).toBe(onClick);
    });

    it('passes actions to NotificationToast', () => {
      const action = { label: 'Go', onClick: vi.fn() };
      const { service } = setup();
      service.warning('Review', { actions: [action] });
      const renderFn = (toast.custom as ReturnType<typeof vi.fn>).mock.calls[0][0];
      const element = renderFn('toast-id');
      expect(element.props.actions).toEqual([action]);
    });
  });

  describe('deduplication', () => {
    it('suppresses duplicate notification with same dedupKey', () => {
      const { service } = setup();
      service.info('A', { dedupKey: 'key-1' });
      service.info('B', { dedupKey: 'key-1' });
      expect(toast.custom).toHaveBeenCalledOnce();
    });

    it('allows notifications with different dedupKeys', () => {
      const { service } = setup();
      service.info('A', { dedupKey: 'key-1' });
      service.info('B', { dedupKey: 'key-2' });
      expect(toast.custom).toHaveBeenCalledTimes(2);
    });

    it('allows notifications without dedupKey (no dedup)', () => {
      const { service } = setup();
      service.info('A');
      service.info('B');
      expect(toast.custom).toHaveBeenCalledTimes(2);
    });
  });

  describe('dismissAll', () => {
    it('calls toast.dismiss()', () => {
      const { service } = setup();
      service.dismissAll();
      expect(toast.dismiss).toHaveBeenCalledOnce();
    });
  });
});
