import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { todoAstDetector, todoPatternRemovedDetector, todoPatternAddedDetector } from '../detectors/todo-detector';
import { parseUnifiedDiff } from '../diff-parser';
import { synthesizeEditDiff, synthesizeWriteDiff } from '../analyze';
import type { FileDiff, Detection } from '../types';
import type { TodoPayload } from '../detectors/todo-detector';

function makeDiff(path: string, diffText: string): FileDiff {
  return { path, hunks: parseUnifiedDiff(diffText), rawDiff: diffText };
}

// ── Pattern detector (removals) tests ───────────────────────────────────

describe('todoPatternRemovedDetector (removals)', () => {
  it('detects TODO removal in diff', () => {
    const diff = makeDiff('src/app.ts', `@@ -5,3 +5,2 @@
 const x = 1;
-// TODO: fix this later
 return x;`);

    const detections = todoPatternRemovedDetector.detect(diff);
    expect(detections).toHaveLength(1);
    expect(detections[0]!.event).toBe('todo.removed');
    const payload = detections[0]!.payload as TodoPayload;
    expect(payload.tag).toBe('TODO');
    expect(payload.text).toBe('fix this later');
  });

  it('detects FIXME removal', () => {
    const diff = makeDiff('src/app.ts', `@@ -1,2 +1,1 @@
-// FIXME: broken
 ok`);

    const detections = todoPatternRemovedDetector.detect(diff);
    expect(detections).toHaveLength(1);
    expect((detections[0]!.payload as TodoPayload).tag).toBe('FIXME');
  });

  it('detects HACK and XXX removal', () => {
    const diff = makeDiff('f.ts', `@@ -1,3 +1,1 @@
-// HACK: workaround
-// XXX: danger zone
 ok`);

    const detections = todoPatternRemovedDetector.detect(diff);
    expect(detections).toHaveLength(2);
    const tags = detections.map((d) => (d.payload as TodoPayload).tag);
    expect(tags).toContain('HACK');
    expect(tags).toContain('XXX');
  });

  it('ignores added lines (only catches removals)', () => {
    const diff = makeDiff('f.ts', `@@ -1,1 +1,2 @@
 ok
+// TODO: new todo`);

    const detections = todoPatternRemovedDetector.detect(diff);
    expect(detections).toHaveLength(0);
  });
});

// ── Pattern detector (additions, regex fallback) ────────────────────────

describe('todoPatternAddedDetector (additions, regex)', () => {
  it('detects TODO addition in diff', () => {
    const diff = makeDiff('src/app.ts', `@@ -1,1 +1,2 @@
 const x = 1;
+// TODO: fix this later`);

    const detections = todoPatternAddedDetector.detect(diff);
    expect(detections).toHaveLength(1);
    expect(detections[0]!.event).toBe('todo.added');
    const payload = detections[0]!.payload as TodoPayload;
    expect(payload.tag).toBe('TODO');
    expect(payload.text).toBe('fix this later');
  });

  it('also matches TODOs in strings (known trade-off for synthetic diffs)', () => {
    const diff = makeDiff('src/app.ts', `@@ -0,0 +1,1 @@
+const msg = "TODO: not a real todo";`);

    const detections = todoPatternAddedDetector.detect(diff);
    // Pattern detector will match — this is the trade-off vs AST
    expect(detections).toHaveLength(1);
  });

  it('ignores removed lines', () => {
    const diff = makeDiff('f.ts', `@@ -1,2 +1,1 @@
-// TODO: old
 ok`);

    const detections = todoPatternAddedDetector.detect(diff);
    expect(detections).toHaveLength(0);
  });
});

// ── Synthetic diff integration ──────────────────────────────────────────

describe('synthetic diff + pattern detector', () => {
  it('detects TODO added via synthesizeEditDiff', () => {
    const diff = synthesizeEditDiff(
      'src/app.ts',
      'const x = 1;',
      '// TODO: fix this\nconst x = 1;',
    );

    const detections = todoPatternAddedDetector.detect(diff);
    expect(detections).toHaveLength(1);
    expect((detections[0]!.payload as TodoPayload).tag).toBe('TODO');
  });

  it('detects TODO removed via synthesizeEditDiff', () => {
    const diff = synthesizeEditDiff(
      'src/app.ts',
      '// TODO: fix this\nconst x = 1;',
      'const x = 1;',
    );

    const detections = todoPatternRemovedDetector.detect(diff);
    expect(detections).toHaveLength(1);
    expect((detections[0]!.payload as TodoPayload).tag).toBe('TODO');
  });

  it('detects TODO in new file via synthesizeWriteDiff', () => {
    const diff = synthesizeWriteDiff(
      'src/new.ts',
      '// TODO: implement\nconst x = 1;\n',
    );

    const detections = todoPatternAddedDetector.detect(diff);
    expect(detections).toHaveLength(1);
  });
});

// ── AST detector (additions) tests ──────────────────────────────────────

describe('todoAstDetector (additions, AST-aware)', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = join(tmpdir(), `todo-ast-test-${randomUUID()}`);
    await mkdir(tmpDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  async function detectWithFile(
    fileName: string,
    fileContent: string,
    diffText: string,
  ): Promise<Detection[]> {
    await writeFile(join(tmpDir, fileName), fileContent, 'utf-8');
    const diff = makeDiff(fileName, diffText);
    return todoAstDetector.detect(diff, tmpDir);
  }

  it('detects TODO in a line comment', async () => {
    const content = `const x = 1;\n// TODO: fix this\nconst y = 2;\n`;
    const diff = `@@ -1,1 +1,3 @@
 const x = 1;
+// TODO: fix this
+const y = 2;`;

    const detections = await detectWithFile('app.ts', content, diff);
    expect(detections).toHaveLength(1);
    expect(detections[0]!.event).toBe('todo.added');
    const payload = detections[0]!.payload as TodoPayload;
    expect(payload.tag).toBe('TODO');
    expect(payload.text).toBe('fix this');
    expect(payload.line).toBe(2);
  });

  it('detects FIXME in a block comment', async () => {
    const content = `/* FIXME: handle edge case */\nconst x = 1;\n`;
    const diff = `@@ -0,0 +1,2 @@
+/* FIXME: handle edge case */
+const x = 1;`;

    const detections = await detectWithFile('app.ts', content, diff);
    expect(detections).toHaveLength(1);
    expect((detections[0]!.payload as TodoPayload).tag).toBe('FIXME');
  });

  it('does NOT detect TODO in a string literal', async () => {
    const content = `const msg = "TODO: this is not a real todo";\n`;
    const diff = `@@ -0,0 +1,1 @@
+const msg = "TODO: this is not a real todo";`;

    const detections = await detectWithFile('app.ts', content, diff);
    expect(detections).toHaveLength(0);
  });

  it('does NOT detect TODO in a template literal', async () => {
    const content = 'const msg = `TODO: also not real`;\n';
    const diff = `@@ -0,0 +1,1 @@
+const msg = \`TODO: also not real\`;`;

    const detections = await detectWithFile('app.ts', content, diff);
    expect(detections).toHaveLength(0);
  });

  it('does NOT detect TODO on non-added lines', async () => {
    const content = `// TODO: old todo\nconst x = 1;\n`;
    const diff = `@@ -1,1 +1,2 @@
 // TODO: old todo
+const x = 1;`;

    const detections = await detectWithFile('app.ts', content, diff);
    // The TODO is on a context line (not added), should not be detected
    expect(detections).toHaveLength(0);
  });

  it('detects multiple TODOs in same file', async () => {
    const content = `// TODO: first\nconst a = 1;\n// FIXME: second\n`;
    const diff = `@@ -0,0 +1,3 @@
+// TODO: first
+const a = 1;
+// FIXME: second`;

    const detections = await detectWithFile('app.ts', content, diff);
    expect(detections).toHaveLength(2);
    const tags = detections.map((d) => (d.payload as TodoPayload).tag);
    expect(tags).toContain('TODO');
    expect(tags).toContain('FIXME');
  });

  it('handles JSX files', async () => {
    const content = `// TODO: fix component\nconst App = () => <div />;\n`;
    const diff = `@@ -0,0 +1,2 @@
+// TODO: fix component
+const App = () => <div />;`;

    const detections = await detectWithFile('App.tsx', content, diff);
    expect(detections).toHaveLength(1);
  });

  it('returns empty for non-TS/JS files', async () => {
    const diff = makeDiff('readme.md', `@@ -0,0 +1,1 @@
+TODO: write docs`);
    const detections = await todoAstDetector.detect(diff, tmpDir);
    expect(detections).toHaveLength(0);
  });

  it('provides correct context in payload', async () => {
    const content = `const x = 1;\n  // TODO: clean up this mess\nconst y = 2;\n`;
    const diff = `@@ -1,1 +1,3 @@
 const x = 1;
+  // TODO: clean up this mess
+const y = 2;`;

    const detections = await detectWithFile('app.ts', content, diff);
    const payload = detections[0]!.payload as TodoPayload;
    expect(payload.context).toContain('TODO');
    expect(payload.file).toBe('app.ts');
  });
});
