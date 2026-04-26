/**
 * Session Fork Utility — Fork Claude Code JSONL session files at a specific message
 *
 * Claude Code stores conversations as JSONL files at:
 *   ~/.claude/projects/{projectKey}/{sessionId}.jsonl
 *
 * Each line has: { uuid, parentUuid, isSidechain, sessionId, type, message, ... }
 * The `parentUuid` chain forms a tree; `isSidechain: true` marks abandoned branches.
 *
 * This utility reads a source session, truncates to a target message,
 * and writes a new session file that can be resumed with `--resume <newId>`.
 *
 * @module agent-providers/claude-code/session-fork
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

/** A parsed JSONL entry with the fields we need for fork logic */
interface SessionEntry {
  uuid?: string;
  parentUuid?: string;
  isSidechain?: boolean;
  /** Claude Code uses camelCase `sessionId` in JSONL entries */
  sessionId?: string;
  /** The original entry type (user, assistant, system, queue-operation, last-prompt, etc.) */
  type?: string;
  /** Parsed JSON object */
  parsed: Record<string, unknown>;
}

/**
 * Find a Claude Code session JSONL file by its session ID.
 *
 * Searches `~/.claude/projects/` for `{sessionId}.jsonl` across all project
 * directories. This avoids needing to reverse-engineer Claude Code's internal
 * project key derivation algorithm.
 *
 * @param sessionId - The Claude Code provider session ID (UUID)
 * @param searchDir - Override the search root (defaults to `~/.claude/projects`). Useful for testing.
 * @returns Absolute path to the JSONL file, or null if not found
 */
export function findSessionFile(sessionId: string, searchDir?: string): string | null {
  const projectsDir = searchDir ?? path.join(os.homedir(), '.claude', 'projects');
  const filename = `${sessionId}.jsonl`;

  let dirs: string[];
  try {
    dirs = fs.readdirSync(projectsDir);
  } catch {
    return null;
  }

  for (const dir of dirs) {
    const candidate = path.join(projectsDir, dir, filename);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

/**
 * Fork a Claude Code session file, truncating at a specific message.
 *
 * Reads the source JSONL, finds the target message, walks the `parentUuid` chain
 * to collect the active conversation thread, and writes a new JSONL file with
 * only those entries (sessionId replaced with newSessionId).
 *
 * The target is found by trying two lookups in order:
 * 1. Match `targetUuid` against the JSONL entry's `uuid` field
 * 2. If not found AND `messageId` is provided, match against `entry.message.id`
 *    (the Anthropic API message ID, e.g. `msg_01...`)
 *
 * This dual-lookup is necessary because during live streaming, the `uuid` seen
 * by the normalizer (from `stream_event`) differs from the `uuid` written to
 * the JSONL entry. The Anthropic `message.id` is consistent across both.
 *
 * @param sourcePath - Path to the source JSONL session file
 * @param targetUuid - The JSONL `uuid` of the message to fork at (inclusive)
 * @param newSessionId - UUID for the new forked session
 * @param messageId - Optional Anthropic API message ID (e.g. `msg_01...`) as fallback lookup
 * @returns Path to the new session file and the number of lines written
 * @throws If the source file doesn't exist, or the target is not found
 */
export async function forkSessionAtUuid(
  sourcePath: string,
  targetUuid: string,
  newSessionId: string,
  messageId?: string,
): Promise<{ targetPath: string; lineCount: number }> {
  // Read and parse the source JSONL
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Session file not found: ${sourcePath}`);
  }

  const content = await fs.promises.readFile(sourcePath, 'utf-8');
  const lines = content.split('\n').filter((line) => line.trim().length > 0);

  // Parse all entries
  const entries: SessionEntry[] = [];
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line) as Record<string, unknown>;
      entries.push({
        uuid: parsed.uuid as string | undefined,
        parentUuid: parsed.parentUuid as string | undefined,
        isSidechain: parsed.isSidechain as boolean | undefined,
        sessionId: parsed.sessionId as string | undefined,
        type: parsed.type as string | undefined,
        parsed,
      });
    } catch {
      // Skip malformed lines
    }
  }

  // Build uuid→entry index
  const byUuid = new Map<string, SessionEntry>();
  for (const entry of entries) {
    if (entry.uuid) {
      byUuid.set(entry.uuid, entry);
    }
  }

  // Find the target entry — try uuid first, then message.id fallback
  let target = byUuid.get(targetUuid);
  if (!target && messageId) {
    // Fallback: match by Anthropic API message.id (handles streaming uuid mismatch)
    target = entries.find(
      (e) => (e.parsed.message as Record<string, unknown> | undefined)?.id === messageId,
    );
  }
  if (!target) {
    throw new Error(`Target UUID not found in session: ${targetUuid}`);
  }

  // Walk the parentUuid chain upward to collect the active conversation thread.
  // Guard against cycles (corrupt JSONL — known Claude Code bug, issue #22526).
  const ancestorUuids = new Set<string>();
  let current: SessionEntry | undefined = target;
  while (current) {
    if (current.uuid) {
      if (ancestorUuids.has(current.uuid)) break; // cycle detected
      ancestorUuids.add(current.uuid);
    }
    current = current.parentUuid ? byUuid.get(current.parentUuid) : undefined;
  }

  // Collect entries in original order that are part of the ancestor chain.
  // Also include entries without a uuid (e.g., queue-operation lines) that
  // appear before the target in the file, as they may contain metadata.
  // Skip `last-prompt` entries — they reference the source session's last prompt
  // and would confuse Claude Code if carried into the fork.
  const targetIndex = entries.indexOf(target);
  const forkedEntries: SessionEntry[] = [];
  for (let i = 0; i <= targetIndex; i++) {
    const entry = entries[i]!;
    if (entry.type === 'last-prompt') continue;
    if (!entry.uuid || ancestorUuids.has(entry.uuid)) {
      forkedEntries.push(entry);
    }
  }

  // Write the new session file with updated sessionId.
  // Claude Code uses camelCase `sessionId` in JSONL entries (not `session_id`).
  const targetDir = path.dirname(sourcePath);
  const targetPath = path.join(targetDir, `${newSessionId}.jsonl`);
  const tmpPath = `${targetPath}.tmp`;

  const outputLines = forkedEntries.map((entry) => {
    const updated = { ...entry.parsed };
    // Replace sessionId (camelCase — the actual JSONL field name)
    if (updated.sessionId) {
      updated.sessionId = newSessionId;
    }
    // Ensure isSidechain is false for all kept entries
    if ('isSidechain' in updated) {
      updated.isSidechain = false;
    }
    return JSON.stringify(updated);
  });

  await fs.promises.writeFile(tmpPath, outputLines.join('\n') + '\n', 'utf-8');
  await fs.promises.rename(tmpPath, targetPath);

  return { targetPath, lineCount: outputLines.length };
}

/**
 * Copy an entire Claude Code session file with a new session ID.
 *
 * Used for "fork at latest message" — copies all entries from the source,
 * replacing `sessionId` and clearing `isSidechain` flags, stripping
 * `last-prompt` entries.
 *
 * @param sourcePath - Path to the source JSONL session file
 * @param newSessionId - UUID for the new session
 * @returns Path to the new session file and the number of lines written
 * @throws If the source file doesn't exist
 */
export async function copySessionWithNewId(
  sourcePath: string,
  newSessionId: string,
): Promise<{ targetPath: string; lineCount: number }> {
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Session file not found: ${sourcePath}`);
  }

  const content = await fs.promises.readFile(sourcePath, 'utf-8');
  const lines = content.split('\n').filter((line) => line.trim().length > 0);

  const outputLines: string[] = [];
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line) as Record<string, unknown>;
      if (parsed.type === 'last-prompt') continue;
      if (parsed.sessionId) {
        parsed.sessionId = newSessionId;
      }
      if ('isSidechain' in parsed) {
        parsed.isSidechain = false;
      }
      outputLines.push(JSON.stringify(parsed));
    } catch {
      // Skip malformed lines
    }
  }

  const targetDir = path.dirname(sourcePath);
  const targetPath = path.join(targetDir, `${newSessionId}.jsonl`);
  const tmpPath = `${targetPath}.tmp`;

  await fs.promises.writeFile(tmpPath, outputLines.join('\n') + '\n', 'utf-8');
  await fs.promises.rename(tmpPath, targetPath);

  return { targetPath, lineCount: outputLines.length };
}
