import { describe, it, expect, vi } from 'vitest';
import type { MainLogger } from '@vienna/logger/main';
import type { IpcMainLike } from '@vienna/ipc/main';

// Mock all handler modules
vi.mock('./system/handlers', () => ({
  systemHandlers: { system: { getVersions: vi.fn(), getEnv: vi.fn() } },
}));

vi.mock('./logger/handlers', () => ({
  createLoggerHandlers: vi.fn(() => ({ logger: { log: vi.fn(), getSessionId: vi.fn() } })),
}));

vi.mock('./agent/handlers', () => ({
  createAgentHandlers: vi.fn(() => ({
    agent: { startSession: vi.fn(), stopSession: vi.fn() },
  })),
}));

vi.mock('./graphql/handlers', () => ({
  createGraphqlHandlers: vi.fn(() => ({
    graphql: { execute: vi.fn() },
  })),
}));

vi.mock('./auth/handlers', () => ({
  createAuthHandlers: vi.fn(() => ({
    auth: { openBrowserAuth: vi.fn(), getAuthState: vi.fn(), logout: vi.fn() },
  })),
}));

vi.mock('@vienna/ipc/main', () => ({
  implement: vi.fn().mockReturnValue(() => {}),
}));

const { registerIpc } = await import('./register');
const { implement } = await import('@vienna/ipc/main');
const { createAgentHandlers } = await import('./agent/handlers');
const { createGraphqlHandlers } = await import('./graphql/handlers');
const { createAuthHandlers } = await import('./auth/handlers');

function createMockIpcMain(): IpcMainLike {
  return { handle: vi.fn() } as unknown as IpcMainLike;
}

function createMockLogger(): MainLogger {
  return { info: vi.fn(), error: vi.fn() } as unknown as MainLogger;
}

describe('registerIpc', () => {
  it('returns a cleanup function', () => {
    const cleanup = registerIpc(createMockIpcMain(), createMockLogger());
    expect(typeof cleanup).toBe('function');
  });

  it('calls implement with ipcMain and merged handlers', () => {
    const ipcMain = createMockIpcMain();
    const logger = createMockLogger();

    registerIpc(ipcMain, logger);

    expect(implement).toHaveBeenCalledWith(ipcMain, expect.anything(), expect.any(Object));
  });

  it('uses real agent handlers when sessionManager and providerRegistry provided', () => {
    const ipcMain = createMockIpcMain();
    const logger = createMockLogger();
    const sessionManager = {} as never;
    const providerRegistry = {} as never;

    registerIpc(ipcMain, logger, { sessionManager, providerRegistry });

    expect(createAgentHandlers).toHaveBeenCalledWith(sessionManager, providerRegistry);
  });

  it('uses stub agent handlers when sessionManager not provided', () => {
    vi.mocked(createAgentHandlers).mockClear();
    const ipcMain = createMockIpcMain();
    const logger = createMockLogger();

    registerIpc(ipcMain, logger);

    expect(createAgentHandlers).not.toHaveBeenCalled();

    // The stub handlers should throw "Not configured"
    const handlerArg = vi.mocked(implement).mock.calls.at(-1)![2] as Record<
      string,
      Record<string, () => void>
    >;
    expect(() => handlerArg.agent.startSession()).toThrow('Not configured');
  });

  it('uses real graphql handlers when appDb provided', () => {
    const ipcMain = createMockIpcMain();
    const logger = createMockLogger();
    const appDb = {} as never;

    registerIpc(ipcMain, logger, { appDb });

    expect(createGraphqlHandlers).toHaveBeenCalledWith(appDb, expect.any(Object));
  });

  it('uses stub graphql handlers when appDb not provided', () => {
    vi.mocked(createGraphqlHandlers).mockClear();
    const ipcMain = createMockIpcMain();
    const logger = createMockLogger();

    registerIpc(ipcMain, logger);

    expect(createGraphqlHandlers).not.toHaveBeenCalled();

    const handlerArg = vi.mocked(implement).mock.calls.at(-1)![2] as Record<
      string,
      Record<string, () => void>
    >;
    expect(() => handlerArg.graphql.execute()).toThrow('Not configured');
  });

  it('uses real auth handlers when authManager and deepLinkHandler provided', () => {
    const ipcMain = createMockIpcMain();
    const logger = createMockLogger();
    const authManager = {} as never;
    const deepLinkHandler = {} as never;

    registerIpc(ipcMain, logger, { authManager, deepLinkHandler });

    expect(createAuthHandlers).toHaveBeenCalledWith(logger, expect.any(Object));
  });

  it('uses stub auth handlers when authManager not provided', () => {
    vi.mocked(createAuthHandlers).mockClear();
    const ipcMain = createMockIpcMain();
    const logger = createMockLogger();

    registerIpc(ipcMain, logger);

    expect(createAuthHandlers).not.toHaveBeenCalled();

    const handlerArg = vi.mocked(implement).mock.calls.at(-1)![2] as Record<
      string,
      Record<string, () => void>
    >;
    expect(() => handlerArg.auth.openBrowserAuth()).toThrow('Not configured');
  });
});
