import { describe, it, expect } from 'vitest';
import { PatternDetector } from '../detectors/pattern-detector';
import { parseUnifiedDiff } from '../diff-parser';
import type { FileDiff } from '../types';

function makeDiff(path: string, diffText: string): FileDiff {
  return { path, hunks: parseUnifiedDiff(diffText), rawDiff: diffText };
}

describe('PatternDetector', () => {
  const detector = new PatternDetector('test', [
    {
      event: 'console.added',
      pattern: /console\.(log|warn|error)\(/,
      lineType: 'add',
      toPayload: (match, line, file) => ({
        method: match[1],
        file,
        line: line.newLineNumber,
      }),
    },
    {
      event: 'console.removed',
      pattern: /console\.(log|warn|error)\(/,
      lineType: 'remove',
      toPayload: (match, line, file) => ({
        method: match[1],
        file,
        line: line.oldLineNumber,
      }),
    },
  ]);

  it('detects patterns in added lines', () => {
    const diff = makeDiff('src/app.ts', `@@ -1,2 +1,3 @@
 const x = 1;
+console.log("debug");
 return x;`);

    const detections = detector.detect(diff);
    expect(detections).toHaveLength(1);
    expect(detections[0]!.event).toBe('console.added');
    expect((detections[0]!.payload as { method: string }).method).toBe('log');
    expect(detections[0]!.line).toBe(2);
  });

  it('detects patterns in removed lines', () => {
    const diff = makeDiff('src/app.ts', `@@ -1,3 +1,2 @@
 const x = 1;
-console.error("oops");
 return x;`);

    const detections = detector.detect(diff);
    expect(detections).toHaveLength(1);
    expect(detections[0]!.event).toBe('console.removed');
  });

  it('ignores non-matching lines', () => {
    const diff = makeDiff('src/app.ts', `@@ -1,2 +1,3 @@
 const x = 1;
+const y = 2;
 return x;`);

    const detections = detector.detect(diff);
    expect(detections).toHaveLength(0);
  });

  it('supports lineType: any', () => {
    const anyDetector = new PatternDetector('any-test', [
      {
        event: 'marker.found',
        pattern: /MARKER/,
        lineType: 'any',
        toPayload: (_match, line) => ({ type: line.type }),
      },
    ]);

    const diff = makeDiff('file.ts', `@@ -1,3 +1,3 @@
 MARKER context
-MARKER removed
+MARKER added`);

    const detections = anyDetector.detect(diff);
    expect(detections).toHaveLength(3);
    expect(detections.map((d) => (d.payload as { type: string }).type)).toEqual(
      expect.arrayContaining(['context', 'remove', 'add']),
    );
  });

  it('respects file extension filter', () => {
    const tsOnly = new PatternDetector(
      'ts-only',
      [{ event: 'test', pattern: /test/, toPayload: () => ({}) }],
      ['.ts', '.tsx'],
    );

    expect(tsOnly.fileExtensions).toEqual(['.ts', '.tsx']);
  });

  it('returns file path in detections', () => {
    const diff = makeDiff('src/deep/nested/file.ts', `@@ -1,1 +1,2 @@
 x
+console.log("hi")`);

    const detections = detector.detect(diff);
    expect(detections[0]!.file).toBe('src/deep/nested/file.ts');
  });
});
