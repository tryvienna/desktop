/**
 * CodexCliProvider — Codex CLI subprocess manager
 *
 * Extends CliProviderBase with Codex-specific argument building
 * and message formatting.
 *
 * @module agent-providers/codex-cli/provider
 */

import type {
  SessionConfig,
  UserMessage,
  PermissionResponse,
} from '@vienna/agent-core';
import { CliProviderBase } from '../cli-provider-base';
import { CodexCliNormalizer } from './normalizer';

const DEFAULT_CLI_PATH = 'codex';

export interface CodexCliProviderOptions {
  cliPath?: string;
}

export class CodexCliProvider extends CliProviderBase {
  readonly id = 'codex-cli';
  readonly displayName = 'Codex CLI';

  constructor(options?: CodexCliProviderOptions) {
    super(
      options?.cliPath ?? DEFAULT_CLI_PATH,
      new CodexCliNormalizer(),
    );
  }

  sendMessage(message: UserMessage): void {
    this.ensureRunning();
    this.writeToStdin({ type: 'user', content: message.text });
  }

  respondPermission(requestId: string, response: PermissionResponse): void {
    this.ensureRunning();
    this.writeToStdin({
      type: 'permission_response',
      request_id: requestId,
      allow: response.behavior === 'allow',
    });
  }

  protected buildArgs(config: SessionConfig): string[] {
    const args = ['--output-format', 'json'];
    if (config.model) args.push('--model', config.model);
    return args;
  }
}
