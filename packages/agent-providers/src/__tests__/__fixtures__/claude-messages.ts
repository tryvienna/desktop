/**
 * NDJSON fixture data representing Claude CLI protocol messages.
 * Each export is a raw object that would be JSON.stringify'd into an NDJSON line.
 */

// ─────────────────────────────────────────────────────────────────────────────
// System Messages
// ─────────────────────────────────────────────────────────────────────────────

export const systemInit = {
  type: 'system',
  subtype: 'init',
  uuid: 'uuid-001',
  session_id: 'session-abc-123',
  cwd: '/home/user/project',
  tools: ['Read', 'Write', 'Bash', 'Glob', 'Grep'],
  mcp_servers: [],
  model: 'claude-sonnet-4-20250514',
  permissionMode: 'default',
  apiKeySource: 'env',
};

export const systemCompactBoundary = {
  type: 'system',
  subtype: 'compact_boundary',
  uuid: 'uuid-002',
  session_id: 'session-abc-123',
  compact_metadata: {
    trigger: 'auto' as const,
    pre_tokens: 50000,
  },
};

export const systemModelChange = {
  type: 'system',
  subtype: 'model_change',
  uuid: 'uuid-003',
  session_id: 'session-abc-123',
  from_model: 'claude-sonnet-4-20250514',
  to_model: 'claude-opus-4-20250514',
};

export const systemEntityLink = {
  type: 'system',
  subtype: 'entity_link',
  uuid: 'uuid-004',
  session_id: 'session-abc-123',
  action: 'linked' as const,
  entity_uri: '@vienna//github_pr/owner/repo/42',
  entity_type: 'github_pr',
  entity_title: 'Fix login bug',
};

export const systemSkillActivation = {
  type: 'system',
  subtype: 'skill_activation',
  uuid: 'uuid-005',
  session_id: 'session-abc-123',
  skills: [
    { id: 'commit', name: 'Git Commit', trigger: '/commit' },
    { id: 'review', name: 'PR Review' },
  ],
};

export const systemInterrupted = {
  type: 'system',
  subtype: 'interrupted',
  uuid: 'uuid-006',
  session_id: 'session-abc-123',
  timestamp: 1700000000000,
};

export const systemTaskNotification = {
  type: 'system',
  subtype: 'task_notification',
  task_id: 'task-001',
  status: 'completed' as const,
  summary: 'Background task finished successfully',
  session_id: 'session-abc-123',
  uuid: 'uuid-007',
};

export const systemTaskNotificationStopped = {
  type: 'system',
  subtype: 'task_notification',
  task_id: 'task-002',
  status: 'stopped' as const,
  summary: 'Find Tailwind/CSS config setup',
  output_file: '',
  tool_use_id: 'toolu_01PKDjCA4CApLG3TPRsHh9X7',
  usage: { total_tokens: 17108, tool_uses: 15, duration_ms: 230756 },
  session_id: 'session-abc-123',
  uuid: 'uuid-007b',
};

export const systemStatus = {
  type: 'system',
  subtype: 'status',
  uuid: 'uuid-008',
  session_id: 'session-abc-123',
  status: 'Thinking...',
};

// Subagent task lifecycle events — these are suppressed by the normalizer
// to prevent timeline spam. See normalizer.ts for the full explanation.

export const systemTaskStarted = {
  type: 'system',
  subtype: 'task_started',
  task_id: 'a389c514f40faa116',
  description: 'Calculate 1+1',
  task_type: 'local_agent',
  session_id: 'session-abc-123',
  uuid: 'uuid-009',
};

export const systemTaskProgress = {
  type: 'system',
  subtype: 'task_progress',
  task_id: 'a389c514f40faa116',
  description: 'Running calculation',
  usage: { total_tokens: 5000, tool_uses: 2, duration_ms: 1200 },
  last_tool_name: 'Bash',
  session_id: 'session-abc-123',
  uuid: 'uuid-010',
};

// Hook lifecycle events — suppressed by the normalizer (internal plumbing).

export const systemHookStarted = {
  type: 'system',
  subtype: 'hook_started',
  hook_id: 'hook-abc-001',
  hook_name: 'SessionStart:startup',
  hook_event: 'SessionStart',
  session_id: 'session-abc-123',
  uuid: 'uuid-011',
};

export const systemHookResponse = {
  type: 'system',
  subtype: 'hook_response',
  hook_id: 'hook-abc-001',
  hook_name: 'SessionStart:resume',
  hook_event: 'SessionStart',
  output: '',
  stdout: '',
  stderr: '',
  exit_code: 0,
  outcome: 'success',
  session_id: 'session-abc-123',
  uuid: 'uuid-012',
};

// Hook with extra unknown fields — validates .passthrough() works
export const systemHookStartedWithExtraFields = {
  type: 'system',
  subtype: 'hook_started',
  hook_id: 'hook-xyz-999',
  hook_name: 'Stop:cleanup',
  hook_event: 'Stop',
  session_id: 'session-abc-123',
  uuid: 'uuid-013',
  some_future_field: 42,
  another_field: { nested: true },
};

export const systemHookResponseWithExtraFields = {
  type: 'system',
  subtype: 'hook_response',
  hook_id: 'hook-xyz-999',
  hook_name: 'Stop:cleanup',
  hook_event: 'Stop',
  output: 'done',
  stdout: 'ok',
  stderr: '',
  exit_code: 0,
  outcome: 'success',
  session_id: 'session-abc-123',
  uuid: 'uuid-014',
  duration_ms: 150,
  retries: 0,
};

// ─────────────────────────────────────────────────────────────────────────────
// Assistant Messages (non-streaming)
// ─────────────────────────────────────────────────────────────────────────────

export const assistantTextOnly = {
  type: 'assistant',
  uuid: 'uuid-100',
  session_id: 'session-abc-123',
  message: {
    model: 'claude-sonnet-4-20250514',
    id: 'msg_01ABC',
    type: 'message' as const,
    role: 'assistant' as const,
    content: [{ type: 'text' as const, text: 'Hello! How can I help you today?' }],
    stop_reason: 'end_turn',
    stop_sequence: null,
    usage: {
      input_tokens: 100,
      output_tokens: 15,
      cache_read_input_tokens: 50,
      cache_creation_input_tokens: 10,
    },
  },
};

export const assistantWithToolUse = {
  type: 'assistant',
  uuid: 'uuid-101',
  session_id: 'session-abc-123',
  message: {
    model: 'claude-sonnet-4-20250514',
    id: 'msg_02DEF',
    type: 'message' as const,
    role: 'assistant' as const,
    content: [
      { type: 'text' as const, text: 'Let me read that file.' },
      {
        type: 'tool_use' as const,
        id: 'tool_01',
        name: 'Read',
        input: { file_path: '/src/index.ts' },
      },
    ],
    stop_reason: 'tool_use',
    stop_sequence: null,
    usage: {
      input_tokens: 200,
      output_tokens: 40,
    },
  },
};

export const assistantWithThinking = {
  type: 'assistant',
  uuid: 'uuid-102',
  session_id: 'session-abc-123',
  message: {
    model: 'claude-sonnet-4-20250514',
    id: 'msg_03GHI',
    type: 'message' as const,
    role: 'assistant' as const,
    content: [
      {
        type: 'thinking' as const,
        thinking: 'I need to analyze this carefully...',
        signature: 'sig123',
      },
      { type: 'text' as const, text: 'After analysis, here is my answer.' },
    ],
    stop_reason: 'end_turn',
    stop_sequence: null,
    usage: {
      input_tokens: 300,
      output_tokens: 80,
    },
  },
};

export const assistantSubAgent = {
  type: 'assistant',
  uuid: 'uuid-103',
  session_id: 'session-abc-123',
  parent_tool_use_id: 'tool_parent_01',
  message: {
    model: 'claude-sonnet-4-20250514',
    id: 'msg_04JKL',
    type: 'message' as const,
    role: 'assistant' as const,
    content: [{ type: 'text' as const, text: 'Sub-agent response' }],
    stop_reason: 'end_turn',
    stop_sequence: null,
    usage: {
      input_tokens: 50,
      output_tokens: 10,
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// User Messages (tool results echoed back)
// ─────────────────────────────────────────────────────────────────────────────

export const userToolResult = {
  type: 'user',
  uuid: 'uuid-200',
  session_id: 'session-abc-123',
  message: {
    id: 'msg_user_01',
    role: 'user' as const,
    content: [
      {
        type: 'tool_result' as const,
        tool_use_id: 'tool_01',
        content: 'File contents: export default {}',
        is_error: false,
      },
    ],
  },
};

export const userToolResultError = {
  type: 'user',
  uuid: 'uuid-201',
  session_id: 'session-abc-123',
  message: {
    id: 'msg_user_02',
    role: 'user' as const,
    content: [
      {
        type: 'tool_result' as const,
        tool_use_id: 'tool_01',
        content: 'File not found: /src/missing.ts',
        is_error: true,
      },
    ],
  },
};

export const userToolResultArray = {
  type: 'user',
  uuid: 'uuid-202',
  session_id: 'session-abc-123',
  message: {
    id: 'msg_user_03',
    role: 'user' as const,
    content: [
      {
        type: 'tool_result' as const,
        tool_use_id: 'tool_01',
        content: [
          { type: 'text' as const, text: 'line 1' },
          { type: 'text' as const, text: 'line 2' },
        ],
      },
    ],
  },
};

export const userToolResultWithToolReference = {
  type: 'user',
  uuid: 'uuid-203',
  session_id: 'session-abc-123',
  message: {
    id: 'msg_user_04',
    role: 'user' as const,
    content: [
      {
        type: 'tool_result' as const,
        tool_use_id: 'tool_01',
        content: [{ type: 'tool_reference' as const, tool_name: 'AskUserQuestion' }],
      },
    ],
  },
};

export const userToolResultWithImage = {
  type: 'user',
  uuid: 'uuid-204',
  session_id: 'session-abc-123',
  message: {
    id: 'msg_user_05',
    role: 'user' as const,
    content: [
      {
        type: 'tool_result' as const,
        tool_use_id: 'tool_01',
        content: [
          { type: 'text' as const, text: 'Screenshot captured' },
          {
            type: 'image' as const,
            source: {
              type: 'base64' as const,
              media_type: 'image/png',
              data: 'iVBORw0KGgoAAAANSUhEUg==',
            },
          },
        ],
      },
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Stream Events
// ─────────────────────────────────────────────────────────────────────────────

export const streamMessageStart = {
  type: 'stream_event',
  uuid: 'uuid-300',
  session_id: 'session-abc-123',
  event: {
    type: 'message_start' as const,
    message: {
      model: 'claude-sonnet-4-20250514',
      id: 'msg_stream_01',
      type: 'message' as const,
      role: 'assistant' as const,
      content: [],
      stop_reason: null,
      stop_sequence: null,
      usage: {
        input_tokens: 150,
        output_tokens: 0,
        cache_read_input_tokens: 75,
      },
    },
  },
};

export const streamContentBlockStartText = {
  type: 'stream_event',
  uuid: 'uuid-301',
  session_id: 'session-abc-123',
  event: {
    type: 'content_block_start' as const,
    index: 0,
    content_block: { type: 'text' as const, text: '' },
  },
};

export const streamContentBlockStartTool = {
  type: 'stream_event',
  uuid: 'uuid-302',
  session_id: 'session-abc-123',
  event: {
    type: 'content_block_start' as const,
    index: 1,
    content_block: {
      type: 'tool_use' as const,
      id: 'tool_stream_01',
      name: 'Bash',
      input: {},
    },
  },
};

export const streamTextDelta = {
  type: 'stream_event',
  uuid: 'uuid-303',
  session_id: 'session-abc-123',
  event: {
    type: 'content_block_delta' as const,
    index: 0,
    delta: { type: 'text_delta' as const, text: 'Hello ' },
  },
};

export const streamTextDelta2 = {
  type: 'stream_event',
  uuid: 'uuid-304',
  session_id: 'session-abc-123',
  event: {
    type: 'content_block_delta' as const,
    index: 0,
    delta: { type: 'text_delta' as const, text: 'world!' },
  },
};

export const streamInputJsonDelta = {
  type: 'stream_event',
  uuid: 'uuid-305',
  session_id: 'session-abc-123',
  event: {
    type: 'content_block_delta' as const,
    index: 1,
    delta: { type: 'input_json_delta' as const, partial_json: '{"command": "ls' },
  },
};

export const streamContentBlockStop = {
  type: 'stream_event',
  uuid: 'uuid-306',
  session_id: 'session-abc-123',
  event: {
    type: 'content_block_stop' as const,
    index: 0,
  },
};

export const streamMessageDelta = {
  type: 'stream_event',
  uuid: 'uuid-307',
  session_id: 'session-abc-123',
  event: {
    type: 'message_delta' as const,
    delta: { stop_reason: 'end_turn', stop_sequence: null },
    usage: { output_tokens: 25 },
  },
};

export const streamMessageStop = {
  type: 'stream_event',
  uuid: 'uuid-308',
  session_id: 'session-abc-123',
  event: {
    type: 'message_stop' as const,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Control Request (Permission)
// ─────────────────────────────────────────────────────────────────────────────

export const controlRequest = {
  type: 'control_request',
  request_id: 'req-001',
  request: {
    subtype: 'can_use_tool' as const,
    tool_name: 'Bash',
    input: { command: 'rm -rf /tmp/test' },
    tool_use_id: 'tool_perm_01',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Rate Limit
// ─────────────────────────────────────────────────────────────────────────────

export const rateLimit = {
  type: 'rate_limit_event',
  rate_limit_info: {
    status: 'rate_limited',
    resetsAt: 1700000060000,
    rateLimitType: 'tokens_per_minute',
  },
  uuid: 'uuid-400',
  session_id: 'session-abc-123',
};

// ─────────────────────────────────────────────────────────────────────────────
// Results
// ─────────────────────────────────────────────────────────────────────────────

export const successResult = {
  type: 'result',
  subtype: 'success',
  uuid: 'uuid-500',
  session_id: 'session-abc-123',
  is_error: false,
  duration_ms: 5000,
  duration_api_ms: 4500,
  num_turns: 3,
  result: 'Task completed successfully',
  total_cost_usd: 0.05,
  usage: {
    input_tokens: 1000,
    output_tokens: 500,
    cache_read_input_tokens: 200,
    cache_creation_input_tokens: 100,
  },
  modelUsage: {
    'claude-sonnet-4-20250514': {
      inputTokens: 1000,
      outputTokens: 500,
      cacheReadInputTokens: 200,
      cacheCreationInputTokens: 100,
      webSearchRequests: 0,
      costUSD: 0.05,
      contextWindow: 200000,
    },
  },
};

export const successResultWithError = {
  ...successResult,
  uuid: 'uuid-501',
  is_error: true,
  result: 'Something went wrong during execution',
};

export const errorResult = {
  type: 'result',
  subtype: 'error_max_turns',
  uuid: 'uuid-502',
  session_id: 'session-abc-123',
  is_error: true,
  duration_ms: 10000,
  duration_api_ms: 9000,
  num_turns: 10,
  total_cost_usd: 0.15,
  usage: {
    input_tokens: 5000,
    output_tokens: 2000,
    cache_read_input_tokens: 1000,
    cache_creation_input_tokens: 500,
  },
  modelUsage: {
    'claude-sonnet-4-20250514': {
      inputTokens: 5000,
      outputTokens: 2000,
      cacheReadInputTokens: 1000,
      cacheCreationInputTokens: 500,
      webSearchRequests: 0,
      costUSD: 0.15,
      contextWindow: 200000,
    },
  },
  errors: ['Maximum turns exceeded', 'Agent stopped'],
};

// ─────────────────────────────────────────────────────────────────────────────
// Keep Alive
// ─────────────────────────────────────────────────────────────────────────────

export const keepAlive = {
  type: 'keep_alive',
  uuid: 'uuid-600',
  session_id: 'session-abc-123',
};
