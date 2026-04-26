/**
 * @module agent-permissions
 *
 * Unified permission engine for AI agent tool access control.
 * Provider-agnostic: same rules apply regardless of which agent provider is running.
 */

// Engine
export { PermissionEngine } from './engine';

// Rule matching utilities (for testing / advanced use)
export {
  extractPath,
  matchesDirectory,
  computeSpecificity,
  ruleMatches,
  isTrustedTool,
} from './rules';
