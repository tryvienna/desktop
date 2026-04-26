/**
 * Two-Pass Transcriber — immediate "hot" transcript + background "cold" refinement.
 *
 * Hot path: Whisper tiny (< 500ms) — streams immediately to the draft overlay.
 * Cold path: Whisper base (1-5s)   — runs on the same audio, produces corrections.
 *
 * The diff engine computes word-level patches that transform the hot text into
 * the cold text, so the UI can animate individual word corrections instead of
 * replacing the entire string.
 *
 * Both transcribers implement the `TranscriberLike` interface — in production
 * these are real Whisper pipelines; in tests they're mocked.
 */

import { EventEmitter } from 'events';
import type { TranscriberLike } from './transcriber';

// ─── Types ────────────────────────────────────────────────────────────────

export interface CorrectionPatch {
  /** Character offset in the hot text where the correction starts. */
  offset: number;
  /** Number of characters to remove from the hot text. */
  removeLength: number;
  /** Text to insert at the offset (may be empty for pure deletions). */
  insert: string;
}

export interface TwoPassConfig {
  /** Delay (ms) before starting the cold path. @default 0 */
  coldDelayMs?: number;
}

export interface TwoPassResult {
  hotText: string;
  coldText: string;
  patches: CorrectionPatch[];
}

export interface TwoPassEvents {
  /** Hot path completed — fast transcript available. */
  hotComplete: (result: { text: string }) => void;
  /** Cold path produced corrections. Only fires when patches.length > 0. */
  correction: (patches: CorrectionPatch[]) => void;
  /** Cold path completed (text may or may not differ from hot). */
  coldComplete: (result: { text: string; patches: CorrectionPatch[] }) => void;
  /** Error during transcription. */
  error: (err: Error) => void;
}

// ─── Word-level diff engine ───────────────────────────────────────────────

export interface WordToken {
  word: string;
  /** Character offset in the original text (inclusive). */
  start: number;
  /** Character offset end (exclusive). */
  end: number;
}

/**
 * Tokenize text into word tokens with character offsets.
 * Splits on whitespace boundaries.
 */
export function tokenizeWords(text: string): WordToken[] {
  const tokens: WordToken[] = [];
  const regex = /\S+/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    tokens.push({
      word: match[0],
      start: match.index,
      end: match.index + match[0].length,
    });
  }
  return tokens;
}

/**
 * Compute word-level correction patches to transform `hotText` into `coldText`.
 *
 * Uses LCS (Longest Common Subsequence) based diff for natural word-level
 * granularity. Returns an empty array if texts are identical.
 *
 * Patches are ordered by ascending offset and can be applied by `applyPatches()`.
 */
export function computeWordPatches(
  hotText: string,
  coldText: string,
): CorrectionPatch[] {
  if (hotText === coldText) return [];

  const hotTokens = tokenizeWords(hotText);
  const coldTokens = tokenizeWords(coldText);

  const hotWords = hotTokens.map((t) => t.word);
  const coldWords = coldTokens.map((t) => t.word);

  // Handle edge cases
  if (hotWords.length === 0 && coldWords.length === 0) return [];
  if (hotWords.length === 0) {
    return [{ offset: 0, removeLength: hotText.length, insert: coldText.trim() }];
  }
  if (coldWords.length === 0) {
    return [{ offset: 0, removeLength: hotText.length, insert: '' }];
  }

  // ── LCS DP table ──────────────────────────────────────────────────────

  const m = hotWords.length;
  const n = coldWords.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0),
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (hotWords[i - 1] === coldWords[j - 1]) {
        dp[i]![j] = dp[i - 1]![j - 1]! + 1;
      } else {
        dp[i]![j] = Math.max(dp[i - 1]![j]!, dp[i]![j - 1]!);
      }
    }
  }

  // ── Backtrack to produce edit operations ───────────────────────────────

  type Op =
    | { type: 'equal'; hi: number; ci: number }
    | { type: 'delete'; hi: number }
    | { type: 'insert'; ci: number };

  const ops: Op[] = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && hotWords[i - 1] === coldWords[j - 1]) {
      ops.push({ type: 'equal', hi: i - 1, ci: j - 1 });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i]![j - 1]! >= dp[i - 1]![j]!)) {
      ops.push({ type: 'insert', ci: j - 1 });
      j--;
    } else {
      ops.push({ type: 'delete', hi: i - 1 });
      i--;
    }
  }

  ops.reverse();

  // ── Group consecutive non-equal ops into patches ──────────────────────

  const patches: CorrectionPatch[] = [];
  let k = 0;

  while (k < ops.length) {
    if (ops[k]!.type === 'equal') {
      k++;
      continue;
    }

    // Collect a run of deletes + inserts
    const deletedIndices: number[] = [];
    const insertedWords: string[] = [];
    const groupStart = k;

    while (k < ops.length && ops[k]!.type !== 'equal') {
      const op = ops[k]!;
      if (op.type === 'delete') deletedIndices.push(op.hi);
      if (op.type === 'insert') insertedWords.push(coldWords[op.ci]!);
      k++;
    }

    if (deletedIndices.length > 0) {
      // Substitution or deletion: replace the hot word range
      const first = hotTokens[deletedIndices[0]!]!;
      const last = hotTokens[deletedIndices[deletedIndices.length - 1]!]!;
      let offset = first.start;
      let removeLength = last.end - first.start;
      const insert = insertedWords.join(' ');

      // For pure deletions, also remove an adjacent space to avoid double-spaces
      if (insert === '') {
        if (last.end < hotText.length && hotText[last.end] === ' ') {
          // Remove trailing space
          removeLength += 1;
        } else if (offset > 0 && hotText[offset - 1] === ' ') {
          // Remove leading space
          offset -= 1;
          removeLength += 1;
        }
      }

      patches.push({ offset, removeLength, insert });
    } else if (insertedWords.length > 0) {
      // Pure insertion (no deleted hot words)
      const prevOp = groupStart > 0 ? ops[groupStart - 1] : null;
      let insertAt: number;

      if (prevOp && (prevOp.type === 'equal' || prevOp.type === 'delete')) {
        const hi = prevOp.type === 'equal' ? prevOp.hi : prevOp.hi;
        insertAt = hotTokens[hi]!.end;
      } else {
        insertAt = 0;
      }

      const prefix = insertAt > 0 ? ' ' : '';
      const suffix = insertAt === 0 && k < ops.length ? ' ' : '';

      patches.push({
        offset: insertAt,
        removeLength: 0,
        insert: prefix + insertedWords.join(' ') + suffix,
      });
    }
  }

  return patches;
}

/**
 * Apply correction patches to the hot text to produce the corrected output.
 *
 * Patches are applied in reverse offset order to preserve character positions.
 * Trailing whitespace artefacts are normalized.
 */
export function applyPatches(
  text: string,
  patches: CorrectionPatch[],
): string {
  if (patches.length === 0) return text;

  // Sort by descending offset so earlier patches don't shift later offsets
  const sorted = [...patches].sort((a, b) => b.offset - a.offset);
  let result = text;

  for (const patch of sorted) {
    result =
      result.slice(0, patch.offset) +
      patch.insert +
      result.slice(patch.offset + patch.removeLength);
  }

  // Normalize any residual double-spaces
  return result.replace(/ {2,}/g, ' ').trim();
}

// ─── TwoPassTranscriber class ─────────────────────────────────────────────

export class TwoPassTranscriber extends EventEmitter {
  private readonly hotTranscriber: TranscriberLike;
  private readonly coldTranscriber: TranscriberLike;
  private readonly coldDelayMs: number;

  /** Generation counter — incremented on each transcribe/cancel call. */
  private _generation = 0;

  constructor(
    hotTranscriber: TranscriberLike,
    coldTranscriber: TranscriberLike,
    config?: TwoPassConfig,
  ) {
    super();
    this.hotTranscriber = hotTranscriber;
    this.coldTranscriber = coldTranscriber;
    this.coldDelayMs = config?.coldDelayMs ?? 0;

  }

  /**
   * Run both hot and cold paths on the same audio.
   *
   * 1. Runs hot transcriber → emits `hotComplete`
   * 2. Optionally waits `coldDelayMs`
   * 3. Runs cold transcriber → emits `correction` (if different) + `coldComplete`
   *
   * If cancelled via `cancelCold()`, the cold path is silently skipped.
   *
   * @returns Hot text, cold text, and correction patches.
   */
  async transcribe(
    audio: Float32Array,
    sampleRate: number,
  ): Promise<TwoPassResult> {
    const gen = ++this._generation;

    // ── Hot path ──────────────────────────────────────────────────────────

    let hotText: string;
    try {
      const hotResult = await this.hotTranscriber.transcribe(audio, sampleRate);
      hotText = hotResult.text;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.emit('error', error);
      throw error;
    }

    if (gen !== this._generation) {
      return { hotText, coldText: hotText, patches: [] };
    }

    this.emit('hotComplete', { text: hotText });

    // ── Cold delay ────────────────────────────────────────────────────────

    if (this.coldDelayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.coldDelayMs));
    }

    if (gen !== this._generation) {
      return { hotText, coldText: hotText, patches: [] };
    }

    // ── Cold path ─────────────────────────────────────────────────────────

    let coldText: string;
    try {
      const coldResult = await this.coldTranscriber.transcribe(
        audio,
        sampleRate,
      );
      coldText = coldResult.text;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.emit('error', error);
      // Fall back: emit cold complete with hot text and no patches
      this.emit('coldComplete', { text: hotText, patches: [] });
      return { hotText, coldText: hotText, patches: [] };
    }

    if (gen !== this._generation) {
      return { hotText, coldText, patches: [] };
    }

    // ── Diff ──────────────────────────────────────────────────────────────

    const patches = computeWordPatches(hotText, coldText);

    if (patches.length > 0) {
      this.emit('correction', patches);
    }

    this.emit('coldComplete', { text: coldText, patches });

    return { hotText, coldText, patches };
  }

  /**
   * Cancel any in-progress cold path.
   *
   * If the cold transcriber is mid-inference, its result will be silently
   * discarded. Events for that generation will not fire.
   */
  cancelCold(): void {
    this._generation++;
  }

  // Type-safe event overrides
  override on<K extends keyof TwoPassEvents>(
    event: K,
    listener: TwoPassEvents[K],
  ): this {
    return super.on(event, listener);
  }

  override emit<K extends keyof TwoPassEvents>(
    event: K,
    ...args: Parameters<TwoPassEvents[K]>
  ): boolean {
    return super.emit(event, ...args);
  }
}
