---
command-palette-label: The Feed
command-palette-description: Your personalized home feed powered by AI
---

# The Feed

The **feed** is your personalized home screen in Vienna. Write plain-English instructions in a `feed.md` file, and AI turns them into live, interactive cards — stats, lists, links, progress bars, tables, and more.

<!-- TODO: Replace placeholder video ID (a2wERrLIYmI) with actual feed video -->
<iframe width="560" height="315" src="https://www.youtube.com/embed/a2wERrLIYmI" title="The Feed overview" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="max-width: 100%; aspect-ratio: 16/9; margin: 1.5em 0;"></iframe>

## How it works

1. **Write instructions** — Create a `feed.md` file with natural language prompts. Each bullet or paragraph becomes one or more cards.
2. **AI generates cards** — Vienna sends your instructions to a dedicated "Home Feed" workstream, which calls tools, fetches data, and outputs structured card specs.
3. **Cards render on your home screen** — Cards appear incrementally as the AI streams them. Stats, lists, links, and more display in an auto-laid-out grid.

Here's a simple `feed.md`:

```
- Show my open pull requests across all repos
- Summarize unread Slack threads from #engineering
- Show a motivational quote for the day
```

Each instruction is independent. The AI processes them in parallel, so your feed loads fast even with many cards.

## Writing effective instructions

Write each instruction as a bullet point or short paragraph. Be specific about what data you want and how you'd like it displayed:

```
- Show my top 5 Linear issues by priority as a list, with links to each
- Display a stat card for how many PRs I merged this week, with trend vs last week
- Show my upcoming calendar events for today in a table with time and title columns
- Show a progress bar for the Q2 OKR "ship feed feature", currently at 70%
```

**Tips for good instructions:**

- **Be specific about the card type** — "show as a stat card" or "display as a list" helps the AI pick the right component
- **Mention links** — "with links to each issue" makes cards interactive
- **Include context** — "from #engineering channel" or "across all repos" narrows the data
- **Ask for trends** — "with trend vs last week" adds delta indicators to stat cards
- **Reference entities** — Mentioning Linear issues, workstreams, or projects lets the AI create clickable cards that open the entity drawer

## Card types

The AI can generate these built-in card types:

| Card | Best for | Example |
|------|----------|---------|
| **Stat** | A single number with optional trend arrow | "12 open PRs (+3 this week)" |
| **List** | Items with icons, descriptions, and links | Issue lists, message summaries |
| **Text** | Rich text content, summaries, notes | Daily briefing, release notes |
| **Link** | A clickable card pointing to a URL or entity | Dashboard links, doc shortcuts |
| **Progress** | A labeled progress bar toward a goal | OKR tracking, sprint completion |
| **Table** | Structured rows and columns | Schedules, comparisons, metrics |
| **Section Header** | Visual separator between groups of cards | "Morning briefing", "Project status" |

**Layout:** Stat and Progress cards are compact — consecutive ones automatically form rows of 2–3 columns. All other cards span full width. Mix card types for visual variety.

**Images:** List items, Link cards, and Text cards support thumbnail images from HTTPS URLs. Include image URLs in your instructions if you want visual cards (e.g., "show album art for the currently playing track").

### Plugin feed canvases

Plugins can register **feed canvases** — custom cards that appear alongside the AI-generated cards on your home feed. Unlike AI cards (which are generated from `feed.md` instructions), plugin cards render their own React UI with live data from external services.

For example, the **Linear** plugin shows a filterable list of your assigned issues, and the **Asana** plugin shows your tasks — both with the ability to select items and launch agent workstreams directly from the card.

Plugin feed canvases:
- Appear automatically when the plugin is installed and configured
- Have their own auth checks — if not configured, they show a setup prompt
- Support filtering, selection, and interactive actions
- Can launch workstreams using `@tryvienna/sdk/graphql` operations

To build a feed canvas for your own plugin, see the [Feed canvas](/guide/plugin-development#feed-canvas) section of the plugin development guide.

## Interactive cards

Cards can be interactive. Link cards and list items support clickable links:

- **Entity links** — Clicking opens the entity drawer. Works with Linear issues, workstreams, projects, and more. The AI uses `@vienna//` URIs automatically when referencing entities.
- **External URLs** — Clicking opens the link in your default browser.

You don't need to configure this — just mention entities or URLs in your instructions and the AI will make the right cards clickable.

## Feed tiers

Feed instructions can live in three places. All are merged together, with later tiers taking higher priority:

### 1. Profile tier (lowest priority)
**Location:** `~/.vienna/profiles/<name>/feed.md`

Part of your content profile. If you publish or share a profile, the feed.md travels with it. Use this for baseline instructions that define the "character" of a profile's feed.

### 2. Global tier
**Location:** `<Vienna data>/feed.md`

Your personal feed instructions. Always applies regardless of which project is active. Use this for things you always want to see: calendar, messages, daily quotes, cross-project metrics.

### 3. Project tier (highest priority)
**Location:** `<project>/.vienna/feed.md`

Per-project instructions. Only applies when that project is active. Use this for project-specific cards: sprint progress, repo PRs, project-specific dashboards.

**How merging works:** All tiers are concatenated with section headers and sent to the AI as a single prompt. Because project instructions appear last, they carry the strongest signal — the AI treats them as the most specific and relevant context.

**When no project is open**, only the profile and global tiers apply.

## Editing feed.md

Click **Edit** in the feed header to open a dropdown listing all feed.md tiers. Each entry shows:

- **Profile** — your active content profile's feed.md
- **Global** — your personal global feed.md
- **Project: \<name\>** — per-project feed.md (one per project directory)

Click any entry to open it in the built-in editor. Files marked "new" don't exist yet and will be created when you save.

**Save with CMD+S** — saves the file and automatically refreshes the feed so you see your changes immediately.

## Caching and refresh

- **Feed content is cached for 6 hours.** When you open Vienna, the cached feed loads instantly without calling the AI.
- **After 6 hours,** the feed automatically refreshes on next load.
- **Manual refresh** — Click the **Refresh** button in the feed header to regenerate at any time. Your existing cards stay visible (slightly dimmed) while the new feed streams in.
- **Editing feed.md** triggers an automatic refresh.

## Enabling and disabling

The small **toggle switch** next to "Your feed" lets you hide the feed without deleting your feed.md files.

- **Off** — The feed section collapses to just the label and toggle. No AI calls are made, and no cards are generated.
- **On** — The feed loads normally, using cache or triggering a refresh as needed.

This setting persists across sessions. Turn the feed off if you want a minimal home screen but plan to use the feed again later.

## Under the hood

Each project gets a dedicated **Home Feed workstream** (visible in the sidebar). This workstream:

- Uses the **Sonnet** model for fast, cost-efficient card generation
- Receives the merged feed.md instructions as a single message
- Has access to all the same tools as a regular workstream (search, APIs, etc.)
- Generates cards in parallel for speed
- Stores its response so the feed can be cached and displayed instantly on reload

You can open the Home Feed workstream in the sidebar to see the raw AI output, debug issues, or understand how your instructions were interpreted.

## Troubleshooting

**Feed shows "Set up your feed"** — No feed.md file exists (or all are empty). Click "Create feed.md" to get started.

**Cards look wrong or missing** — Edit your feed.md to be more specific. The AI interprets your instructions, so clearer instructions produce better cards.

**Feed is slow to load** — The first load after 6 hours (or after a refresh) requires an AI call, which takes a few seconds. Subsequent loads use the cache and are instant.

**Feed not updating after saving feed.md** — Save triggers an automatic refresh. If it doesn't appear to update, check that the file saved successfully (the editor footer shows "Saved" vs "Unsaved changes").
