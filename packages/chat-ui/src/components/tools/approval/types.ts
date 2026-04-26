/**
 * Approval types — shared across approval components
 *
 * @ai-context
 * - ApprovalMethod union: manual, session_rule, persistent_rule, trusted_tool, auto_policy
 * - Used by TrustBadge, ChangeItem, and bulk-review types
 */

export type ApprovalMethod =
  | 'manual'
  | 'session_rule'
  | 'persistent_rule'
  | 'trusted_tool'
  | 'auto_policy';
