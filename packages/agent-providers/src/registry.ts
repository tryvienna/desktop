/**
 * ProviderRegistry — Discover and instantiate AI providers
 *
 * Central registry that maps provider IDs to factory functions.
 * The SessionManager uses this to create provider instances for sessions.
 *
 * @module agent-providers/registry
 */

import type { AgentProvider, AvailabilityResult, ProviderInfo } from '@vienna/agent-core';
import { ClaudeCodeProvider } from './claude-code/provider';
import { CodexCliProvider } from './codex-cli/provider';
import { GeminiCliProvider } from './gemini-cli/provider';

export type ProviderFactory = () => AgentProvider;

export class ProviderRegistry {
  private factories = new Map<string, { factory: ProviderFactory; displayName: string }>();

  /** Register a provider factory */
  register(id: string, displayName: string, factory: ProviderFactory): void {
    this.factories.set(id, { factory, displayName });
  }

  /** Create a new provider instance by ID */
  create(id: string): AgentProvider {
    const entry = this.factories.get(id);
    if (!entry) {
      throw new Error(
        `Unknown provider: ${id}. Available: ${[...this.factories.keys()].join(', ')}`
      );
    }
    return entry.factory();
  }

  /** Check if a provider is registered */
  has(id: string): boolean {
    return this.factories.has(id);
  }

  /** List all registered providers with availability info */
  async listProviders(): Promise<ProviderInfo[]> {
    const results: ProviderInfo[] = [];

    for (const [id, { factory, displayName }] of this.factories) {
      try {
        const provider = factory();
        const availability = await provider.checkAvailability();
        results.push({
          id,
          displayName,
          available: availability.available,
          version: availability.version,
          error: availability.error,
        });
      } catch (error) {
        results.push({
          id,
          displayName,
          available: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return results;
  }

  /** Check availability of a specific provider */
  async checkProvider(id: string): Promise<AvailabilityResult> {
    const entry = this.factories.get(id);
    if (!entry) {
      return { available: false, error: `Unknown provider: ${id}` };
    }

    try {
      const provider = entry.factory();
      return await provider.checkAvailability();
    } catch (error) {
      return { available: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /** Get all registered provider IDs */
  getRegisteredIds(): string[] {
    return [...this.factories.keys()];
  }
}

/**
 * Create a registry pre-loaded with built-in providers.
 * Lazy-imports provider modules to avoid loading unused dependencies.
 */
export function createDefaultRegistry(): ProviderRegistry {
  const registry = new ProviderRegistry();

  registry.register('claude-code', 'Claude Code', () => new ClaudeCodeProvider());
  registry.register('codex-cli', 'Codex CLI', () => new CodexCliProvider());
  registry.register('gemini-cli', 'Gemini CLI', () => new GeminiCliProvider());

  return registry;
}
