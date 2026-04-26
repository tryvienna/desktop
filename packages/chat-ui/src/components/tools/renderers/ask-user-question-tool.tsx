/**
 * AskUserQuestionTool — Renderer for user input gathering
 *
 * @ai-context
 * - Question icon, header labels in AI color
 * - Option list with checkboxes/radios, multi-select support
 * - Auto-collapses when answered
 * - data-slot="ask-user-question-tool-content"
 */

import { ToolOutput } from '../tool-output';
import type { ToolRendererProps } from '../registry';

interface QuestionOption {
  label: string;
  description?: string;
}

interface Question {
  question: string;
  header?: string;
  options?: QuestionOption[];
  multiSelect?: boolean;
}

function QuestionIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.25" />
      <path
        d="M5.5 5.5C5.5 4.67 6.17 4 7 4C7.83 4 8.5 4.67 8.5 5.5C8.5 6.33 7.83 7 7 7V8"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
      <circle cx="7" cy="9.5" r="0.5" fill="currentColor" />
    </svg>
  );
}

export function AskUserQuestionTool({ toolUse, messageId, isFromHistory }: ToolRendererProps) {
  const questions = (toolUse.input.questions as Question[] | undefined) ?? [];
  const error = toolUse.result?.error;
  const isAnswered = toolUse.status === 'complete';

  const firstQuestion = questions[0]?.question ?? 'Asking a question...';
  const questionCount = questions.length;

  return (
    <ToolOutput
      id={toolUse.id}
      toolName="Question"
      description={firstQuestion.slice(0, 60)}
      status={toolUse.status}
      error={error}
      // Don't pass requestId — questions are answered via QuestionActionBar, not ApprovalDropdown
      approvalMethod={toolUse.approvalMethod}
      images={toolUse.result?.images}
      isFromHistory={isFromHistory}
      defaultCollapsed={isAnswered}
      showContentWhilePendingPermission
      icon={
        <span className="flex-shrink-0 text-ai">
          <QuestionIcon />
        </span>
      }
      actions={
        isAnswered ? (
          <span className="flex items-center gap-1 text-[10px] text-success">
            Answers submitted
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[10px] text-ai">
            {questionCount} question{questionCount !== 1 ? 's' : ''} — answer below
          </span>
        )
      }
    >
      <div
        data-slot="ask-user-question-tool-content"
        data-testid={`askuserquestion-tool-${messageId}`}
      >
        {questions.map((q, qi) => (
          <div key={qi} className="border-b border-border-muted px-3 py-2 last:border-b-0">
            {q.header && (
              <span className="mb-1 block font-mono text-[10px] font-medium uppercase text-ai">
                {q.header}
              </span>
            )}
            <p className="mb-1.5 text-xs text-foreground">{q.question}</p>
            {q.options && q.options.length > 0 && (
              <ul className="space-y-1">
                {q.options.map((opt, oi) => (
                  <li key={oi} className="flex items-start gap-2 text-xs">
                    <span className="mt-0.5 flex-shrink-0 text-muted-foreground">
                      {q.multiSelect ? '☐' : '○'}
                    </span>
                    <div>
                      <span className="text-foreground">{opt.label}</span>
                      {opt.description && (
                        <span className="ml-1 text-muted-foreground">— {opt.description}</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </ToolOutput>
  );
}
