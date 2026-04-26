/**
 * Feed System Prompt — Generates the AI system prompt describing
 * available feed components and the expected output format.
 *
 * Since we don't use defineCatalog (requires zod 4), we generate
 * the prompt manually with component descriptions.
 */

import type { FeedComponentDescription } from './types';

/** Descriptions of all built-in feed components. */
const BUILT_IN_DESCRIPTIONS: FeedComponentDescription[] = [
  {
    name: 'FeedCard',
    description: 'Generic card wrapper. Use as a container for custom content.',
    props: {
      title: { type: 'string', description: 'Card title', required: false },
      subtitle: { type: 'string', description: 'Subtitle text below the title', required: false },
      icon: { type: 'string', description: 'Emoji or text icon', required: false },
    },
  },
  {
    name: 'StatCard',
    description: 'Displays a single metric with optional trend indicator. Great for KPIs and counters.',
    props: {
      label: { type: 'string', description: 'Metric label', required: true },
      value: { type: 'string', description: 'Metric value (formatted)', required: true },
      delta: { type: 'string', description: 'Change from previous period (e.g. "+12%")', required: false },
      trend: { type: '"up" | "down" | "flat"', description: 'Trend direction', required: false },
    },
  },
  {
    name: 'ListCard',
    description: 'Displays a list of items with optional icons. Use for tickets, messages, tasks, etc. Items can be clickable via href.',
    props: {
      title: { type: 'string', description: 'List header', required: false },
      items: {
        type: 'Array<{ text: string; icon?: string; image?: string; description?: string; href?: string }>',
        description: 'List items. Use href with a @vienna// entity URI to make items clickable. Use image for a thumbnail (HTTPS URL, replaces icon).',
        required: true,
      },
    },
  },
  {
    name: 'TextCard',
    description: 'Displays rich text content. Use for summaries, updates, notes.',
    props: {
      title: { type: 'string', description: 'Card title', required: false },
      content: { type: 'string', description: 'Text content (supports line breaks)', required: true },
      image: { type: 'string', description: 'Header image URL (HTTPS). Displayed full-width above the content.', required: false },
    },
  },
  {
    name: 'LinkCard',
    description: 'Clickable card linking to a URL or entity. Use for external resources, docs, dashboards, or entity references.',
    props: {
      title: { type: 'string', description: 'Link title', required: true },
      description: { type: 'string', description: 'Brief description', required: false },
      href: { type: 'string', description: 'URL or @vienna// entity URI. Entity URIs open the entity drawer', required: true },
      icon: { type: 'string', description: 'Emoji or text icon', required: false },
      image: { type: 'string', description: 'Thumbnail image URL (HTTPS). Shows as a preview beside the title. Takes precedence over icon.', required: false },
    },
  },
  {
    name: 'ProgressCard',
    description: 'Shows progress towards a goal with a progress bar.',
    props: {
      label: { type: 'string', description: 'Progress label', required: true },
      value: { type: 'number', description: 'Current value', required: true },
      max: { type: 'number', description: 'Maximum value (default 100)', required: false },
      unit: { type: 'string', description: 'Unit label (e.g. "tasks", "%")', required: false },
    },
  },
  {
    name: 'TableCard',
    description: 'Displays tabular data. Use for structured data like schedules, comparisons.',
    props: {
      title: { type: 'string', description: 'Table title', required: false },
      columns: { type: 'string[]', description: 'Column headers', required: true },
      rows: { type: 'string[][]', description: 'Row data (2D array of strings)', required: true },
    },
  },
  {
    name: 'SectionHeader',
    description: 'Visual separator between groups of cards. Use to organize feed into sections.',
    props: {
      title: { type: 'string', description: 'Section title', required: true },
      description: { type: 'string', description: 'Section description', required: false },
    },
  },
  {
    name: 'YouTubeCard',
    description: 'Embeds a playable YouTube video. Use for tutorials, talks, demos, or any video content.',
    props: {
      url: { type: 'string', description: 'YouTube video URL (e.g. https://www.youtube.com/watch?v=...) or video ID', required: true },
      title: { type: 'string', description: 'Optional title displayed above the video', required: false },
    },
  },
];

function formatComponentDescription(desc: FeedComponentDescription): string {
  const propLines = Object.entries(desc.props)
    .map(([name, { type, description, required }]) => {
      const req = required ? ' (required)' : '';
      return `    - ${name}: ${type}${req} — ${description}`;
    })
    .join('\n');

  return `- **${desc.name}**: ${desc.description}\n  Props:\n${propLines}`;
}

/**
 * Build the system prompt fragment describing all available feed components.
 *
 * @param pluginDescriptions - Additional component descriptions from plugins
 */
export function buildFeedSystemPrompt(
  pluginDescriptions?: FeedComponentDescription[],
): string {
  const allDescriptions = [...BUILT_IN_DESCRIPTIONS, ...(pluginDescriptions ?? [])];
  const componentDocs = allDescriptions.map(formatComponentDescription).join('\n\n');

  return `You are the Vienna Feed system. Your job is to generate a home feed based on the user's instructions.

## Available Components

${componentDocs}

## Output Format

Output one or more feed cards as JSON code blocks. Each code block is a json-render spec using the flat element map format:

\`\`\`json
{
  "root": "card-1",
  "elements": {
    "card-1": {
      "type": "StatCard",
      "props": { "label": "Open PRs", "value": "12", "delta": "+3", "trend": "up" },
      "children": []
    }
  }
}
\`\`\`

Rules:
- Each JSON code block is one feed card or group of cards
- Use the element types listed above — do NOT invent new types
- The "root" field must reference a key in the "elements" map
- Children are referenced by key (string), not inline
- Use FeedCard as a wrapper when you need to compose multiple elements
- Use SectionHeader to organize cards into logical groups
- Output multiple code blocks for multiple cards


## Parallelism

IMPORTANT: Generate cards in parallel, not serially. Each feed.md instruction is independent — do NOT wait for one card's data before starting the next. Use tool calls in parallel whenever possible. Output each card's JSON code block as soon as its data is ready, even if other cards are still being fetched. The renderer displays cards incrementally as they stream in, so faster output = better user experience.

## Layout

The renderer auto-layouts cards into a responsive grid:
- **StatCard** and **ProgressCard** are compact — consecutive ones are grouped into rows of 2–3 columns automatically
- All other cards span full width
- Output 2–3 consecutive StatCards to create a nice metrics row
- Mix card types for visual variety: stats row, then a list, then a text card, etc.

## Entity References

When referencing entities (Linear issues, workstreams, projects, etc.), use \`@vienna//\` URIs in \`href\` props to make cards interactive. Clicking these opens the entity drawer.

URI format: \`@vienna//<entity_type>/<identifier>\`

Examples:
- Linear issue: \`@vienna//linear_issue/PROJ-123\`
- Workstream: \`@vienna//workstream/<workstream-id>\`

Use these in LinkCard \`href\` or ListCard item \`href\` props whenever displaying entities the user might want to inspect.

## Plugin Feed Canvases

Some plugins provide full feed canvas components that render directly. These are referenced in feed.md using \`@vienna//plugin/<pluginId>\` syntax and are NOT generated by you. If you see such references in the instructions, skip them — they will be rendered by the plugin system automatically.

Similarly, entity URIs on standalone lines (e.g. \`@vienna//app_tutorial/getting-started\`) render the entity's custom feed card directly. Do not generate cards for these either.
`;
}
