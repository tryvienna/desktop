import { describe, it, expect, vi } from 'vitest';

vi.mock('electron', () => ({
  app: { getVersion: () => '0.0.1' },
}));

vi.mock('@vienna/env/main', () => ({
  mainEnv: { NODE_ENV: 'test' },
}));

vi.mock('@vienna/env/renderer', () => ({
  createRendererEnv: vi.fn(() => ({
    NODE_ENV: 'test',
  })),
}));

const { createSystemHandlers } = await import('./handlers');
const systemHandlers = createSystemHandlers();

describe('systemHandlers', () => {
  describe('system.getVersions', () => {
    it('returns process version strings', async () => {
      const result = await systemHandlers.system.getVersions({});
      expect(result).toHaveProperty('app');
      expect(result).toHaveProperty('commit');
      expect(result).toHaveProperty('node');
      expect(result).toHaveProperty('electron');
      expect(result).toHaveProperty('chrome');
      expect(result.app).toBe('0.0.1');
    });
  });

  describe('system.getEnv', () => {
    it('returns the renderer env', () => {
      const result = systemHandlers.system.getEnv({});
      expect(result).toEqual({ NODE_ENV: 'test' });
    });
  });
});
