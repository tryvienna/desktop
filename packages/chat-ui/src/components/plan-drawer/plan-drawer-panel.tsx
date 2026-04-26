/**
 * PlanDrawerPanel — Main tabbed container for the Plan Drawer
 *
 * @ai-context
 * - Two tabs: "Plan" (code view) and "Slides" (slide deck)
 * - codeViewOverride replaces default PlanCodeView (e.g., MonacoEditor)
 * - generatedSlides overrides auto-split when provided
 * - data-slot="plan-drawer-panel"
 *
 * @example
 * <PlanDrawerPanel plan="# Plan\n..." defaultTab="plan" />
 */

import { memo, useMemo, useState, type ReactNode } from 'react';

import { cn } from '@tryvienna/ui';

import { PlanCodeView } from './plan-code-view';
import { PlanSlideView } from './plan-slide-view';
import { splitPlanIntoSlides, type PlanSlide } from './split-plan-into-slides';

export interface PlanDrawerPanelProps {
  /** Raw markdown plan content */
  plan: string;
  /** Override the default code viewer (e.g., with MonacoEditor in desktop) */
  codeViewOverride?: ReactNode;
  /** Optional render prop for markdown in slides */
  renderMarkdown?: (content: string) => ReactNode;
  /** AI-generated slides (overrides auto-split when provided) */
  generatedSlides?: PlanSlide[];
  /** Which tab to show initially: "plan" or "slides" (default: "plan") */
  defaultTab?: 'plan' | 'slides';
}

export const PlanDrawerPanel = memo(function PlanDrawerPanel({
  plan,
  codeViewOverride,
  renderMarkdown,
  generatedSlides,
  defaultTab = 'plan',
}: PlanDrawerPanelProps) {
  const [activeTab, setActiveTab] = useState<'plan' | 'slides'>(defaultTab);

  const autoSlides = useMemo(() => splitPlanIntoSlides(plan), [plan]);
  const slides = generatedSlides ?? autoSlides;

  return (
    <div data-slot="plan-drawer-panel" className="flex flex-col flex-1 min-h-0">
      {/* Tab bar */}
      <div className="px-3 pt-2 border-b border-border-muted">
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('plan')}
            className={cn(
              'px-3 py-2 text-xs font-medium rounded-t transition-colors',
              activeTab === 'plan'
                ? 'text-foreground border-b-2 border-ai'
                : 'text-muted-foreground hover:text-foreground-secondary'
            )}
          >
            Plan
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('slides')}
            className={cn(
              'px-3 py-2 text-xs font-medium rounded-t transition-colors',
              activeTab === 'slides'
                ? 'text-foreground border-b-2 border-ai'
                : 'text-muted-foreground hover:text-foreground-secondary'
            )}
          >
            Slide Deck
          </button>
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'plan' ? (
        <div className="flex-1 min-h-0 flex flex-col">
          {codeViewOverride ?? <PlanCodeView plan={plan} />}
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col">
          <PlanSlideView slides={slides} renderMarkdown={renderMarkdown} />
        </div>
      )}
    </div>
  );
});
