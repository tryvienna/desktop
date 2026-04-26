/**
 * LinkedUserMessage — User message with image attachments connected via branching connector.
 *
 * When a user sends images, this component renders image preview card(s) above
 * the text bubble, with a thin SVG connector that branches to each card and the
 * message bubble — a vertical spine on the right with horizontal taps at each element's
 * vertical center.
 */

import { memo, useRef, useState, useLayoutEffect } from 'react';

import { ImageAttachmentWidget } from './image-attachment-widget';
import type { ContentBlock, ImageAttachmentBlock } from '../types/messages';

// ─── Constants ──────────────────────────────────────────────────────────────

const CONNECTOR_WIDTH = 20;
const CONNECTOR_HORIZONTAL_EXTENT = 12;
const CONNECTOR_CORNER_RADIUS = 6;
const CONNECTOR_GAP = 6;
const DEFAULT_GAP = 8;

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Generates a branching connector path: a vertical spine at x=h with
 * horizontal branches going left to each attachment point.
 *
 * For 2+ points, the path zig-zags: right from first point, down spine,
 * left to second point, (move back to spine), down, left to third, etc.
 */
function generateBranchingPath(points: number[]): string {
  if (points.length < 2) return '';

  const r = CONNECTOR_CORNER_RADIUS;
  const h = CONNECTOR_HORIZONTAL_EXTENT;
  let path = '';

  // First point: horizontal right, curve into spine
  path += `M 0 ${points[0]} L ${h - r} ${points[0]} Q ${h} ${points[0]}, ${h} ${points[0] + r}`;

  // Each subsequent point: vertical down spine, curve left, horizontal to content
  for (let i = 1; i < points.length; i++) {
    if (i > 1) {
      // Move back to spine at previous branch point to continue downward
      path += ` M ${h} ${points[i - 1]}`;
    }
    path += ` L ${h} ${points[i] - r} Q ${h} ${points[i]}, ${h - r} ${points[i]} L 0 ${points[i]}`;
  }

  return path;
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface LinkedUserMessageProps {
  imageAttachmentBlocks: ImageAttachmentBlock[];
  otherContent: ContentBlock[];
  message: import('../types/messages').Message;
  renderContentBlock: (
    block: ContentBlock,
    index: number,
  ) => React.ReactNode;
}

// ─── Component ──────────────────────────────────────────────────────────────

export const LinkedUserMessage = memo(function LinkedUserMessage({
  imageAttachmentBlocks,
  otherContent,
  message,
  renderContentBlock,
}: LinkedUserMessageProps) {
  const cardsRef = useRef<HTMLDivElement>(null);
  const msgRef = useRef<HTMLDivElement>(null);
  const [cardPositions, setCardPositions] = useState<Array<{ top: number; height: number }>>([]);
  const [cardsHeight, setCardsHeight] = useState(60);
  const [msgHeight, setMsgHeight] = useState(40);

  useLayoutEffect(() => {
    if (cardsRef.current) {
      const children = Array.from(cardsRef.current.children) as HTMLElement[];
      setCardPositions(
        children.map((child) => ({
          top: child.offsetTop,
          height: child.offsetHeight,
        })),
      );
      setCardsHeight(cardsRef.current.offsetHeight);
    }
    if (msgRef.current) {
      setMsgHeight(msgRef.current.offsetHeight);
    }
  }, [imageAttachmentBlocks, otherContent]);

  const gap = DEFAULT_GAP;
  const hasTextContent = otherContent.length > 0;

  // Build attachment points: vertical center of each image card + message bubble
  const attachPoints: number[] = cardPositions.map((pos) => pos.top + pos.height / 2);
  if (hasTextContent) {
    attachPoints.push(cardsHeight + gap + msgHeight / 2);
  }

  const totalHeight = hasTextContent ? cardsHeight + gap + msgHeight : cardsHeight;
  const needsConnector = attachPoints.length >= 2;

  return (
    <div data-slot="message" data-user-message className="flex flex-col items-end">
      <div className="flex max-w-[85%]">
        {/* Content column */}
        <div className="flex min-w-0 max-w-[450px] flex-1 flex-col items-end">
          {/* Image attachment cards */}
          <div ref={cardsRef} className="flex w-full flex-col items-end gap-1">
            {imageAttachmentBlocks.map((block, index) => (
              <ImageAttachmentWidget
                key={`img-${index}`}
                name={block.name}
                mimeType={block.mimeType}
                size={block.size}
                previewUrl={block.previewUrl}
              />
            ))}
          </div>

          {/* Gap */}
          {hasTextContent && <div style={{ height: gap }} />}

          {/* User message bubble */}
          {hasTextContent && (
            <div
              ref={msgRef}
              data-message
              data-message-id={message.id}
              data-role="user"
              data-status={message.status}
              className="max-w-full whitespace-pre-wrap break-words rounded-2xl bg-surface-page px-6 py-3 text-base leading-[1.5] text-foreground"
            >
              {otherContent.map((block, i) => renderContentBlock(block, i))}
            </div>
          )}
        </div>

        {/* Branching connector SVG */}
        {needsConnector && (
          <svg
            width={CONNECTOR_WIDTH}
            height={totalHeight}
            style={{ marginLeft: CONNECTOR_GAP, flexShrink: 0, overflow: 'visible' }}
            aria-hidden="true"
          >
            <path
              d={generateBranchingPath(attachPoints)}
              stroke="var(--border-muted)"
              strokeWidth={1.5}
              fill="none"
              opacity={0.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
    </div>
  );
});
