/**
 * PromptBuilder — System prompt assembly for agent sessions
 *
 * Constructs the system prompt from layered sources:
 * 1. Base system prompt (per-provider defaults)
 * 2. Skill injections (activated skills' prompt content)
 * 3. Entity context (linked entities)
 * 4. Directory context (project directories)
 * 5. User customization (append-system-prompt)
 *
 * @module main/agent/PromptBuilder
 */

export interface PromptLayer {
  id: string;
  content: string;
  priority: number; // Higher = earlier in prompt
}

export class PromptBuilder {
  private layers: PromptLayer[] = [];

  /** Add a prompt layer (deduplicated by ID) */
  addLayer(layer: PromptLayer): void {
    this.removeLayer(layer.id);
    this.layers.push(layer);
  }

  /** Remove a layer by ID */
  removeLayer(id: string): void {
    this.layers = this.layers.filter((l) => l.id !== id);
  }

  /** Build the final system prompt from all layers, sorted by priority */
  build(): string {
    return this.layers
      .slice()
      .sort((a, b) => b.priority - a.priority)
      .map((l) => l.content)
      .filter((c) => c.trim().length > 0)
      .join('\n\n');
  }

  /** Add directory context */
  setDirectories(directories: string[]): void {
    if (directories.length === 0) {
      this.removeLayer('directories');
      return;
    }

    const content = [
      '<project-directories>',
      'The user has added the following project directories:',
      ...directories.map((d) => `- ${d}`),
      '</project-directories>',
    ].join('\n');

    this.addLayer({ id: 'directories', content, priority: 50 });
  }

  /** Add entity context */
  setEntities(entities: Array<{ uri: string; type: string; title: string }>): void {
    if (entities.length === 0) {
      this.removeLayer('entities');
      return;
    }

    const content = [
      '<linked-entities>',
      'The following entities are linked to this session:',
      ...entities.map((e) => `- [${e.type}] ${e.title} (${e.uri})`),
      '</linked-entities>',
    ].join('\n');

    this.addLayer({ id: 'entities', content, priority: 40 });
  }

  /** Add skill context */
  setSkills(skills: Array<{ id: string; name: string; content: string }>): void {
    if (skills.length === 0) {
      this.removeLayer('skills');
      return;
    }

    const content = [
      '<activated-skills>',
      ...skills.map((s) => `<skill id="${s.id}" name="${s.name}">\n${s.content}\n</skill>`),
      '</activated-skills>',
    ].join('\n');

    this.addLayer({ id: 'skills', content, priority: 30 });
  }

  /** Clear all layers */
  clear(): void {
    this.layers = [];
  }
}
