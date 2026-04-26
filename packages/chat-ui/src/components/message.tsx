/**
 * ChatMessage — Renders a single chat message (user, assistant, or system)
 *
 * @ai-context
 * - Delegates to UserMessage, AssistantMessage, or SystemMessage based on role
 * - Supports text, thinking, tool_use, and system_event content blocks
 * - Streaming text uses TypewriterText for incremental reveal
 * - Error banner rendered above assistant content when message.error is set
 * - data-slot="message"
 *
 * @example
 * <ChatMessage message={msg} toolRenderer={renderTool} />
 */

import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { AlertCircle, Clock, GitBranch, Loader2, RotateCcw } from 'lucide-react';
import { Markdown } from '@tryvienna/ui';
import type { Message as MessageType, ContentBlock, ImageAttachmentBlock, NanoContextBlock, ToolUse, ToolUseBlock, CompactBoundaryBlock, SkillActivationBlock, ShellExecutionBlock, TagExecutionBlock, TagDelegationBlock } from '../types/messages';
import { LinkedUserMessage } from './linked-user-message';
import { TypewriterText } from './streaming/typewriter-text';
import { ExplorationPanel, isExplorationTool } from './tools/exploration';
import { PROCESSING_INDICATOR_HEIGHT } from './preparing-indicator';
import { CompactingWidget, SkillActivationWidget, ShellExecutionWidget, TagExecutionWidget, TagDelegationWidget } from './system';
import { containsEntityMarkup, parseEntityMarkup, getEntityDisplayLabel } from '../utils/entity-uri';
import { EntityTextRenderer, useEntityClick, ViennaChipIcon } from '../renderers/entity-text-renderer';
import { ThinkingRenderer } from '../renderers/thinking-renderer';
import { useEntityWidgetRenderer } from '../renderers/entity-widget-context';
import { containsPasteMarkup } from '../utils/paste-markup';
import { PasteTextRenderer } from '../renderers/paste-text-renderer';
import { hasNanoContext, parseNanoContextFromText } from '../nano-context/serialization';
import { NanoContextWidget } from '../nano-context/nano-context-widget';

// ─── Markdown Detection ─────────────────────────────────────────────────────

const MARKDOWN_PATTERNS = [
  /```/,                          // fenced code blocks
  /`[^`\n]+`/,                    // inline code
  /^#{1,6}\s/m,                   // headings
  /\*\*[^*]+\*\*/,                // bold
  /\[([^\]]+)\]\([^)]+\)/,        // links [text](url)
  /^[-*]\s/m,                     // unordered list items
  /^\d+\.\s/m,                    // ordered list items
  /^>\s/m,                        // blockquotes
  /https?:\/\/\S+/,               // bare URLs (GFM autolinks)
];

/** Returns true when text contains markdown syntax worth rendering. */
function containsMarkdown(text: string): boolean {
  return MARKDOWN_PATTERNS.some((re) => re.test(text));
}

/** Renders the final (non-animated) form of a text block. */
function renderFinalText(text: string, index: number): React.ReactNode {
  if (containsMarkdown(text)) {
    return (
      <div key={index}>
        <Markdown content={text} style={{ color: 'inherit' }} />
      </div>
    );
  }
  return (
    <span key={index} className="whitespace-pre-wrap">
      {text}
    </span>
  );
}

/**
 * AssistantTextBlock — Manages the typewriter → final text transition.
 *
 * Keeps TypewriterText mounted until its animation completes, even after
 * streaming ends. Once the typewriter has revealed all words, it stays
 * as the permanent rendering. No DOM swap occurs, so there's no flicker.
 *
 * Entity chips render inline during streaming via StreamingEntityText:
 * as soon as a complete entity URI arrives, the chip (label + icon)
 * appears immediately while surrounding text continues typewriter animation.
 *
 * Markdown content (headings, bold, code blocks, etc.) renders via the
 * Markdown component immediately — even during streaming — so formatting
 * appears as text arrives rather than waiting for the stream to finish.
 * Plain text without markdown still uses the typewriter animation.
 */
function AssistantTextBlock({
  text,
  index,
  isStreaming,
  onContentGrow,
  messageId,
}: {
  text: string;
  index: number;
  isStreaming: boolean;
  onContentGrow?: () => void;
  messageId: string;
}) {
  const [animationDone, setAnimationDone] = useState(false);
  const hasEntities = useMemo(() => containsEntityMarkup(text), [text]);
  const hasMarkdown = useMemo(() => containsMarkdown(text), [text]);
  const hasPaste = useMemo(() => containsPasteMarkup(text), [text]);

  // Markdown content renders immediately — even during streaming — so that
  // headings, bold, code blocks, etc. appear formatted as they arrive.
  if (hasMarkdown && !hasEntities && !hasPaste) {
    return (
      <div key={index}>
        <Markdown content={text} style={{ color: 'inherit' }} />
      </div>
    );
  }

  // After streaming + animation: final render with full EntityTextRenderer
  // (supports custom renderers like GraphQL title resolution)
  if (!isStreaming && animationDone) {
    if (hasPaste) {
      return (
        <PasteTextRenderer
          content={{ type: 'text', text }}
          messageId={messageId}
          isStreaming={false}
        />
      );
    }
    if (hasEntities) {
      return (
        <EntityTextRenderer
          content={{ type: 'text', text }}
          messageId={messageId}
        />
      );
    }
    // Markdown text that also contained entities or paste markup — the early
    // return above handled the pure-markdown case during streaming, but mixed
    // content falls through to here once animation completes.
    if (hasMarkdown) {
      return (
        <div key={index}>
          <Markdown content={text} style={{ color: 'inherit' }} />
        </div>
      );
    }
  }

  // During streaming/animation: entity-aware rendering shows chips immediately
  if (hasEntities) {
    return (
      <StreamingEntityText
        text={text}
        isStreaming={isStreaming}
        onContentGrow={onContentGrow}
        onAnimationComplete={() => setAnimationDone(true)}
        messageId={messageId}
      />
    );
  }

  return (
    <TypewriterText
      key={index}
      text={text}
      isStreaming={isStreaming}
      onContentGrow={onContentGrow}
      onAnimationComplete={() => setAnimationDone(true)}
    />
  );
}

// ─── Streaming Entity Text ──────────────────────────────────────────────────

/** Matches a trailing partial entity URI (opening bracket without closing). */
const PARTIAL_ENTITY_RE = /\[{1,2}@?vienna:?\/\/?[^\]]*$/i;

/**
 * StreamingEntityText — Renders text with entity chips inline during streaming.
 *
 * Splits text into segments via parseEntityMarkup. Text segments use
 * TypewriterText for animation; entity segments render chips immediately.
 * Trailing partial entity URIs are buffered (hidden) during streaming so
 * users never see raw URI syntax — only the resolved display label + icon.
 *
 * TypewriterText's backlog-skipping ensures older text segments appear
 * instantly while the latest segment animates at the live edge.
 */
function StreamingEntityText({
  text,
  isStreaming,
  onContentGrow,
  onAnimationComplete,
  messageId,
}: {
  text: string;
  isStreaming: boolean;
  onContentGrow?: () => void;
  onAnimationComplete?: () => void;
  messageId: string;
}) {
  const segments = useMemo(() => {
    const parsed = parseEntityMarkup(text);
    if (!isStreaming || parsed.length === 0) return parsed;

    // Buffer trailing partial entity URIs during streaming
    const last = parsed[parsed.length - 1];
    if (last.type === 'text') {
      const partialMatch = last.content.match(PARTIAL_ENTITY_RE);
      if (partialMatch && partialMatch.index !== undefined) {
        const clean = last.content.substring(0, partialMatch.index);
        if (clean) {
          return [...parsed.slice(0, -1), { ...last, content: clean }];
        }
        return parsed.slice(0, -1);
      }
    }
    return parsed;
  }, [text, isStreaming]);

  const onEntityClick = useEntityClick();
  const customRenderer = useEntityWidgetRenderer();

  // Find the last text segment for streaming/callback coordination
  let lastTextIdx = -1;
  for (let i = segments.length - 1; i >= 0; i--) {
    if (segments[i].type === 'text') {
      lastTextIdx = i;
      break;
    }
  }

  return (
    <span data-slot="streaming-entity-text">
      {segments.map((segment, i) => {
        if (segment.type === 'entity') {
          const { entity } = segment;
          const handleClick = onEntityClick
            ? () => onEntityClick(entity.uri, entity)
            : undefined;

          // Try custom renderer (e.g. GraphQL title resolution) first
          const custom = customRenderer?.({
            uri: entity.uri,
            entityType: entity.entityType,
            pathSegments: entity.pathSegments,
            label: entity.label,
            compact: true,
            messageId,
          });

          if (custom) {
            return (
              <span
                key={`e-${entity.uri}`}
                onClick={handleClick}
                style={{ cursor: handleClick ? 'pointer' : 'default' }}
              >
                {custom}
              </span>
            );
          }

          // Fallback: display label from URI + icon
          const label = getEntityDisplayLabel(entity);
          return (
            <span
              key={`e-${entity.uri}`}
              onClick={handleClick}
              style={{
                cursor: handleClick ? 'pointer' : 'default',
                textDecoration: 'underline',
                textDecorationColor: 'currentColor',
                textUnderlineOffset: '2px',
                textDecorationThickness: '1px',
                textDecorationStyle: 'dotted' as const,
              }}
              title={entity.uri}
            >
              {label}
              <ViennaChipIcon />
            </span>
          );
        }

        const isLast = i === lastTextIdx;
        return (
          <TypewriterText
            key={`t-${i}`}
            text={segment.content}
            isStreaming={isStreaming && isLast}
            onContentGrow={isLast ? onContentGrow : undefined}
            onAnimationComplete={isLast ? onAnimationComplete : undefined}
          />
        );
      })}
    </span>
  );
}

// ─── Props ─────────────────────────────────────────────────────────────────

export interface MessageProps {
  message: MessageType;
  toolRenderer?: (toolUse: ToolUse, messageId: string, isFromHistory?: boolean) => React.ReactNode;
  onApprove?: (requestId: string, scope: 'once' | 'session' | 'permanent') => void;
  onDeny?: (requestId: string, message?: string) => void;
  onContentGrow?: () => void;
  onRewind?: (eventId: number, role?: string) => void;
  onFork?: (messageId: string, providerUuid: string) => void;
}

// ─── Content Block Rendering ───────────────────────────────────────────────

function renderContentBlock(
  block: ContentBlock,
  index: number,
  message: MessageType,
  props: MessageProps
): React.ReactNode {
  switch (block.type) {
    case 'text':
      // Assistant messages that aren't replayed from history get the typewriter treatment.
      // AssistantTextBlock keeps the animation running even after streaming ends,
      // then swaps to the final rendered form (entity chips, Markdown, or plain) once complete.
      if (message.role === 'assistant' && !message.isFromHistory) {
        return (
          <AssistantTextBlock
            key={index}
            index={index}
            text={block.text}
            isStreaming={message.isStreaming ?? false}
            onContentGrow={props.onContentGrow}
            messageId={message.id}
          />
        );
      }
      // History and non-assistant messages: render paste markup as clickable chips
      if (containsPasteMarkup(block.text)) {
        return (
          <PasteTextRenderer
            key={index}
            content={block}
            messageId={message.id}
            isStreaming={false}
          />
        );
      }
      // Render entity markup as chips/cards
      if (containsEntityMarkup(block.text)) {
        return (
          <EntityTextRenderer
            key={index}
            content={block}
            messageId={message.id}
          />
        );
      }
      return renderFinalText(block.text, index);

    case 'thinking': {
      // Only show streaming indicator on the last thinking block while thinking is active.
      // message.isThinking is false once thinking_done fires, even if the message is still streaming text/tools.
      const isLastThinking =
        message.isThinking && index === message.content.findLastIndex((b) => b.type === 'thinking');
      return (
        <ThinkingRenderer
          key={index}
          content={block}
          messageId={message.id}
          isStreaming={isLastThinking}
        />
      );
    }

    case 'tool_use': {
      const toolUse = message.toolUses.find((t) => t.id === block.toolUseId);
      if (!toolUse) return null;

      if (props.toolRenderer) {
        const rendered = props.toolRenderer(toolUse, message.id, message.isFromHistory);
        if (rendered) {
          return (
            <div key={index} className="my-1">
              {rendered}
            </div>
          );
        }
      }

      // Minimal fallback when no renderer matched or none provided
      return (
        <div
          key={index}
          className="my-1 rounded-lg border border-border-muted px-3 py-2 text-[13px]"
        >
          <span className="text-foreground-secondary">{toolUse.name}</span>
          {toolUse.status === 'running' && <span className="ml-2 text-info">running...</span>}
        </div>
      );
    }

    case 'compact_boundary': {
      const cb = block as CompactBoundaryBlock;
      return (
        <CompactingWidget
          key={index}
          status={cb.status ?? 'complete'}
          trigger={cb.trigger}
          preTokens={cb.preTokens}
        />
      );
    }

    case 'skill_activation': {
      const sa = block as SkillActivationBlock;
      return <SkillActivationWidget key={index} skills={sa.skills} />;
    }

    case 'tag_execution': {
      const te = block as TagExecutionBlock;
      return (
        <TagExecutionWidget
          key={index}
          tagName={te.tagName}
          color={te.color}
          status={te.status}
          instructions={te.instructions}
          workstreamId={te.workstreamId}
          snapshot={te.snapshot}
        />
      );
    }

    case 'tag_delegation': {
      const td = block as TagDelegationBlock;
      return (
        <TagDelegationWidget
          key={index}
          tagName={td.tagName}
          color={td.color}
          delegatedWorkstreamId={td.delegatedWorkstreamId}
          delegatedWorkstreamTitle={td.delegatedWorkstreamTitle}
        />
      );
    }

    case 'system_event':
      return <SystemEventWidget key={index} eventType={block.eventType} data={block.data} />;

    default:
      return null;
  }
}

// ─── System Event Widgets ──────────────────────────────────────────────────

const BASE_SYSTEM_EVENT_CLASSES = 'py-1 text-[13px] text-muted-foreground';

function SystemEventWidget({ eventType, data }: { eventType: string; data: unknown }) {
  const d = data as Record<string, unknown>;

  switch (eventType) {
    case 'model_change':
      return (
        <div className={`${BASE_SYSTEM_EVENT_CLASSES} flex items-center gap-2`}>
          <span>
            Model changed from {String(d.fromModel)} to {String(d.toModel)}
          </span>
        </div>
      );

    case 'entity_link':
      return (
        <div className={`${BASE_SYSTEM_EVENT_CLASSES} flex items-center gap-2`}>
          <span>
            {String(d.entityTitle)} {String(d.action)}
          </span>
        </div>
      );

    case 'interrupted':
      return (
        <div className={`py-1 text-[13px] text-warning`} data-interrupted-badge>
          Response interrupted
        </div>
      );

    case 'compact_boundary':
      return (
        <div className={BASE_SYSTEM_EVENT_CLASSES}>Context compacted ({String(d.trigger)})</div>
      );

    case 'skill_activation': {
      const skills = (d.skills as Array<{ name: string }>) ?? [];
      return (
        <div className={BASE_SYSTEM_EVENT_CLASSES}>
          Skills activated: {skills.map((s) => s.name).join(', ')}
        </div>
      );
    }

    case 'task_notification':
      return (
        <div className={BASE_SYSTEM_EVENT_CLASSES}>
          Task {String(d.status)}: {String(d.summary)}
        </div>
      );

    case 'error':
      return <ErrorEventWidget data={d} />;

    case 'rate_limited':
      return <RateLimitedEventWidget data={d} />;

    case 'provider_event':
      return (
        <details className={`${BASE_SYSTEM_EVENT_CLASSES} font-mono`}>
          <summary className="flex items-center gap-1.5 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden">
            <span className="text-muted-foreground/40 text-[10px] transition-transform [[open]>&]:rotate-90">&#9654;</span>
            <span className="text-muted-foreground/60">{String(d.provider ?? 'unknown')}</span>
            <span className="text-muted-foreground/40">/</span>
            <span>{String(d.eventType ?? 'event')}</span>
          </summary>
          <pre className="mt-1.5 text-[10px] leading-tight text-muted-foreground/50 overflow-x-auto max-h-60 whitespace-pre-wrap break-all">
            {JSON.stringify(d.rawEvent ?? d, null, 2)}
          </pre>
        </details>
      );

    default:
      return <div className={BASE_SYSTEM_EVENT_CLASSES}>{eventType}</div>;
  }
}

// ─── Debug Copy Helper ────────────────────────────────────────────────────

function formatDebugContext(label: string, d: Record<string, unknown>): string {
  const ts = d.timestamp ? new Date(Number(d.timestamp)).toISOString() : new Date().toISOString();
  const sections: string[] = [
    `## ${label}`,
    '',
    `**Time:** ${ts}`,
    `**Code:** ${String(d.code || d.limitType || 'unknown')}`,
  ];
  if (d.originMessageId) sections.push(`**Origin Message ID:** ${String(d.originMessageId)}`);
  if (d.systemMessageId) sections.push(`**System Message ID:** ${String(d.systemMessageId)}`);
  if (d.isFromHistory != null) sections.push(`**From History Replay:** ${String(d.isFromHistory)}`);
  if (d.retryable != null) sections.push(`**Retryable:** ${String(d.retryable)}`);
  sections.push('');
  if (d.message) {
    sections.push('### Error Message', '```', String(d.message), '```', '');
  }
  if (d.rawEvent) {
    sections.push('### Raw Event', '```json', JSON.stringify(d.rawEvent, null, 2), '```', '');
  }
  return sections.join('\n');
}

function CopyDebugButton({ label, data }: { label: string; data: Record<string, unknown> }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    const text = formatDebugContext(label, data);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [label, data]);

  return (
    <button
      onClick={handleCopy}
      className="flex-shrink-0 p-1 rounded hover:bg-black/10 transition-colors"
      title="Copy debug context to clipboard"
    >
      {copied ? (
        <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
        </svg>
      )}
    </button>
  );
}

// ─── Error / Rate Limit Event Widgets ─────────────────────────────────────

function ErrorEventWidget({ data: d }: { data: Record<string, unknown> }) {
  return (
    <div className="rounded-lg border border-[var(--error-border,hsl(0_60%_85%))] bg-[var(--error-surface,hsl(0_60%_96%))] px-4 py-3 text-[var(--error-text,hsl(0_70%_40%))]">
      <div className="flex items-center gap-2 mb-1">
        <AlertCircle size={14} />
        <span className="font-semibold text-sm">{String(d.code || 'error')}</span>
        {Boolean(d.retryable) && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--error-text,hsl(0_70%_40%))]/10">retryable</span>}
        <div className="flex-1" />
        <CopyDebugButton label="Agent Error" data={d} />
      </div>
      <pre className="whitespace-pre-wrap text-xs font-mono max-h-[200px] overflow-auto">{String(d.message || '')}</pre>
      {d.originMessageId != null && (
        <div className="mt-2 text-[10px] font-mono opacity-60">msg: {String(d.originMessageId)}</div>
      )}
    </div>
  );
}

function RateLimitedEventWidget({ data: d }: { data: Record<string, unknown> }) {
  return (
    <div className="rounded-lg border border-[var(--warning-border,hsl(40_70%_80%))] bg-[var(--warning-surface,hsl(40_70%_95%))] px-4 py-3 text-[var(--warning-text,hsl(30_80%_35%))]">
      <div className="flex items-center gap-2 mb-1">
        <Clock size={14} />
        <span className="font-semibold text-sm">Usage limit reached</span>
        {Boolean(d.isUsingOverage) && <span className="text-[10px] px-1.5 py-0.5 rounded bg-warning/15 text-warning/90">using overage</span>}
        <div className="flex-1" />
        <CopyDebugButton label="Rate Limit" data={d} />
      </div>
      <div className="text-xs">
        <span>Type: {String(d.limitType)}</span>
        {d.resetsAt != null && Number(d.resetsAt) > 0 && <span className="ml-2">Resets at: {new Date(Number(d.resetsAt) * 1000).toLocaleTimeString()}</span>}
      </div>
    </div>
  );
}

// ─── Exploration Grouping ──────────────────────────────────────────────────

type ContentSegment =
  | { kind: 'individual'; block: ContentBlock; index: number }
  | { kind: 'exploration_group'; toolUses: ToolUse[]; startIndex: number };

/**
 * Partition content blocks into segments, grouping consecutive exploration
 * tool_use blocks (2+) into a single exploration_group segment.
 */
function segmentContentBlocks(
  content: ContentBlock[],
  toolUses: ToolUse[]
): ContentSegment[] {
  const segments: ContentSegment[] = [];
  let pendingExploration: { toolUses: ToolUse[]; startIndex: number } | null = null;

  function flushExploration() {
    if (!pendingExploration) return;
    if (pendingExploration.toolUses.length >= 2) {
      segments.push({
        kind: 'exploration_group',
        toolUses: pendingExploration.toolUses,
        startIndex: pendingExploration.startIndex,
      });
    } else {
      // Below threshold — render individually
      for (let j = 0; j < pendingExploration.toolUses.length; j++) {
        segments.push({
          kind: 'individual',
          block: content[pendingExploration.startIndex + j]!,
          index: pendingExploration.startIndex + j,
        });
      }
    }
    pendingExploration = null;
  }

  for (let i = 0; i < content.length; i++) {
    const block = content[i]!;

    if (block.type === 'tool_use') {
      const toolUse = toolUses.find((t) => t.id === (block as ToolUseBlock).toolUseId);
      if (toolUse && isExplorationTool(toolUse.name, toolUse.input)) {
        if (!pendingExploration) {
          pendingExploration = { toolUses: [], startIndex: i };
        }
        pendingExploration.toolUses.push(toolUse);
        continue;
      }
    }

    flushExploration();
    segments.push({ kind: 'individual', block, index: i });
  }

  flushExploration();
  return segments;
}

// ─── Error Banner ──────────────────────────────────────────────────────────

function ErrorBanner({ error }: { error: string }) {
  return (
    <div
      data-message-error
      className="mb-2 rounded-lg border border-[var(--error-border,#fcc)] bg-[var(--error-surface,#fee)] px-4 py-3 text-[var(--error-text,#c00)]"
    >
      <div className="mb-1 font-semibold">Error</div>
      <div className="whitespace-pre-wrap text-sm">{error}</div>
    </div>
  );
}

// ─── Action Button with Portal Tooltip ────────────────────────────────────

function ActionButton({
  className,
  onClick,
  label,
  children,
}: {
  className: string;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const showTooltip = () => {
    const rect = ref.current?.getBoundingClientRect();
    if (rect) {
      setPos({ top: rect.top - 28, left: rect.left + rect.width / 2 });
    }
  };

  return (
    <>
      <button
        ref={ref}
        type="button"
        className={className}
        onClick={onClick}
        aria-label={label}
        onMouseEnter={showTooltip}
        onMouseLeave={() => setPos(null)}
      >
        {children}
      </button>
      {pos &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[9999] -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-1.5 py-0.5 text-[10px] text-background"
            style={{ top: pos.top, left: pos.left }}
          >
            {label}
          </div>,
          document.body,
        )}
    </>
  );
}

// ─── Message Actions (Rewind + Fork) ──────────────────────────────────────
//
// Unified hover bar below messages showing rewind and fork icons.
// Both icons share the same styling: subtle on hover, always visible when
// rewind is in confirming/rewinding state.

function MessageActions({
  message,
  onRewind,
  onFork,
  role,
  hoverClass,
}: {
  message: MessageType;
  onRewind?: (eventId: number, role?: string) => void;
  onFork?: (messageId: string, providerUuid: string) => void;
  role: string;
  hoverClass: string;
}) {
  const [rewindPhase, setRewindPhase] = useState<'idle' | 'confirming' | 'rewinding'>('idle');

  const canRewind = onRewind && message.dbEventId != null;
  const canFork = onFork && message.providerUuid && !message.isStreaming;
  if (!canRewind && !canFork) return null;

  // Always visible when rewind is confirming/rewinding; hover-only otherwise
  const visibilityClass = rewindPhase === 'idle' ? `opacity-0 transition-opacity ${hoverClass}` : '';

  const iconBtnClass = "flex items-center gap-1 rounded px-1.5 py-0.5 text-muted-foreground/50 hover:text-muted-foreground hover:bg-surface-page transition-colors";

  if (rewindPhase === 'rewinding') {
    return (
      <div className={visibilityClass}>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 size={12} className="animate-spin" />
          <span>Rewinding...</span>
        </div>
      </div>
    );
  }

  if (rewindPhase === 'confirming') {
    return (
      <div className={visibilityClass}>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>Rewind to here?</span>
          <button
            type="button"
            className="rounded px-1.5 py-0.5 text-xs font-medium text-foreground-danger hover:bg-surface-hover"
            onClick={() => {
              setRewindPhase('rewinding');
              Promise.resolve(onRewind!(message.dbEventId!, role)).catch(() => {
                setRewindPhase('idle');
              });
            }}
          >
            Confirm
          </button>
          <button
            type="button"
            className="rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-surface-hover"
            onClick={() => setRewindPhase('idle')}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-0.5 ${visibilityClass}`}>
      {canRewind && (
        <ActionButton
          className={iconBtnClass}
          onClick={() => setRewindPhase('confirming')}
          label="Rewind"
        >
          <RotateCcw size={12} />
        </ActionButton>
      )}
      {canFork && (
        <ActionButton
          className={iconBtnClass}
          onClick={() => onFork!(message.id, message.providerUuid!)}
          label="Fork"
        >
          <GitBranch size={12} />
        </ActionButton>
      )}
    </div>
  );
}

// ─── Role-specific Renderers ───────────────────────────────────────────────

const UserMessage = memo(function UserMessage({ message, onRewind, onFork, ...props }: MessageProps) {
  const imageAttachmentBlocks: ImageAttachmentBlock[] = [];
  const skillActivationBlocks: SkillActivationBlock[] = [];
  const shellExecutionBlocks: ShellExecutionBlock[] = [];
  const nanoContextBlocks: NanoContextBlock[] = [];
  const otherContent: ContentBlock[] = [];

  for (const block of message.content) {
    if (block.type === 'image_attachment') {
      imageAttachmentBlocks.push(block);
    } else if (block.type === 'skill_activation') {
      skillActivationBlocks.push(block as SkillActivationBlock);
    } else if (block.type === 'shell_execution') {
      shellExecutionBlocks.push(block as ShellExecutionBlock);
    } else if (block.type === 'text' && hasNanoContext(block.text)) {
      // Extract nanocontext XML from text and render as cards
      const { blocks, remainingText } = parseNanoContextFromText(block.text);
      nanoContextBlocks.push(...blocks);
      if (remainingText.trim()) {
        otherContent.push({ type: 'text', text: remainingText });
      }
    } else {
      otherContent.push(block);
    }
  }

  if (imageAttachmentBlocks.length > 0) {
    return (
      <LinkedUserMessage
        imageAttachmentBlocks={imageAttachmentBlocks}
        otherContent={otherContent}
        message={message}
        renderContentBlock={(block, i) =>
          renderContentBlock(block, i, message, { message, ...props })
        }
      />
    );
  }

  return (
    <div data-slot="message" data-user-message className="group/user-msg flex flex-col items-end gap-2">
      {/* Skill activation widgets render above the user bubble */}
      {skillActivationBlocks.map((block, i) => (
        <div key={`skill-${i}`} className="w-full max-w-[85%]">
          <SkillActivationWidget skills={block.skills} />
        </div>
      ))}
      {/* NanoContext cards render above the message bubble */}
      {nanoContextBlocks.map((block, i) => (
        <div key={`nano-${i}`} className="w-full max-w-[85%]">
          <NanoContextWidget
            contextType={block.contextType}
            title={block.title}
            subtitle={block.subtitle}
            content={block.content}
            metadata={block.metadata}
          />
        </div>
      ))}
      <div
        data-message
        data-message-id={message.id}
        data-role="user"
        data-status={message.status}
        data-testid={`user-message-${message.id}`}
        className="flex max-w-[85%] flex-col gap-1 whitespace-pre-wrap break-words rounded-2xl bg-surface-page px-6 py-3 text-base leading-[1.5] text-foreground"
      >
        {otherContent.map((block, i) =>
          renderContentBlock(block, i, message, { message, ...props })
        )}
      </div>
      {/* Shell execution results render below the user bubble */}
      {shellExecutionBlocks.map((block, i) => (
        <div key={`shell-${i}`} className="w-full max-w-[85%]">
          <ShellExecutionWidget
            command={block.command}
            stdout={block.stdout}
            stderr={block.stderr}
            exitCode={block.exitCode}
            durationMs={block.durationMs}
          />
        </div>
      ))}
      <MessageActions message={message} onRewind={onRewind} onFork={onFork} role="user" hoverClass="group-hover/user-msg:opacity-100" />
    </div>
  );
});

const AssistantMessage = memo(function AssistantMessage({ message, onRewind, onFork, ...props }: MessageProps) {
  const segments = useMemo(
    () => segmentContentBlocks(message.content, message.toolUses),
    [message.content, message.toolUses]
  );

  return (
    <div
      data-slot="message"
      data-message
      data-message-id={message.id}
      data-role="assistant"
      data-status={message.status}
      data-streaming={message.isStreaming}
      data-thinking={message.isThinking}
      data-assistant-message
      data-testid={`assistant-message-${message.id}`}
      className="group/assistant-msg flex flex-col gap-1 text-base leading-[1.5]"
      // Match ProcessingIndicator height during streaming to prevent layout shift
      style={message.isStreaming ? { minHeight: PROCESSING_INDICATOR_HEIGHT } : undefined}
    >
      {message.error && <ErrorBanner error={message.error} />}
      {message.isThinking && message.content.length === 0 && (
        <div className="text-[13px] text-muted-foreground" data-preparing-indicator>
          Thinking...
        </div>
      )}
      {segments.map((segment) => {
        if (segment.kind === 'exploration_group') {
          return (
            <div key={`explore-${segment.startIndex}`} className="my-1">
              <ExplorationPanel tools={segment.toolUses} />
            </div>
          );
        }
        return renderContentBlock(
          segment.block,
          segment.index,
          message,
          { message, onRewind, ...props }
        );
      })}
      {!message.isStreaming && message.status === 'complete' && (
        <MessageActions message={message} onRewind={onRewind} onFork={onFork} role="assistant" hoverClass="group-hover/assistant-msg:opacity-100" />
      )}
    </div>
  );
});

const SystemMessage = memo(function SystemMessage({ message, ...props }: MessageProps) {
  return (
    <div
      data-slot="message"
      data-message
      data-message-id={message.id}
      data-role="system"
      data-testid={`system-message-${message.id}`}
      className="flex flex-col gap-1"
    >
      {message.content.map((block, i) =>
        renderContentBlock(block, i, message, { message, ...props })
      )}
    </div>
  );
});

// ─── Main Component ────────────────────────────────────────────────────────

export const ChatMessage = memo(function ChatMessage(props: MessageProps) {
  const { message } = props;

  const Component = useMemo(() => {
    switch (message.role) {
      case 'user':
        return UserMessage;
      case 'assistant':
        return AssistantMessage;
      case 'system':
        return SystemMessage;
    }
  }, [message.role]);

  return <Component {...props} />;
});
