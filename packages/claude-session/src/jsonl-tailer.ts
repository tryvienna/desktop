/**
 * JsonlTailer — Efficient byte-offset-based JSONL file reader.
 *
 * Tracks byte offsets per file so only newly appended data is read.
 * Handles:
 * - Partial lines (buffered until next read completes them)
 * - File truncation/rotation (offset reset to 0)
 * - Corrupted JSON lines (silently skipped)
 * - File deletion between reads (returns empty)
 *
 * Memory: O(1) per file (just a number offset + partial line buffer).
 * I/O: One stat + one positioned read per file per flush cycle.
 */

import { open, stat } from 'node:fs/promises';
import type { SessionRecord } from './types';

export class JsonlTailer {
  /** File path → byte offset of last read position. */
  private offsets = new Map<string, number>();
  /** File path → incomplete line fragment from last read. */
  private partials = new Map<string, string>();

  /** Set the initial byte offset for a file (e.g., to skip existing content on startup). */
  setInitialOffset(filePath: string, offset: number): void {
    this.offsets.set(filePath, offset);
  }

  /** Get the current byte offset for a file. */
  getOffset(filePath: string): number {
    return this.offsets.get(filePath) ?? 0;
  }

  /** Check if a file is being tracked. */
  isTracking(filePath: string): boolean {
    return this.offsets.has(filePath);
  }

  /** Stop tracking a file and release its buffer. */
  remove(filePath: string): void {
    this.offsets.delete(filePath);
    this.partials.delete(filePath);
  }

  /** Number of files being tracked. */
  get size(): number {
    return this.offsets.size;
  }

  /**
   * Read newly appended lines from a JSONL file since last read.
   *
   * Returns parsed records for complete lines. Incomplete trailing lines
   * are buffered and completed on the next call. Malformed JSON lines
   * are silently skipped.
   */
  async readNewLines(filePath: string): Promise<SessionRecord[]> {
    const currentOffset = this.offsets.get(filePath) ?? 0;

    let fileSize: number;
    try {
      const s = await stat(filePath);
      fileSize = s.size;
    } catch {
      // File may have been deleted
      return [];
    }

    // File was truncated or replaced — reset and re-read from start
    if (fileSize < currentOffset) {
      this.offsets.set(filePath, 0);
      this.partials.delete(filePath);
      return this.readNewLines(filePath);
    }

    // Nothing new
    if (fileSize === currentOffset) return [];

    // Read only the new bytes
    let fd;
    try {
      fd = await open(filePath, 'r');
      const bytesToRead = fileSize - currentOffset;
      const buffer = Buffer.alloc(bytesToRead);
      await fd.read(buffer, 0, bytesToRead, currentOffset);
      this.offsets.set(filePath, fileSize);

      // Prepend any buffered partial line from previous read
      const pending = this.partials.get(filePath) ?? '';
      const chunk = pending + buffer.toString('utf-8');

      // Split on newlines — last element may be incomplete
      const lines = chunk.split('\n');
      const lastLine = lines.pop()!;

      if (lastLine.length > 0) {
        this.partials.set(filePath, lastLine);
      } else {
        this.partials.delete(filePath);
      }

      // Parse complete lines, skip empty and malformed
      const records: SessionRecord[] = [];
      for (const line of lines) {
        if (line.length === 0) continue;
        try {
          records.push(JSON.parse(line) as SessionRecord);
        } catch {
          // Malformed JSON — skip silently
        }
      }
      return records;
    } catch {
      // I/O error — return empty rather than crash
      return [];
    } finally {
      await fd?.close();
    }
  }
}
