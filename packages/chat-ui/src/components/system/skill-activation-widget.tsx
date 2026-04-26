/**
 * SkillActivationWidget — Compact card showing skills injected into the conversation
 *
 * @ai-context
 * - Renders skill activation system events with skill name badges
 * - Supports multiple simultaneous skill activations
 * - Expandable to show skill body content when available
 * - data-slot="skill-activation-widget"
 *
 * @example
 * <SkillActivationWidget skills={[{ id: 'commit', name: 'commit', body: '...' }]} />
 */

import { memo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { SPRINGS } from '../../tokens';

export interface SkillActivationWidgetProps {
  skills: Array<{ id: string; name: string; trigger?: string; body?: string }>;
}

export const SkillActivationWidget = memo(function SkillActivationWidget({
  skills,
}: SkillActivationWidgetProps) {
  const [expanded, setExpanded] = useState(false);
  const label = skills.length === 1 ? 'Skill activated' : 'Skills activated';
  const hasBody = skills.some((s) => s.body);

  const toggleExpanded = useCallback(() => {
    if (hasBody) setExpanded((prev) => !prev);
  }, [hasBody]);

  return (
    <motion.div
      data-slot="skill-activation-widget"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SPRINGS.GENTLE}
      className="rounded-lg border bg-surface-page border-border-muted overflow-hidden"
    >
      {/* Header */}
      <div
        className={`flex items-center gap-2 px-3 py-1.5 ${hasBody ? 'cursor-pointer select-none' : ''}`}
        onClick={toggleExpanded}
        onKeyDown={hasBody ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleExpanded(); } } : undefined}
        tabIndex={hasBody ? 0 : undefined}
        role={hasBody ? 'button' : undefined}
        aria-expanded={hasBody ? expanded : undefined}
      >
        <svg
          width={14}
          height={14}
          viewBox="0 0 24 24"
          fill="none"
          className="flex-shrink-0 text-warning"
        >
          <path
            d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {skills.map((skill) => (
          <span
            key={skill.id}
            className="text-xs font-medium px-1.5 py-0.5 rounded bg-warning/10 text-warning"
          >
            /{skill.name}
          </span>
        ))}
        {hasBody && (
          <ChevronDown
            size={14}
            className={`ml-auto flex-shrink-0 text-muted-foreground transition-transform duration-150 ${expanded ? 'rotate-180' : ''}`}
          />
        )}
      </div>

      {/* Expandable body */}
      <AnimatePresence initial={false}>
        {expanded && hasBody && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="border-t border-border-muted px-3 py-2 flex flex-col gap-2">
              {skills.filter((s) => s.body).map((skill) => (
                <div key={skill.id}>
                  {skills.filter((s) => s.body).length > 1 && (
                    <div className="text-[11px] font-medium text-warning mb-1">/{skill.name}</div>
                  )}
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-words max-h-[200px] overflow-y-auto leading-relaxed m-0 font-sans">
                    {skill.body}
                  </pre>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});
