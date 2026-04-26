/**
 * GeminiCliProvider — Gemini CLI subprocess manager
 *
 * Extends CliProviderBase with Gemini-specific argument building
 * and message formatting.
 *
 * @module agent-providers/gemini-cli/provider
 */

import type {
  SessionConfig,
  UserMessage,
  PermissionResponse,
} from '@vienna/agent-core';
import { CliProviderBase } from '../cli-provider-base';
import { GeminiCliNormalizer } from './normalizer';

const DEFAULT_CLI_PATH = 'gemini';

export interface GeminiCliProviderOptions {
  cliPath?: string;
}

export class GeminiCliProvider extends CliProviderBase {
  readonly id = 'gemini-cli';
  readonly displayName = 'Gemini CLI';

  constructor(options?: GeminiCliProviderOptions) {
    super(
      options?.cliPath ?? DEFAULT_CLI_PATH,
      new GeminiCliNormalizer(),
    );
  }

  sendMessage(message: UserMessage): void {
    this.ensureRunning();
    this.writeToStdin({ type: 'user_message', content: message.text });
  }

  respondPermission(requestId: string, response: PermissionResponse): void {
    this.ensureRunning();
    this.writeToStdin({
      type: 'permission_response',
      id: requestId,
      allow: response.behavior === 'allow',
    });
  }

  protected buildArgs(config: SessionConfig): string[] {
    const args = ['--output-format', 'json'];
    if (config.model) args.push('--model', config.model);
    return args;
  }
}
