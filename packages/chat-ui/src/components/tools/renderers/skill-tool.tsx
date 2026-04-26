/**
 * SkillTool — Renderer for skill invocations
 *
 * @ai-context
 * - Skill tool invokes user-defined or built-in skills (e.g. /commit, /test)
 * - Input: { skill_name, arguments? }
 * - Compact display showing the skill name and status
 * - data-slot="skill-tool-content"
 */

import { ToolOutput } from '../tool-output';
import type { ToolRendererProps } from '../registry';

function ZapIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d="M7.5 1L3 8H7L6.5 13L11 6H7L7.5 1Z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SkillTool({ toolUse, messageId, onApprove, onDeny, onRevoke, isFromHistory }: ToolRendererProps) {
  const skillName = (toolUse.input.skill_name as string) ?? (toolUse.input.skill as string) ?? '';
  const error = toolUse.result?.error;
  const isRunning = toolUse.status === 'running';

  const displayName = skillName.startsWith('/') ? skillName : `/${skillName}`;

  return (
    <ToolOutput
      id={toolUse.id}
      toolName="Skill"
      description={displayName}
      status={toolUse.status}
      error={error}
      requestId={toolUse.requestId}
      approvalMethod={toolUse.approvalMethod}
      onApprove={onApprove}
      onDeny={onDeny}
      onRevoke={onRevoke}
      images={toolUse.result?.images}
      isFromHistory={isFromHistory}
      defaultCollapsed={true}
      icon={
        <span className="flex-shrink-0 text-muted-foreground">
          <ZapIcon />
        </span>
      }
    >
      <div data-slot="skill-tool-content" data-testid={`skill-tool-${messageId}`}>
        {isRunning ? (
          <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground">
            Running skill...
          </div>
        ) : toolUse.result?.output ? (
          <pre className="max-h-[200px] overflow-auto px-3 py-2 font-mono text-xs text-foreground-secondary whitespace-pre-wrap break-words">
            {toolUse.result.output}
          </pre>
        ) : null}
      </div>
    </ToolOutput>
  );
}
