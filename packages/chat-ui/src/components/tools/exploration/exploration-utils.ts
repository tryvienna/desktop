/**
 * Exploration utilities — identification and summarization helpers
 *
 * @ai-context
 * - isExplorationTool: checks if a tool is read-only (Read/Glob/Grep/safe Bash)
 * - isSafeBashCommand: whitelist-based check for read-only Bash commands
 * - buildExplorationSummary: human-readable summary of exploration items
 * - isExplorationOnlyMessage: detects messages with only exploration tools
 */

import type { Message } from '../../../types/messages';
import type { ExplorationItem } from './types';

const SAFE_BASH_PREFIXES = [
  'git status',
  'git log',
  'git diff',
  'git branch',
  'git show',
  'git remote',
  'git tag',
  'ls',
  'cat',
  'head',
  'tail',
  'find',
  'wc',
  'file',
  'tree',
  'du',
  'df',
  'stat',
  'realpath',
  'dirname',
  'basename',
  'echo',
  'pwd',
  'which',
  'env',
  'printenv',
  'uname',
  'whoami',
  'date',
  'grep',
  'rg',
  'awk',
  'sort',
  'uniq',
  'cut',
  'tr',
  'diff',
  'comm',
  'less',
  'more',
];

/**
 * Check if a bash command is a safe, read-only command.
 */
export function isSafeBashCommand(command: string): boolean {
  const trimmed = command.trimStart();
  if (!trimmed) return false;

  const firstCommand = trimmed.split('|')[0].trimEnd();

  for (const prefix of SAFE_BASH_PREFIXES) {
    if (firstCommand === prefix || firstCommand.startsWith(prefix + ' ')) {
      return true;
    }
  }
  return false;
}

/**
 * Check if a tool use is an "exploration" tool (read-only, no side effects).
 */
export function isExplorationTool(toolName: string, input: Record<string, unknown>): boolean {
  if (toolName === 'Read' || toolName === 'Glob' || toolName === 'Grep') {
    return true;
  }
  if (toolName === 'Bash') {
    const command = (input.command as string) || '';
    return isSafeBashCommand(command);
  }
  return false;
}

/**
 * Build a human-readable summary of exploration items.
 */
export function buildExplorationSummary(items: ExplorationItem[]): string {
  let reads = 0;
  let searches = 0;
  let commands = 0;

  for (const item of items) {
    if (item.toolName === 'Read') reads++;
    else if (item.toolName === 'Grep' || item.toolName === 'Glob') searches++;
    else if (item.toolName === 'Bash') commands++;
  }

  const parts: string[] = [];
  if (reads > 0) parts.push(`${reads} file${reads !== 1 ? 's' : ''} read`);
  if (searches > 0) parts.push(`${searches} search${searches !== 1 ? 'es' : ''}`);
  if (commands > 0) parts.push(`${commands} command${commands !== 1 ? 's' : ''}`);

  return parts.join(', ') || `${items.length} operations`;
}

/**
 * Check if a message contains ONLY exploration tools and no meaningful text.
 */
export function isExplorationOnlyMessage(message: Message): boolean {
  const hasText = message.content.some(
    (block) => block.type === 'text' && block.text.trim().length > 0
  );
  if (hasText) return false;
  if (message.toolUses.length === 0) return false;

  return message.toolUses.every((t) => isExplorationTool(t.name, t.input));
}
