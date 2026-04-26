/**
 * ExitPlanModeTool — Renders plan for user review with permissions and remote info
 *
 * @ai-context
 * - StreamingContent for markdown plan display
 * - Collapsible permissions section with Bash prompts
 * - Remote session info display
 * - Shows content while pending permission
 * - data-slot="exit-plan-mode-tool-content"
 */

import { ToolOutput } from '../tool-output';
import { StreamingContent } from '../streaming-content';
import type { ToolRendererProps } from '../registry';

// ─── Icons ────────────────────────────────────────────────────────────────────

function ClipboardCheckIcon() {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      <path d="M9 14l2 2 4-4" />
    </svg>
  );
}

function ExpandIcon() {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 3h6v6" />
      <path d="M9 21H3v-6" />
      <path d="M21 3l-7 7" />
      <path d="M3 21l7-7" />
    </svg>
  );
}

function TerminalIcon() {
  return (
    <svg
      width={12}
      height={12}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPlanDescription(plan: string): string {
  if (!plan) return 'No plan content';
  const lines = plan.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    const cleaned = trimmed.replace(/^#+\s*/, '');
    if (cleaned.length === 0) continue;
    return cleaned.length > 60 ? cleaned.slice(0, 57) + '...' : cleaned;
  }
  return 'Plan ready for review';
}

// ─── Component ────────────────────────────────────────────────────────────────

interface AllowedPrompt {
  tool: 'Bash';
  prompt: string;
}

export function ExitPlanModeTool({ toolUse, onApprove, onDeny, onRevoke, onOpenPlanReview, isFromHistory }: ToolRendererProps) {
  const input = toolUse.input || {};
  const plan = (typeof input.plan === 'string' ? input.plan : null) || toolUse.result?.output || '';
  const allowedPrompts = Array.isArray(input.allowedPrompts) ? (input.allowedPrompts as AllowedPrompt[]) : undefined;
  const pushToRemote = input.pushToRemote === true;
  const remoteSessionId = typeof input.remoteSessionId === 'string' ? input.remoteSessionId : undefined;
  const remoteSessionTitle = typeof input.remoteSessionTitle === 'string' ? input.remoteSessionTitle : undefined;
  const remoteSessionUrl = typeof input.remoteSessionUrl === 'string' ? input.remoteSessionUrl : undefined;
  const isStreaming = toolUse.isStreaming ?? false;

  const description = getPlanDescription(plan);
  const hasPermissions = allowedPrompts && allowedPrompts.length > 0;
  const hasRemoteInfo = pushToRemote || remoteSessionId || remoteSessionUrl;

  const canReview = onOpenPlanReview && toolUse.requestId && toolUse.status === 'pending_permission';
  const reviewAction = canReview ? (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onOpenPlanReview(toolUse.id, toolUse.requestId!);
      }}
      title="Review plan in drawer"
      className="flex items-center justify-center w-6 h-6 rounded text-muted-foreground hover:text-foreground-secondary hover:bg-surface-hover transition-colors"
    >
      <ExpandIcon />
    </button>
  ) : null;

  return (
    <ToolOutput
      id={toolUse.id}
      toolName="Plan"
      description={description}
      status={toolUse.status}
      images={toolUse.result?.images}
      isFromHistory={isFromHistory}
      icon={
        <span className="flex-shrink-0 text-muted-foreground">
          <ClipboardCheckIcon />
        </span>
      }
      actions={reviewAction}
      error={toolUse.result?.error}
      requestId={toolUse.requestId}
      approvalMethod={toolUse.approvalMethod}
      onApprove={onApprove}
      onDeny={onDeny}
      onRevoke={onRevoke}
      defaultCollapsed={false}
      showContentWhilePendingPermission
    >
      <div data-slot="exit-plan-mode-tool-content" className="relative">
        {/* Plan content */}
        {plan || isStreaming ? (
          <div className="max-h-[500px] overflow-auto bg-surface-sunken p-3">
            <StreamingContent
              content={plan}
              isStreaming={isStreaming}
              className="text-foreground"
            />
          </div>
        ) : (
          <div className="p-3 text-xs text-muted-foreground text-center">No plan content</div>
        )}

        {/* Permissions section */}
        {hasPermissions && (
          <details className="border-t border-border-muted">
            <summary className="px-3 py-2 text-xs text-muted-foreground cursor-pointer hover:text-foreground-secondary select-none">
              Permissions Requested ({allowedPrompts!.length})
            </summary>
            <div className="px-3 pb-3 space-y-2">
              {allowedPrompts!.map((prompt, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 px-3 py-2 rounded bg-surface-sunken text-xs text-foreground-secondary"
                >
                  <span className="text-muted-foreground flex-shrink-0">
                    <TerminalIcon />
                  </span>
                  <span className="truncate">{prompt.prompt}</span>
                </div>
              ))}
            </div>
          </details>
        )}

        {/* Remote session info */}
        {hasRemoteInfo && (
          <div className="flex items-center gap-2 px-3 py-2 border-t border-border-muted bg-surface-sunken text-[10px] text-muted-foreground">
            <svg
              width={10}
              height={10}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
            </svg>
            <span className="truncate">
              {remoteSessionTitle || remoteSessionId || 'Remote session'}
            </span>
          </div>
        )}
      </div>
    </ToolOutput>
  );
}
