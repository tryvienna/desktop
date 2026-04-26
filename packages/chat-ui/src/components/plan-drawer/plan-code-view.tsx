/**
 * PlanCodeView — Simple read-only code viewer with line numbers
 *
 * @ai-context
 * - Default "Plan" tab content in PlanDrawerPanel
 * - Replaced by MonacoEditor in the desktop app via codeViewOverride
 * - Table-based layout with line numbers and hover highlights
 * - data-slot="plan-code-view"
 *
 * @example
 * <PlanCodeView plan="# My Plan\n- Step 1\n- Step 2" />
 */

import { memo } from 'react';

export interface PlanCodeViewProps {
  /** Raw plan markdown content */
  plan: string;
}

export const PlanCodeView = memo(function PlanCodeView({ plan }: PlanCodeViewProps) {
  const lines = plan.split('\n');

  return (
    <div
      data-slot="plan-code-view"
      className="flex-1 overflow-auto bg-surface-sunken font-mono text-xs leading-5"
    >
      <table className="w-full border-collapse">
        <tbody>
          {lines.map((line, i) => (
            <tr key={i} className="hover:bg-surface-hover">
              <td className="select-none text-right pr-3 pl-3 text-muted-foreground w-[1%] whitespace-nowrap border-r border-border-muted">
                {i + 1}
              </td>
              <td className="pl-3 pr-3 whitespace-pre-wrap text-foreground">{line || '\u00A0'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});
