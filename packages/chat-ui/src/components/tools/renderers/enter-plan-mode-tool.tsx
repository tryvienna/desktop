/**
 * EnterPlanModeTool — Header-only renderer for plan mode entry
 *
 * @ai-context
 * - Lightbulb icon, status-dependent description
 * - Non-collapsible (header only, no content body)
 */

import { ToolOutput } from '../tool-output';
import type { ToolRendererProps } from '../registry';
import type { ToolStatus } from '../../../types/messages';

function LightbulbIcon() {
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
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0018 8 6 6 0 006 8c0 1 .23 2.23 1.5 3.5C8.26 12.26 8.73 13.02 8.91 14" />
    </svg>
  );
}

function getDescription(status: ToolStatus): string {
  switch (status) {
    case 'running':
      return 'Entering plan mode';
    case 'complete':
      return 'Plan mode active';
    case 'error':
      return 'Failed to enter plan mode';
    default:
      return 'Enter plan mode';
  }
}

export function EnterPlanModeTool({ toolUse, onApprove, onDeny, onRevoke, isFromHistory }: ToolRendererProps) {
  return (
    <ToolOutput
      id={toolUse.id}
      toolName="Plan Mode"
      description={getDescription(toolUse.status)}
      status={toolUse.status}
      images={toolUse.result?.images}
      isFromHistory={isFromHistory}
      icon={
        <span className="flex-shrink-0 text-muted-foreground">
          <LightbulbIcon />
        </span>
      }
      collapsible={false}
      error={toolUse.result?.error}
      requestId={toolUse.requestId}
      approvalMethod={toolUse.approvalMethod}
      onApprove={onApprove}
      onDeny={onDeny}
      onRevoke={onRevoke}
    />
  );
}
