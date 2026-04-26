/**
 * Chat Spacing Tokens
 *
 * Chat-specific spacing constants based on 8pt grid.
 *
 * @module chat-ui/tokens/spacing
 */

/** Chat-specific spacing in pixels */
export const CHAT_SPACING = {
  // ─── Message Grouping ───────────────────────────────────────────────────────
  /** Gap between consecutive messages from same author */
  MESSAGE_GAP_SAME_AUTHOR: 16,
  /** Gap when author changes */
  MESSAGE_GAP_DIFF_AUTHOR: 32,
  /** Gap after time break (>5min) */
  MESSAGE_GAP_TIME_BREAK: 40,

  // ─── Within Messages ────────────────────────────────────────────────────────
  /** Horizontal padding inside messages */
  MESSAGE_PADDING_X: 16,
  /** Vertical padding inside messages */
  MESSAGE_PADDING_Y: 12,
  /** Gap between content blocks (text, code, widgets) */
  CONTENT_GAP: 8,

  // ─── Tool/Widget Cards ──────────────────────────────────────────────────────
  /** Internal padding for cards (consistent across all card types) */
  CARD_PADDING: 14,
  /** Gap between adjacent cards */
  CARD_GAP: 12,
  /** Margin above cards from preceding text */
  CARD_MARGIN_TOP: 8,
  /** Margin below cards before following text */
  CARD_MARGIN_BOTTOM: 8,

  // ─── Entity Chips (Inline) ──────────────────────────────────────────────────
  /** Horizontal margin around chips */
  CHIP_MARGIN_X: 2,
  /** Horizontal padding inside chips */
  CHIP_PADDING_X: 8,
  /** Vertical padding inside chips */
  CHIP_PADDING_Y: 2,

  // ─── Input Area ─────────────────────────────────────────────────────────────
  /** Padding around input area */
  INPUT_PADDING: 16,
  /** Gap between input and action buttons */
  INPUT_GAP: 12,

  // ─── Tool Output Specific ───────────────────────────────────────────────────
  /** Header padding (tool name, status) */
  TOOL_HEADER_PADDING_X: 12,
  TOOL_HEADER_PADDING_Y: 8,
  /** Content area padding */
  TOOL_CONTENT_PADDING: 12,
  /** Gap between header elements */
  TOOL_HEADER_GAP: 8,
  /** Permission actions padding */
  PERMISSION_PADDING: 12,
} as const;

export type ChatSpacingKey = keyof typeof CHAT_SPACING;
