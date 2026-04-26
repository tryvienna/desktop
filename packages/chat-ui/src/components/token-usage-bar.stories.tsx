// TokenUsageBar Stories
//
// Subtle, single-line indicator below the chat input showing token usage:
// - Current context size ("in") from the latest turn
// - Accumulated output token count ("out")
// - Cache efficiency percentage (from latest turn, only when > 0)
// - Context window remaining with a thin color-coded progress bar
//
// Props:
//   contextSize: number         — current context window utilization in tokens
//   maxContext: number           — maximum context window size in tokens
//   outputTokens?: number       — accumulated output tokens (default: 0)
//   cacheHitRate?: number       — cache hit rate 0-100 (optional)
//   costUsd?: number | null     — accumulated cost in USD (optional)
//   className?: string          — additional CSS class
//
// Visibility: Hidden when both contextSize and outputTokens are 0.
//
// Progress bar color thresholds:
//   - Green (bg-green-500): fillPercent <= 50
//   - Amber (bg-amber-500): 50 < fillPercent <= 80
//   - Red   (bg-red-500):   fillPercent > 80
//
// Token formatting (formatTokens):
//   - >= 100K: "150K" (no decimal)
//   - >= 1K:   "1.5K" (one decimal)
//   - < 1K:    "999" (with locale formatting)

import type { Meta, StoryObj } from '@storybook/react';
import { TokenUsageBar } from './token-usage-bar';

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

const meta: Meta<typeof TokenUsageBar> = {
  title: 'Input/token-usage-bar',
  component: TokenUsageBar,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="max-w-2xl p-6 bg-surface-sunken">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    contextSize: {
      control: { type: 'range', min: 0, max: 200000, step: 1000 },
      description: 'Current context window utilization in tokens',
    },
    maxContext: {
      control: { type: 'range', min: 0, max: 1000000, step: 10000 },
      description: 'Maximum context window size in tokens',
    },
    outputTokens: {
      control: { type: 'range', min: 0, max: 100000, step: 500 },
      description: 'Accumulated output tokens',
    },
    cacheHitRate: {
      control: { type: 'range', min: 0, max: 100, step: 1 },
      description: 'Cache hit rate as percentage 0-100',
    },
    costUsd: {
      control: { type: 'range', min: 0, max: 10, step: 0.01 },
      description: 'Accumulated cost in USD',
    },
  },
};

export default meta;
type Story = StoryObj<typeof TokenUsageBar>;

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

/**
 * Low usage — 20K of 200K context used (10%).
 *
 * Progress bar is green. Plenty of context window remaining.
 * Shows "20.0K in", output tokens, and "180K left".
 */
export const LowUsage: Story = {
  args: {
    contextSize: 20_000,
    maxContext: 200_000,
    outputTokens: 3_500,
  },
};

/**
 * Medium usage — 120K of 200K context used (60%).
 *
 * Progress bar transitions to amber when fill > 50%.
 * Shows "120K in" and "80.0K left".
 */
export const MediumUsage: Story = {
  args: {
    contextSize: 120_000,
    maxContext: 200_000,
    outputTokens: 15_000,
  },
};

/**
 * High usage — 180K of 200K context used (90%).
 *
 * Progress bar is red when fill > 80%.
 * Shows "180K in" and "20.0K left".
 * This is a warning state indicating the context window is nearly full.
 */
export const HighUsage: Story = {
  args: {
    contextSize: 180_000,
    maxContext: 200_000,
    outputTokens: 42_000,
  },
};

/**
 * With cache efficiency displayed.
 *
 * When cacheHitRate > 0, a "N% cached" segment appears between
 * the output count and the remaining indicator. Cache efficiency
 * indicates how much of the input was served from KV cache.
 */
export const WithCache: Story = {
  args: {
    contextSize: 85_000,
    maxContext: 200_000,
    outputTokens: 12_000,
    cacheHitRate: 73,
  },
  parameters: {
    docs: {
      description: {
        story: `Cache efficiency is only shown when cacheHitRate > 0.
        It represents the percentage of input tokens served from KV cache
        on the latest turn. Higher values mean faster responses.

        Format: "73% cached" — rounded to nearest integer.`,
      },
    },
  },
};

/**
 * With output tokens shown.
 *
 * Output tokens accumulate across the conversation and are always
 * displayed. Uses the same formatTokens utility as context size.
 */
export const WithOutput: Story = {
  args: {
    contextSize: 45_000,
    maxContext: 200_000,
    outputTokens: 67_500,
  },
};

/**
 * Empty state — zero usage.
 *
 * When both contextSize and outputTokens are 0, the component
 * returns null (renders nothing). This prevents showing a misleading
 * bar for new conversations with no API calls yet.
 */
export const Empty: Story = {
  args: {
    contextSize: 0,
    maxContext: 200_000,
    outputTokens: 0,
  },
  parameters: {
    docs: {
      description: {
        story: `When contextSize === 0 AND outputTokens === 0, the component
        returns null. Nothing is rendered. This is intentional: the bar should
        only appear once tokens have been used.

        **Note**: This story renders an empty container — the TokenUsageBar
        itself is not visible.`,
      },
    },
  },
};

/**
 * Maxed out context — 200K of 200K.
 *
 * Progress bar is fully red at 100%. "0 left" is displayed.
 * This represents a conversation that has hit the context window limit.
 * The model may need to summarize or truncate earlier messages.
 */
export const Full: Story = {
  args: {
    contextSize: 200_000,
    maxContext: 200_000,
    outputTokens: 95_000,
    cacheHitRate: 42,
  },
  parameters: {
    docs: {
      description: {
        story: `Fully saturated context window. The progress bar is 100% red.
        "0 left" is displayed. At this point the model may need to
        summarize or drop earlier messages to continue the conversation.

        All display segments are visible:
        - "200K in" — context utilization
        - "95.0K out" — accumulated output
        - "42% cached" — cache efficiency
        - Full red bar + "0 left" — no remaining context`,
      },
    },
  },
};

/**
 * With cost displayed.
 *
 * When costUsd > 0, a "$X.XX" segment appears at the end.
 * Costs < $0.01 are shown as "<0.01".
 */
export const WithCost: Story = {
  args: {
    contextSize: 85_000,
    maxContext: 200_000,
    outputTokens: 25_000,
    cacheHitRate: 65,
    costUsd: 0.45,
  },
};

/**
 * Tiny cost — shows "<0.01" for sub-cent costs.
 */
export const TinyCost: Story = {
  args: {
    contextSize: 5_000,
    maxContext: 200_000,
    outputTokens: 500,
    costUsd: 0.005,
  },
};

/**
 * Collapsible — click to toggle between icon chip and full stats.
 *
 * When collapsed: shows a gauge icon colored by fill severity + cost.
 * When expanded: shows the full stats bar. State persists to localStorage.
 */
export const Collapsible: Story = {
  args: {
    contextSize: 85_000,
    maxContext: 200_000,
    outputTokens: 25_000,
    cacheHitRate: 65,
    costUsd: 0.45,
    collapsible: true,
  },
};

/**
 * Collapsible at high usage — gauge icon turns red.
 */
export const CollapsibleHighUsage: Story = {
  args: {
    contextSize: 180_000,
    maxContext: 200_000,
    outputTokens: 42_000,
    costUsd: 1.23,
    collapsible: true,
  },
};
