/**
 * PlanModeTool — Combined renderer for EnterPlanMode and ExitPlanMode
 *
 * @ai-context
 * - Lightbulb icon, status-dependent description per tool name
 * - Non-collapsible for EnterPlanMode, collapsible for ExitPlanMode
 * - data-slot="plan-mode-tool-content" (ExitPlanMode only)
 */

import { ToolOutput } from '../tool-output';
import type { ToolRendererProps } from '../registry';

function LightbulbIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d="M7 1.5C4.79 1.5 3 3.29 3 5.5C3 7.03 3.8 8.36 5 9.08V10.5C5 11.05 5.45 11.5 6 11.5H8C8.55 11.5 9 11.05 9 10.5V9.08C10.2 8.36 11 7.03 11 5.5C11 3.29 9.21 1.5 7 1.5Z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M5.5 12.5H8.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}

const DESCRIPTIONS: Record<string, Record<string, string>> = {
  EnterPlanMode: {
    running: 'Entering plan mode',
    complete: 'Plan mode active',
    error: 'Failed to enter plan mode',
    default: 'Enter plan mode',
  },
  ExitPlanMode: {
    running: 'Submitting plan',
    complete: 'Plan submitted for review',
    error: 'Failed to submit plan',
    default: 'Submitting plan for approval',
  },
};

export function PlanModeTool({ toolUse, messageId, onApprove, onDeny, onRevoke }: ToolRendererProps) {
  const isExit = toolUse.name === 'ExitPlanMode';
  const toolName = isExit ? 'ExitPlanMode' : 'EnterPlanMode';
  const error = toolUse.result?.error;
  const descs = DESCRIPTIONS[toolName];
  const desc = descs[toolUse.status] ?? descs.default;

  return (
    <ToolOutput
      id={toolUse.id}
      toolName={toolName}
      description={desc}
      status={toolUse.status}
      error={error}
      requestId={toolUse.requestId}
      approvalMethod={toolUse.approvalMethod}
      onApprove={onApprove}
      onDeny={onDeny}
      onRevoke={onRevoke}
      collapsible={isExit}
      defaultCollapsed={!isExit}
      icon={
        <span className="flex-shrink-0 text-warning">
          <LightbulbIcon />
        </span>
      }
    >
      {isExit && (
        <div data-slot="plan-mode-tool-content" data-testid={`planmode-tool-${messageId}`}>
          <div className="p-3 text-xs text-foreground-secondary">Plan submitted for review</div>
        </div>
      )}
    </ToolOutput>
  );
}
