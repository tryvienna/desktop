import { describe, it, expect, beforeEach } from 'vitest';
import { PromptBuilder } from './PromptBuilder';

describe('PromptBuilder', () => {
  let builder: PromptBuilder;

  beforeEach(() => {
    builder = new PromptBuilder();
  });

  it('returns empty string when no layers added', () => {
    expect(builder.build()).toBe('');
  });

  it('adds and builds a single layer', () => {
    builder.addLayer({ id: 'base', content: 'Hello world', priority: 0 });
    expect(builder.build()).toBe('Hello world');
  });

  it('sorts layers by priority (higher first)', () => {
    builder.addLayer({ id: 'low', content: 'low priority', priority: 10 });
    builder.addLayer({ id: 'high', content: 'high priority', priority: 50 });
    builder.addLayer({ id: 'mid', content: 'mid priority', priority: 30 });

    expect(builder.build()).toBe('high priority\n\nmid priority\n\nlow priority');
  });

  it('deduplicates layers by ID (last write wins)', () => {
    builder.addLayer({ id: 'a', content: 'first', priority: 10 });
    builder.addLayer({ id: 'a', content: 'second', priority: 10 });

    expect(builder.build()).toBe('second');
  });

  it('removes a layer by ID', () => {
    builder.addLayer({ id: 'keep', content: 'kept', priority: 10 });
    builder.addLayer({ id: 'remove', content: 'removed', priority: 20 });
    builder.removeLayer('remove');

    expect(builder.build()).toBe('kept');
  });

  it('removeLayer is a no-op for unknown ID', () => {
    builder.addLayer({ id: 'a', content: 'hello', priority: 0 });
    builder.removeLayer('nonexistent');
    expect(builder.build()).toBe('hello');
  });

  it('filters out empty/whitespace-only layers', () => {
    builder.addLayer({ id: 'empty', content: '', priority: 100 });
    builder.addLayer({ id: 'spaces', content: '   ', priority: 90 });
    builder.addLayer({ id: 'real', content: 'content', priority: 50 });

    expect(builder.build()).toBe('content');
  });

  it('clears all layers', () => {
    builder.addLayer({ id: 'a', content: 'a', priority: 10 });
    builder.addLayer({ id: 'b', content: 'b', priority: 20 });
    builder.clear();

    expect(builder.build()).toBe('');
  });

  // ─── setDirectories ─────────────────────────────────────────────────

  it('setDirectories adds directory context', () => {
    builder.setDirectories(['/home/user/project', '/tmp/other']);
    const result = builder.build();

    expect(result).toContain('<project-directories>');
    expect(result).toContain('- /home/user/project');
    expect(result).toContain('- /tmp/other');
    expect(result).toContain('</project-directories>');
  });

  it('setDirectories with empty array removes the layer', () => {
    builder.setDirectories(['/foo']);
    expect(builder.build()).toContain('<project-directories>');

    builder.setDirectories([]);
    expect(builder.build()).toBe('');
  });

  // ─── setEntities ────────────────────────────────────────────────────

  it('setEntities adds entity context', () => {
    builder.setEntities([
      { uri: '@vienna//github_pr/org/repo/42', type: 'github_pr', title: 'Fix bug' },
    ]);
    const result = builder.build();

    expect(result).toContain('<linked-entities>');
    expect(result).toContain('[github_pr] Fix bug (@vienna//github_pr/org/repo/42)');
    expect(result).toContain('</linked-entities>');
  });

  it('setEntities with empty array removes the layer', () => {
    builder.setEntities([{ uri: 'u', type: 't', title: 'x' }]);
    expect(builder.build()).toContain('<linked-entities>');

    builder.setEntities([]);
    expect(builder.build()).toBe('');
  });

  // ─── setSkills ──────────────────────────────────────────────────────

  it('setSkills adds skill context', () => {
    builder.setSkills([{ id: 'commit', name: 'Commit', content: 'Do the commit thing.' }]);
    const result = builder.build();

    expect(result).toContain('<activated-skills>');
    expect(result).toContain('<skill id="commit" name="Commit">');
    expect(result).toContain('Do the commit thing.');
    expect(result).toContain('</skill>');
    expect(result).toContain('</activated-skills>');
  });

  it('setSkills with empty array removes the layer', () => {
    builder.setSkills([{ id: 's', name: 'S', content: 'c' }]);
    expect(builder.build()).toContain('<activated-skills>');

    builder.setSkills([]);
    expect(builder.build()).toBe('');
  });

  // ─── Priority ordering of convenience methods ───────────────────────

  it('directories (50) appear before entities (40) which appear before skills (30)', () => {
    builder.setSkills([{ id: 's', name: 'S', content: 'skill-content' }]);
    builder.setDirectories(['/dir']);
    builder.setEntities([{ uri: 'u', type: 't', title: 'entity-title' }]);

    const result = builder.build();
    const dirIndex = result.indexOf('<project-directories>');
    const entityIndex = result.indexOf('<linked-entities>');
    const skillIndex = result.indexOf('<activated-skills>');

    expect(dirIndex).toBeLessThan(entityIndex);
    expect(entityIndex).toBeLessThan(skillIndex);
  });
});
