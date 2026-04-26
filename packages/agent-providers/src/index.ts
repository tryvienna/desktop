/**
 * @module agent-providers
 *
 * AI provider implementations for Vienna.
 * Includes Claude Code, Codex CLI, and Gemini CLI.
 */

// Shared CLI provider base
export { CliProviderBase, isSignalExit, classifyExit, splitLines } from './cli-provider-base';
export type { CliNormalizer } from './cli-provider-base';

// Registry
export { ProviderRegistry, createDefaultRegistry } from './registry';
export type { ProviderFactory } from './registry';

// Claude Code provider
export { ClaudeCodeProvider } from './claude-code/provider';
export type { ClaudeCodeProviderOptions } from './claude-code/provider';
export { ClaudeCodeNormalizer } from './claude-code/normalizer';
export { getEnrichedPath, getEnrichedEnv, ShellEnvError } from '@vienna/shell-env';
export { discoverClaudeConfig, listClaudeConfigDirectory, isAllowedClaudePath } from './claude-code/config-discovery';
export type { ClaudeConfigFile, ClaudeConfigScope, ClaudeConfigCategory, ClaudeConfigDiscoveryResult } from './claude-code/config-discovery';
export type {
  InboundMessage,
  AssistantMessage,
  StreamEventMessage,
  ControlRequestMessage,
  RateLimitEvent,
  SuccessResult,
  ErrorResult,
} from './claude-code/schema';
export {
  InboundMessageSchema,
  OutboundUserMessageSchema,
  OutboundControlResponseSchema,
} from './claude-code/schema';

// Codex CLI provider
export { CodexCliProvider } from './codex-cli/provider';
export type { CodexCliProviderOptions } from './codex-cli/provider';
export { CodexCliNormalizer } from './codex-cli/normalizer';
export { CodexInboundMessageSchema } from './codex-cli/schema';
export type { CodexInboundMessage } from './codex-cli/schema';

// Gemini CLI provider
export { GeminiCliProvider } from './gemini-cli/provider';
export type { GeminiCliProviderOptions } from './gemini-cli/provider';
export { GeminiCliNormalizer } from './gemini-cli/normalizer';
export { GeminiInboundMessageSchema } from './gemini-cli/schema';
export type { GeminiInboundMessage } from './gemini-cli/schema';
