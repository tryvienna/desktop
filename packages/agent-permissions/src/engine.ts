/**
 * PermissionEngine — Unified rule evaluation for agent tool access
 *
 * Provider-agnostic permission engine that evaluates tool access requests
 * against a set of rules using specificity-based matching.
 *
 * The engine is pure and stateless with respect to persistence —
 * it operates on in-memory rule sets. The SessionManager is responsible
 * for loading rules from the DB and syncing new rules back.
 *
 * Evaluation order:
 * 1. Trusted tools bypass (always allowed, no rule check)
 * 2. Collect matching rules (tool name + directory + provider)
 * 3. Sort by specificity (higher = more specific = higher priority)
 * 4. First match wins
 * 5. No match → 'ask' (returned as { allowed: false, reason: 'no_match' })
 *
 * @module agent-permissions/engine
 */

import type {
  PermissionRule,
  PermissionCheckRequest,
  PermissionCheckResult,
  PermissionBehavior,
  PermissionScope,
} from '@vienna/agent-core';
import { extractPath, ruleMatches, computeSpecificity, isTrustedTool } from './rules';

export class PermissionEngine {
  private rules: PermissionRule[] = [];
  private trustedTools = new Set<string>();

  // ─────────────────────────────────────────────────────────────────────────
  // Core evaluation
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Evaluate a tool permission request against all rules.
   *
   * Returns:
   * - `{ allowed: true, reason: 'rule_match', matchedRule }` — auto-allow
   * - `{ allowed: false, reason: 'rule_match', matchedRule }` — auto-deny
   * - `{ allowed: false, reason: 'no_match', matchedRule: null }` — ask the user
   */
  check(request: PermissionCheckRequest): PermissionCheckResult {
    // Step 1: Trusted tools bypass
    if (isTrustedTool(this.trustedTools, request.toolName, request.input)) {
      return { allowed: true, matchedRule: null, reason: 'rule_match' };
    }

    // Step 2: Extract path for directory-scope matching
    const path = extractPath(request.toolName, request.input, request.cwd);

    // Step 3: Find all matching rules
    const matching = this.rules.filter((rule) => {
      // Scope check: session rules must match sessionId
      if (rule.scope === 'session' && rule.sessionId !== request.sessionId) {
        return false;
      }
      return ruleMatches(rule, request.toolName, path, request.providerId);
    });

    if (matching.length === 0) {
      return { allowed: false, matchedRule: null, reason: 'no_match' };
    }

    // Step 4: Sort by specificity (highest first)
    matching.sort((a, b) => computeSpecificity(b) - computeSpecificity(a));

    // Step 5: First match wins
    const winner = matching[0];
    return {
      allowed: winner.behavior === 'allow',
      matchedRule: winner,
      reason: 'rule_match',
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Rule management
  // ─────────────────────────────────────────────────────────────────────────

  /** Add a rule to the in-memory set */
  addRule(rule: PermissionRule): void {
    this.rules.push(rule);
  }

  /** Load rules in bulk (e.g., from DB on session start) */
  loadRules(rules: PermissionRule[]): void {
    this.rules = [...rules];
  }

  /** Convenience: allow a tool globally for a session */
  allowTool(toolName: string, scope: PermissionScope, sessionId: string | null): void {
    this.addRule({
      toolName,
      behavior: 'allow',
      scope,
      sessionId,
      directoryPattern: null,
      createdAt: Date.now(),
    });
  }

  /** Convenience: allow a tool in specific directories */
  allowToolInDirectories(
    toolName: string,
    directories: string[],
    scope: PermissionScope,
    sessionId: string | null
  ): void {
    for (const dir of directories) {
      this.addRule({
        toolName,
        behavior: 'allow',
        scope,
        sessionId,
        directoryPattern: dir,
        createdAt: Date.now(),
      });
    }
  }

  /** Convenience: deny a tool globally */
  denyTool(toolName: string, scope: PermissionScope, sessionId: string | null): void {
    this.addRule({
      toolName,
      behavior: 'deny',
      scope,
      sessionId,
      directoryPattern: null,
      createdAt: Date.now(),
    });
  }

  /** Remove all rules for a given session (cleanup) */
  clearSessionRules(sessionId: string): void {
    this.rules = this.rules.filter((r) => !(r.scope === 'session' && r.sessionId === sessionId));
  }

  /** Remove all rules */
  clearAllRules(): void {
    this.rules = [];
  }

  /** Get all current rules (for inspection / debugging) */
  getRules(): ReadonlyArray<PermissionRule> {
    return this.rules;
  }

  /** Remove rules matching criteria */
  removeRules(criteria: {
    toolName?: string;
    scope?: PermissionScope;
    behavior?: PermissionBehavior;
    sessionId?: string;
  }): number {
    const before = this.rules.length;
    this.rules = this.rules.filter((rule) => {
      if (criteria.toolName && rule.toolName !== criteria.toolName) return true;
      if (criteria.scope && rule.scope !== criteria.scope) return true;
      if (criteria.behavior && rule.behavior !== criteria.behavior) return true;
      if (criteria.sessionId && rule.sessionId !== criteria.sessionId) return true;
      return false; // All criteria match → remove
    });
    return before - this.rules.length;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Trusted tools
  // ─────────────────────────────────────────────────────────────────────────

  /** Add a trusted tool (bypasses all rule evaluation) */
  addTrustedTool(tool: string): void {
    this.trustedTools.add(tool);
  }

  /** Add multiple trusted tools */
  addTrustedTools(tools: string[]): void {
    for (const tool of tools) {
      this.trustedTools.add(tool);
    }
  }

  /** Remove a trusted tool */
  removeTrustedTool(tool: string): void {
    this.trustedTools.delete(tool);
  }

  /** Clear all trusted tools */
  clearTrustedTools(): void {
    this.trustedTools.clear();
  }

  /** Get all trusted tools (for inspection / debugging) */
  getTrustedTools(): ReadonlySet<string> {
    return this.trustedTools;
  }
}
