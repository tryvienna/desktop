/**
 * ClaudeCodeProvider — Claude Code CLI subprocess manager
 *
 * Extends CliProviderBase with Claude-specific argument building,
 * message formatting, and permission response handling.
 *
 * @module agent-providers/claude-code/provider
 */

import { spawn } from 'node:child_process';
import type {
  AgentEvent,
  SessionConfig,
  UserMessage,
  PermissionResponse,
} from '@vienna/agent-core';
import { getEnrichedEnv } from '@vienna/shell-env';
import { CliProviderBase } from '../cli-provider-base';
import { ClaudeCodeNormalizer } from './normalizer';

const DEFAULT_CLI_PATH = 'claude';

export interface ClaudeCodeProviderOptions {
  /** Path to the claude CLI binary. Defaults to 'claude' (found via PATH). */
  cliPath?: string;
  /** Enable streaming via --include-partial-messages. Default: true */
  includePartialMessages?: boolean;
}

export class ClaudeCodeProvider extends CliProviderBase {
  readonly id = 'claude-code';
  readonly displayName = 'Claude Code';

  private includePartialMessages: boolean;
  /** Original tool inputs from control_requests, keyed by requestId. Echoed back as updatedInput. */
  private pendingPermissionInputs = new Map<string, Record<string, unknown>>();

  constructor(options?: ClaudeCodeProviderOptions) {
    super(
      options?.cliPath ?? DEFAULT_CLI_PATH,
      new ClaudeCodeNormalizer(),
    );
    this.includePartialMessages = options?.includePartialMessages ?? true;
  }

  protected override onStartReset(): void {
    this.pendingPermissionInputs.clear();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Messaging
  // ─────────────────────────────────────────────────────────────────────────

  sendMessage(message: UserMessage): void {
    this.ensureRunning();

    // Build content in the Anthropic API format expected by Claude Code CLI.
    let content: string | Array<Record<string, unknown>> = message.text;
    if (message.contentBlocks?.length) {
      const parts: Array<Record<string, unknown>> = [];
      if (message.text.trim()) {
        parts.push({ type: 'text', text: message.text });
      }
      for (const block of message.contentBlocks) {
        if (block.type === 'image') {
          parts.push({
            type: 'image',
            source: {
              type: 'base64',
              media_type: block.mimeType,
              data: block.data,
            },
          });
        }
      }
      if (parts.length > 0) {
        content = parts;
      }
    }

    this.writeToStdin({
      type: 'user' as const,
      message: {
        id: `msg_${Date.now()}`,
        role: 'user' as const,
        content,
      },
    });
  }

  respondPermission(requestId: string, response: PermissionResponse): void {
    this.ensureRunning();

    if (response.behavior === 'allow') {
      const originalInput = this.pendingPermissionInputs.get(requestId) ?? {};
      this.pendingPermissionInputs.delete(requestId);
      this.writeToStdin({
        type: 'control_response' as const,
        request_id: requestId,
        response: {
          subtype: 'success' as const,
          request_id: requestId,
          response: {
            behavior: 'allow' as const,
            updatedInput: response.updatedInput ?? originalInput,
          },
        },
      });
    } else {
      this.pendingPermissionInputs.delete(requestId);
      this.writeToStdin({
        type: 'control_response' as const,
        request_id: requestId,
        response: {
          subtype: 'success' as const,
          request_id: requestId,
          response: {
            behavior: 'deny' as const,
            message: response.message || 'Permission denied by user',
          },
        },
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Internal
  // ─────────────────────────────────────────────────────────────────────────

  protected override onEvent_internal(event: AgentEvent): void {
    // Capture original tool input from permission requests so we can echo it back
    if (event.type === 'tool_permission_needed') {
      this.pendingPermissionInputs.set(event.requestId, event.input);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // File rewind (static — no running instance needed)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Rewind files on disk to a checkpoint using the Claude CLI.
   *
   * Spawns a one-shot `claude --print --resume <sid> --rewind-files <uuid>`
   * process. Resolves when the process exits successfully, rejects on error.
   */
  static async rewindFiles(options: {
    cliPath?: string;
    providerSessionId: string;
    checkpointId: string;
    cwd: string;
    env?: Record<string, string>;
  }): Promise<void> {
    const cliPath = options.cliPath ?? DEFAULT_CLI_PATH;
    const args = [
      '--print',
      '--resume', options.providerSessionId,
      '--rewind-files', options.checkpointId,
    ];

    const env = getEnrichedEnv({
      ...options.env,
      CLAUDE_CODE_ENABLE_SDK_FILE_CHECKPOINTING: '1',
    });

    return new Promise<void>((resolve, reject) => {
      const proc = spawn(cliPath, args, {
        cwd: options.cwd,
        stdio: ['ignore', 'pipe', 'pipe'],
        env,
      });

      let stderr = '';
      proc.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString().slice(0, 4096);
      });

      proc.on('error', (err) => {
        reject(new Error(`Failed to spawn claude for file rewind: ${err.message}`));
      });

      proc.on('exit', (code) => {
        if (code === 0 || code === null) {
          resolve();
        } else {
          reject(new Error(`File rewind failed (exit code ${code}): ${stderr.trim()}`));
        }
      });
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CLI arguments
  // ─────────────────────────────────────────────────────────────────────────

  protected buildArgs(config: SessionConfig): string[] {
    const args = [
      '--print',
      '--verbose',
      '--output-format=stream-json',
      '--input-format=stream-json',
      '--permission-prompt-tool',
      'stdio',
      '--replay-user-messages',
    ];

    if (this.includePartialMessages) {
      args.push('--include-partial-messages');
    }

    if (config.model) {
      args.push('--model', config.model);
    }

    if (config.sessionId) {
      args.push('--resume', config.sessionId);
    }

    // Directories: first is --cwd, rest are --add-dir
    if (config.directories.length > 0) {
      for (const dir of config.directories) {
        if (dir !== config.cwd) {
          args.push('--add-dir', dir);
        }
      }
    }

    if (config.systemPrompt) {
      args.push('--system-prompt', config.systemPrompt);
    }

    if (config.appendSystemPrompt) {
      args.push('--append-system-prompt', config.appendSystemPrompt);
    }

    if (config.mcpServers && Object.keys(config.mcpServers).length > 0) {
      args.push('--mcp-config', JSON.stringify({ mcpServers: config.mcpServers }));
    }

    return args;
  }
}
