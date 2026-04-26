/**
 * WorkstreamTitle — Displays the active workstream's status icon and title.
 *
 * Rendered in the TopBar center slot. Shows a StatusIcon + truncated title.
 * Accepts an optional onClick for future drawer integration.
 *
 * @ai-context
 * - Reuses StatusIcon from @tryvienna/ui (workstream-specific status icons)
 * - Status mapping via shared toUIStatus (renderer/utils/workstream-status)
 * - When onClick is provided, renders as a ghost Button (interactive)
 * - When onClick is absent, renders as a static display (non-interactive)
 * - Title is truncated at 200px with a tooltip showing the full text
 * - React.memo prevents re-renders unless title or status change
 * - data-slot="workstream-title" for CSS targeting
 */

import { memo, useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Button,
  KeyboardHint,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  cn,
} from '@tryvienna/ui';
import { StatusIcon, getModelColor, getModelDisplayName, getModelBadge } from './domain';
import type { WorkstreamStatus as GraphQLWorkstreamStatus } from '@vienna/graphql/client/generated/graphql';
import { toUIStatus } from '../renderer/utils/workstream-status';

export interface WorkstreamTitleProps {
  /** Workstream display title */
  title: string;
  /** Current workstream status from GraphQL (lowercase) */
  status: GraphQLWorkstreamStatus;
  /** Model short ID (e.g., 'haiku', 'sonnet', 'opus') */
  model?: string | null;
  /** Optional click handler (e.g., open workstream settings drawer) */
  onClick?: () => void;
  /** Keyboard shortcut keys to display on hover */
  shortcutKeys?: string[];
  className?: string;
}

export const WorkstreamTitle = memo(function WorkstreamTitle({
  title,
  status,
  model,
  onClick,
  shortcutKeys,
  className,
}: WorkstreamTitleProps) {
  const uiStatus = toUIStatus(status);
  const titleRef = useRef<HTMLSpanElement>(null);
  const buttonRef = useRef<HTMLButtonElement & HTMLSpanElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [hintPos, setHintPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const el = titleRef.current;
    if (el) setIsTruncated(el.scrollWidth > el.clientWidth);
  }, [title]);

  useEffect(() => {
    if (isHovered && shortcutKeys?.length && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setHintPos({ x: rect.right, y: rect.top + rect.height / 2 });
    }
  }, [isHovered, shortcutKeys]);

  const modelBadge = model ? (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          data-slot="model-badge"
          className="inline-flex size-4 items-center justify-center rounded-sm text-[9px] font-bold leading-none text-white shrink-0"
          style={{ backgroundColor: getModelColor(model) }}
        >
          {getModelBadge(model)}
        </span>
      </TooltipTrigger>
      <TooltipContent>{getModelDisplayName(model)}</TooltipContent>
    </Tooltip>
  ) : null;

  const content = (
    <>
      <StatusIcon status={uiStatus} size="sm" animated />
      <span ref={titleRef} className="max-w-[200px] truncate text-sm font-medium">{title}</span>
      {modelBadge}
    </>
  );

  const sharedClassName = cn('gap-2', className);

  const hoverProps = shortcutKeys?.length ? {
    onMouseEnter: () => setIsHovered(true),
    onMouseLeave: () => setIsHovered(false),
  } : {};

  const shortcutHint = shortcutKeys && shortcutKeys.length > 0 && hintPos && createPortal(
    <div
      className="pointer-events-none fixed motion-reduce:!transition-none"
      style={{
        left: hintPos.x + 4,
        top: hintPos.y,
        transform: `translateY(-50%) translateX(${isHovered ? '0px' : '-4px'})`,
        opacity: isHovered ? 1 : 0,
        transition: 'opacity 200ms ease-out, transform 200ms ease-out',
        zIndex: 9999,
      }}
    >
      <KeyboardHint keys={shortcutKeys} />
    </div>,
    document.body,
  );

  const trigger = onClick ? (
    <Button
      ref={buttonRef as React.Ref<HTMLButtonElement>}
      data-slot="workstream-title"
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={cn('cursor-pointer', sharedClassName)}
      aria-label={title}
      {...hoverProps}
    >
      {content}
    </Button>
  ) : (
    <span
      ref={buttonRef}
      data-slot="workstream-title"
      className={cn(
        'inline-flex items-center px-3 py-1.5 text-foreground',
        sharedClassName,
      )}
      aria-label={title}
      {...hoverProps}
    >
      {content}
    </span>
  );

  if (!isTruncated) return <>{trigger}{shortcutHint}</>;

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          {trigger}
        </TooltipTrigger>
        <TooltipContent>{title}</TooltipContent>
      </Tooltip>
      {shortcutHint}
    </>
  );
});
