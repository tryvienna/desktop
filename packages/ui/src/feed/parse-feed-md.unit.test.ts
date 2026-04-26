import { describe, it, expect } from 'vitest';
import { parseFeedMd, extractPromptText, extractDirectItems } from './parse-feed-md';

describe('parseFeedMd', () => {
  it('returns empty segments for empty content', () => {
    expect(parseFeedMd('')).toEqual([]);
  });

  it('returns empty segments for whitespace-only content', () => {
    expect(parseFeedMd('   \n  \n  ')).toEqual([]);
  });

  it('parses plain text as a single prompt segment', () => {
    const segments = parseFeedMd('Show me my open PRs');
    expect(segments).toHaveLength(1);
    expect(segments[0].type).toBe('prompt');
    expect((segments[0] as { text: string }).text).toBe('Show me my open PRs');
  });

  it('parses plugin reference as plugin-feed segment', () => {
    const segments = parseFeedMd('@vienna//plugin/weather');
    expect(segments).toHaveLength(1);
    expect(segments[0].type).toBe('plugin-feed');
    expect((segments[0] as { pluginId: string }).pluginId).toBe('weather');
  });

  it('parses plugin reference with query params', () => {
    const segments = parseFeedMd('@vienna//plugin/weather?units=metric');
    expect(segments).toHaveLength(1);
    expect(segments[0].type).toBe('plugin-feed');
    expect((segments[0] as { props: Record<string, unknown> }).props).toEqual({ units: 'metric' });
  });

  it('parses entity reference as entity-feed segment', () => {
    const segments = parseFeedMd('@vienna//github_pr/123');
    expect(segments).toHaveLength(1);
    expect(segments[0].type).toBe('entity-feed');
    expect((segments[0] as { entityType: string }).entityType).toBe('github_pr');
  });

  it('parses mixed content preserving order', () => {
    const content = `Show me stats
@vienna//plugin/weather
Display my calendar`;
    const segments = parseFeedMd(content);
    expect(segments).toHaveLength(3);
    expect(segments[0].type).toBe('prompt');
    expect(segments[1].type).toBe('plugin-feed');
    expect(segments[2].type).toBe('prompt');
  });

  it('parses widget reference as widget-feed segment', () => {
    const segments = parseFeedMd('@vienna//widget/workstreams');
    expect(segments).toHaveLength(1);
    expect(segments[0].type).toBe('widget-feed');
    expect((segments[0] as { widgetId: string }).widgetId).toBe('workstreams');
  });

  it('parses widget reference with query params', () => {
    const segments = parseFeedMd('@vienna//widget/workstreams?sections=needs_action,completed');
    expect(segments).toHaveLength(1);
    expect(segments[0].type).toBe('widget-feed');
    expect((segments[0] as { widgetId: string }).widgetId).toBe('workstreams');
    expect((segments[0] as { props: Record<string, unknown> }).props).toEqual({ sections: 'needs_action,completed' });
  });

  it('parses widget id with hyphens', () => {
    const segments = parseFeedMd('@vienna//widget/my-cool-widget');
    expect(segments).toHaveLength(1);
    expect(segments[0].type).toBe('widget-feed');
    expect((segments[0] as { widgetId: string }).widgetId).toBe('my-cool-widget');
  });

  it('parses mixed content with widgets preserving order', () => {
    const content = `Show me stats
@vienna//widget/workstreams
@vienna//plugin/weather
Display my calendar`;
    const segments = parseFeedMd(content);
    expect(segments).toHaveLength(4);
    expect(segments[0].type).toBe('prompt');
    expect(segments[1].type).toBe('widget-feed');
    expect(segments[2].type).toBe('plugin-feed');
    expect(segments[3].type).toBe('prompt');
  });

  it('parses multiple plugin references without prompt text', () => {
    const content = `@vienna//plugin/weather
@vienna//plugin/vienna_tutorials`;
    const segments = parseFeedMd(content);
    expect(segments).toHaveLength(2);
    expect(segments.every((s) => s.type === 'plugin-feed')).toBe(true);
  });

  it('parses valid inline json-render spec', () => {
    const spec = JSON.stringify({ root: 'TextCard', elements: { TextCard: { type: 'TextCard', props: { text: 'hello' } } } });
    const content = '```json\n' + spec + '\n```';
    const segments = parseFeedMd(content);
    expect(segments).toHaveLength(1);
    expect(segments[0].type).toBe('inline-spec');
  });

  it('treats invalid JSON fenced block as prompt text', () => {
    const content = '```json\nnot valid json\n```';
    const segments = parseFeedMd(content);
    expect(segments).toHaveLength(1);
    expect(segments[0].type).toBe('prompt');
  });
});

describe('extractPromptText', () => {
  it('returns empty string for empty segments', () => {
    expect(extractPromptText([])).toBe('');
  });

  it('returns empty string for plugin-only segments', () => {
    const segments = parseFeedMd('@vienna//plugin/weather\n@vienna//plugin/vienna_tutorials');
    expect(extractPromptText(segments).trim()).toBe('');
  });

  it('returns empty string for entity-only segments', () => {
    const segments = parseFeedMd('@vienna//github_pr/123');
    expect(extractPromptText(segments).trim()).toBe('');
  });

  it('returns prompt text excluding plugin references', () => {
    const segments = parseFeedMd('Show me stats\n@vienna//plugin/weather');
    expect(extractPromptText(segments)).toBe('Show me stats');
  });

  it('joins multiple prompt segments with double newline', () => {
    const content = `Show me stats
@vienna//plugin/weather
Display my calendar`;
    const segments = parseFeedMd(content);
    expect(extractPromptText(segments)).toBe('Show me stats\n\nDisplay my calendar');
  });
});

describe('extractDirectItems', () => {
  it('returns empty array for prompt-only segments', () => {
    const segments = parseFeedMd('Show me my PRs');
    expect(extractDirectItems(segments)).toHaveLength(0);
  });

  it('extracts plugin feed items', () => {
    const segments = parseFeedMd('@vienna//plugin/weather');
    const items = extractDirectItems(segments);
    expect(items).toHaveLength(1);
    expect(items[0].item.kind).toBe('plugin');
  });

  it('extracts entity feed items', () => {
    const segments = parseFeedMd('@vienna//github_pr/123');
    const items = extractDirectItems(segments);
    expect(items).toHaveLength(1);
    expect(items[0].item.kind).toBe('entity');
  });

  it('extracts widget feed items', () => {
    const segments = parseFeedMd('@vienna//widget/workstreams?sections=needs_action');
    const items = extractDirectItems(segments);
    expect(items).toHaveLength(1);
    expect(items[0].item.kind).toBe('widget');
    if (items[0].item.kind === 'widget') {
      expect(items[0].item.widgetId).toBe('workstreams');
      expect(items[0].item.props).toEqual({ sections: 'needs_action' });
    }
  });

  it('extracts all direct items from mixed content', () => {
    const content = `Show stats
@vienna//plugin/weather
@vienna//widget/workstreams
@vienna//github_pr/123
More text`;
    const segments = parseFeedMd(content);
    const items = extractDirectItems(segments);
    expect(items).toHaveLength(3);
    expect(items[0].item.kind).toBe('plugin');
    expect(items[1].item.kind).toBe('widget');
    expect(items[2].item.kind).toBe('entity');
  });
});
