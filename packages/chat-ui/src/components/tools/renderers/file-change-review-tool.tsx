/**
 * FileChangeReviewTool — Grouped tool renderer for Edit/Write operations
 *
 * @ai-context
 * - Registered in the tool registry for both Edit and Write tool names
 * - Uses the anchor pattern: each contiguous run of Edit/Write tools has an anchor
 *   (the first tool in the run). Text blocks between Edit/Write tools split runs.
 *   - Anchor → renders a FileChangeReviewPanel scoped to that group's changes
 *   - Non-anchor → renders null (that tool's change is already in a panel)
 * - Adapts the panel's BulkApprovalCallbacks to the ToolRendererProps callbacks
 *   (maps panel's onApprove → onApprove(requestId, 'once'), etc.)
 * - Non-file tools (Bash, Read, etc.) are unaffected — they use their own renderers
 *
 * @example
 * // Registered via register-defaults.ts:
 * defaultRegistry.register({ id: 'write', match: t => t.name === 'Write' || t.name === 'Edit',
 *   component: FileChangeReviewTool, priority: 100 });
 */

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { createRendererLogger } from '@vienna/logger/renderer';

import {
  useIsFileChangeAnchor,
  useFileChangeGroupToolIds,
} from '../../../context/file-change-review-context';
import { useOpenFile } from '../../../context/open-file-context';
import { useFileChanges } from '../../../hooks/use-file-changes';
import { FileChangeReviewPanel } from '../bulk-review/file-change-review-panel';
import type { ToolRendererProps } from '../registry';

const logger = createRendererLogger().child({ service: 'FileChangeReviewTool' });

export const FileChangeReviewTool = memo(function FileChangeReviewTool({
  toolUse,
  onApprove,
  onDeny,
  onRevoke,
  isFromHistory,
}: ToolRendererProps) {
  const isAnchor = useIsFileChangeAnchor(toolUse.id);
  const groupToolIds = useFileChangeGroupToolIds(toolUse.id);
  const { changes: allChanges } = useFileChanges();
  const onOpenInEditor = useOpenFile();
  const [collapsed, setCollapsed] = useState(false);

  // Filter changes to only those in this group
  const changes = useMemo(
    () => (groupToolIds ? allChanges.filter((c) => groupToolIds.has(c.toolId)) : []),
    [allChanges, groupToolIds]
  );

  const pendingCount = useMemo(
    () => changes.filter((c) => !c.status).length,
    [changes]
  );

  // Log render decisions
  const prevRenderRef = useRef<{ isAnchor: boolean; changeCount: number; pendingCount: number } | null>(null);
  useEffect(() => {
    const current = { isAnchor, changeCount: changes.length, pendingCount };
    const prev = prevRenderRef.current;
    if (
      !prev ||
      prev.isAnchor !== current.isAnchor ||
      prev.changeCount !== current.changeCount ||
      prev.pendingCount !== current.pendingCount
    ) {
      logger.debug('Render state', {
        toolId: toolUse.id,
        toolName: toolUse.name,
        isAnchor,
        groupToolIds: groupToolIds ? Array.from(groupToolIds) : null,
        changeCount: changes.length,
        pendingCount,
      });
      prevRenderRef.current = current;
    }
  }, [isAnchor, changes, pendingCount, toolUse.id, toolUse.name, groupToolIds]);

  // ── Callback adapters ─────────────────────────────────────────────────────
  // The panel uses simple (requestId) => void callbacks.
  // The desktop app expects (requestId, scope) => void.

  const handleApprove = useCallback(
    (requestId: string) => {
      logger.info('Approve', { requestId, scope: 'once' });
      onApprove?.(requestId, 'once');
    },
    [onApprove]
  );

  const handleApproveMultiple = useCallback(
    (requestIds: string[]) => {
      logger.info('Approve multiple', { requestIds, scope: 'once' });
      for (const id of requestIds) {
        onApprove?.(id, 'once');
      }
    },
    [onApprove]
  );

  const handleApproveAll = useCallback(() => {
    const pendingIds = changes.filter((c) => !c.status).map((c) => c.requestId);
    logger.info('Approve all', { pendingIds, scope: 'once' });
    for (const change of changes) {
      if (!change.status) {
        onApprove?.(change.requestId, 'once');
      }
    }
  }, [changes, onApprove]);

  const handleDeny = useCallback(
    (requestId: string) => {
      logger.info('Deny', { requestId });
      onDeny?.(requestId);
    },
    [onDeny]
  );

  const handleDenyMultiple = useCallback(
    (requestIds: string[]) => {
      logger.info('Deny multiple', { requestIds });
      for (const id of requestIds) {
        onDeny?.(id);
      }
    },
    [onDeny]
  );

  const handleDenyAll = useCallback(() => {
    const pendingIds = changes.filter((c) => !c.status).map((c) => c.requestId);
    logger.info('Deny all', { pendingIds });
    for (const change of changes) {
      if (!change.status) {
        onDeny?.(change.requestId);
      }
    }
  }, [changes, onDeny]);

  const handleAllowAllForSession = useCallback(() => {
    const pendingIds = changes.filter((c) => !c.status).map((c) => c.requestId);
    logger.info('Allow all for session', { pendingIds });
    for (const change of changes) {
      if (!change.status) {
        onApprove?.(change.requestId, 'session');
      }
    }
  }, [changes, onApprove]);

  const handleAllowAllPermanently = useCallback(() => {
    const pendingIds = changes.filter((c) => !c.status).map((c) => c.requestId);
    logger.info('Allow all permanently', { pendingIds });
    for (const change of changes) {
      if (!change.status) {
        onApprove?.(change.requestId, 'permanent');
      }
    }
  }, [changes, onApprove]);

  const handleRevokeRule = useCallback(
    (_toolName: string, _ruleType: 'session' | 'persistent') => {
      logger.info('Revoke rule', { toolName: _toolName, ruleType: _ruleType });
      onRevoke?.();
    },
    [onRevoke]
  );

  // Disable keyboard navigation when there are no pending changes
  const keyboardEnabled = pendingCount > 0;

  if (!isAnchor) return null;

  return (
    <FileChangeReviewPanel
      changes={changes}
      collapsed={collapsed}
      onCollapseChange={setCollapsed}
      keyboardEnabled={keyboardEnabled}
      isFromHistory={isFromHistory}
      onApprove={handleApprove}
      onApproveMultiple={handleApproveMultiple}
      onApproveAll={handleApproveAll}
      onDeny={handleDeny}
      onDenyMultiple={handleDenyMultiple}
      onDenyAll={handleDenyAll}
      onAllowAllForSession={handleAllowAllForSession}
      onAllowAllPermanently={handleAllowAllPermanently}
      onRevokeRule={handleRevokeRule}
      onOpenInEditor={onOpenInEditor ?? undefined}
    />
  );
});
