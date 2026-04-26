import { describe, it, expect } from 'vitest';
import {
  // Messages
  ContentBlockSchema,
  UserMessageSchema,
  MCPServerConfigSchema,
  // Provider
  ProviderStateSchema,
  SessionConfigSchema,
  PermissionResponseSchema,
  ProviderInfoSchema,
  // Permissions
  PermissionRuleSchema,
  PermissionCheckRequestSchema,
  PermissionCheckResultSchema,
  // Session
  SessionStatusSchema,
  SessionRecordSchema,
  EventRecordSchema,
} from '../index';

// ─────────────────────────────────────────────────────────────────────────────
// Messages
// ─────────────────────────────────────────────────────────────────────────────

describe('ContentBlockSchema', () => {
  it('parses text block', () => {
    const block = ContentBlockSchema.parse({ type: 'text', text: 'Hello' });
    expect(block.type).toBe('text');
  });

  it('parses image block', () => {
    const block = ContentBlockSchema.parse({
      type: 'image',
      mimeType: 'image/png',
      data: 'iVBORw0KGgo=',
    });
    expect(block.type).toBe('image');
  });

  it('rejects unknown block type', () => {
    expect(() => ContentBlockSchema.parse({ type: 'video', url: 'x' })).toThrow();
  });
});

describe('UserMessageSchema', () => {
  it('parses text-only message', () => {
    const msg = UserMessageSchema.parse({ text: 'Hello' });
    expect(msg.text).toBe('Hello');
    expect(msg.contentBlocks).toBeUndefined();
  });

  it('parses message with content blocks', () => {
    const msg = UserMessageSchema.parse({
      text: 'See this image',
      contentBlocks: [{ type: 'image', mimeType: 'image/png', data: 'abc' }],
    });
    expect(msg.contentBlocks).toHaveLength(1);
  });
});

describe('MCPServerConfigSchema', () => {
  it('parses minimal config', () => {
    const config = MCPServerConfigSchema.parse({ command: 'npx' });
    expect(config.command).toBe('npx');
    expect(config.args).toBeUndefined();
  });

  it('parses full config', () => {
    const config = MCPServerConfigSchema.parse({
      command: 'npx',
      args: ['-y', 'mcp-server'],
      env: { API_KEY: 'secret' },
    });
    expect(config.args).toEqual(['-y', 'mcp-server']);
    expect(config.env).toEqual({ API_KEY: 'secret' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────

describe('ProviderStateSchema', () => {
  it('accepts all valid states', () => {
    const states = ['idle', 'starting', 'running', 'stopping', 'stopped', 'crashed'];
    for (const state of states) {
      expect(ProviderStateSchema.parse(state)).toBe(state);
    }
  });

  it('rejects invalid state', () => {
    expect(() => ProviderStateSchema.parse('paused')).toThrow();
  });
});

describe('SessionConfigSchema', () => {
  it('parses minimal config', () => {
    const config = SessionConfigSchema.parse({
      cwd: '/home/user/project',
      directories: [],
    });
    expect(config.cwd).toBe('/home/user/project');
    expect(config.model).toBeUndefined();
  });

  it('parses full config', () => {
    const config = SessionConfigSchema.parse({
      sessionId: 'sess-1',
      model: 'claude-sonnet-4-20250514',
      cwd: '/tmp',
      directories: ['/tmp', '/home'],
      systemPrompt: 'You are a helpful assistant',
      appendSystemPrompt: 'Always be concise',
      mcpServers: {
        github: { command: 'npx', args: ['-y', 'mcp-github'] },
      },
      env: { CUSTOM_VAR: 'value' },
      timeout: 30000,
    });
    expect(config.sessionId).toBe('sess-1');
    expect(config.mcpServers?.github.command).toBe('npx');
  });
});

describe('PermissionResponseSchema', () => {
  it('parses allow response', () => {
    const resp = PermissionResponseSchema.parse({
      behavior: 'allow',
      scope: 'session',
    });
    expect(resp.behavior).toBe('allow');
  });

  it('parses deny response', () => {
    const resp = PermissionResponseSchema.parse({
      behavior: 'deny',
      scope: 'once',
    });
    expect(resp.behavior).toBe('deny');
  });

  it('parses response with optional fields', () => {
    const resp = PermissionResponseSchema.parse({
      behavior: 'allow',
      scope: 'permanent',
      directories: ['/tmp'],
      updatedInput: { command: 'ls -la /tmp' },
    });
    expect(resp.directories).toEqual(['/tmp']);
  });
});

describe('ProviderInfoSchema', () => {
  it('parses available provider', () => {
    const info = ProviderInfoSchema.parse({
      id: 'claude-code',
      displayName: 'Claude Code',
      available: true,
      version: '2.1.0',
    });
    expect(info.available).toBe(true);
  });

  it('parses unavailable provider', () => {
    const info = ProviderInfoSchema.parse({
      id: 'codex-cli',
      displayName: 'Codex CLI',
      available: false,
      error: 'CLI not found in PATH',
    });
    expect(info.available).toBe(false);
    expect(info.error).toBe('CLI not found in PATH');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Permissions
// ─────────────────────────────────────────────────────────────────────────────

describe('PermissionRuleSchema', () => {
  it('parses session-scoped rule', () => {
    const rule = PermissionRuleSchema.parse({
      toolName: 'Bash',
      behavior: 'allow',
      scope: 'session',
      sessionId: 'sess-1',
      createdAt: Date.now(),
    });
    expect(rule.scope).toBe('session');
    expect(rule.sessionId).toBe('sess-1');
  });

  it('parses persistent rule with directory pattern', () => {
    const rule = PermissionRuleSchema.parse({
      toolName: 'Write',
      behavior: 'allow',
      scope: 'persistent',
      sessionId: null,
      directoryPattern: '/home/user/project/**',
      createdAt: Date.now(),
    });
    expect(rule.scope).toBe('persistent');
    expect(rule.directoryPattern).toBe('/home/user/project/**');
  });
});

describe('PermissionCheckRequestSchema', () => {
  it('parses check request', () => {
    const req = PermissionCheckRequestSchema.parse({
      toolName: 'Bash',
      input: { command: 'rm -rf /tmp/test' },
      sessionId: 'sess-1',
      providerId: 'claude-code',
      cwd: '/home/user',
    });
    expect(req.toolName).toBe('Bash');
  });
});

describe('PermissionCheckResultSchema', () => {
  it('parses allowed result', () => {
    const result = PermissionCheckResultSchema.parse({
      allowed: true,
      matchedRule: {
        toolName: 'Bash',
        behavior: 'allow',
        scope: 'session',
        sessionId: 'sess-1',
        createdAt: Date.now(),
      },
      reason: 'rule_match',
    });
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe('rule_match');
  });

  it('parses denied result with no rule', () => {
    const result = PermissionCheckResultSchema.parse({
      allowed: false,
      matchedRule: null,
      reason: 'default_deny',
    });
    expect(result.allowed).toBe(false);
    expect(result.matchedRule).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Session
// ─────────────────────────────────────────────────────────────────────────────

describe('SessionStatusSchema', () => {
  it('accepts valid statuses', () => {
    expect(SessionStatusSchema.parse('active')).toBe('active');
    expect(SessionStatusSchema.parse('completed')).toBe('completed');
    expect(SessionStatusSchema.parse('crashed')).toBe('crashed');
  });
});

describe('SessionRecordSchema', () => {
  it('parses complete session record', () => {
    const now = Date.now();
    const record = SessionRecordSchema.parse({
      id: 'sess-1',
      providerId: 'claude-code',
      model: 'claude-sonnet-4-20250514',
      cwd: '/tmp',
      providerSessionId: 'claude-sess-abc',
      workstreamId: null,
      status: 'active',
      createdAt: now,
      lastActivityAt: now,
      totalInputTokens: 5000,
      totalOutputTokens: 2000,
      totalCostCents: 15,
    });
    expect(record.id).toBe('sess-1');
    expect(record.status).toBe('active');
  });

  it('accepts null for nullable fields', () => {
    const now = Date.now();
    const record = SessionRecordSchema.parse({
      id: 'sess-2',
      providerId: 'codex-cli',
      model: null,
      cwd: '/home',
      providerSessionId: null,
      workstreamId: null,
      status: 'completed',
      createdAt: now,
      lastActivityAt: now,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCostCents: 0,
    });
    expect(record.model).toBeNull();
    expect(record.providerSessionId).toBeNull();
  });
});

describe('EventRecordSchema', () => {
  it('parses event record', () => {
    const record = EventRecordSchema.parse({
      id: 1,
      sessionId: 'sess-1',
      eventType: 'text_delta',
      payload: JSON.stringify({ type: 'text_delta', messageId: 'm1', text: 'hi' }),
      createdAt: Date.now(),
    });
    expect(record.eventType).toBe('text_delta');
    // Payload is stored as string, parsed separately
    expect(typeof record.payload).toBe('string');
  });
});
