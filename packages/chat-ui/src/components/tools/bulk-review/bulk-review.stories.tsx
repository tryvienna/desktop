// Bulk Review Stories — FileChangeReviewPanel, ChangeItem, DiffView
//
// Comprehensive stories covering all scenarios:
// - Single file / multiple files / multiple directories
// - Edit diffs (small, large, multi-hunk), Write previews, Bash commands
// - Streaming state, approved/denied states, mixed states
// - Syntax highlighting across languages
// - Word-level diffs, hunk collapsing
// - Auto-expand behavior, keyboard navigation

import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { useState } from 'react';
import { FileChangeReviewPanel } from './file-change-review-panel';
import { ChangeItem } from './change-item';
import { DiffView } from './diff-view';
import { DiffModeProvider } from './diff-mode-context';
import type { PendingChange } from './types';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const TS_OLD = `import { useState } from 'react';

interface User {
  id: number;
  name: string;
  email: string;
}

export function UserProfile({ userId }: { userId: number }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  return (
    <div className="profile">
      {loading ? <Spinner /> : <UserCard user={user} />}
    </div>
  );
}`;

const TS_NEW = `import { useState, useEffect } from 'react';

interface User {
  id: number;
  name: string;
  email: string;
  avatarUrl?: string;
}

export function UserProfile({ userId }: { userId: number }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUser(userId)
      .then(setUser)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [userId]);

  if (error) return <ErrorBanner message={error} />;

  return (
    <div className="profile">
      {loading ? <Spinner /> : <UserCard user={user} />}
    </div>
  );
}`;

const PY_OLD = `def calculate_total(items):
    total = 0
    for item in items:
        total += item.price
    return total`;

const PY_NEW = `def calculate_total(items, *, tax_rate=0.0, discount=0.0):
    """Calculate total with optional tax and discount."""
    subtotal = sum(item.price * item.quantity for item in items)
    taxed = subtotal * (1 + tax_rate)
    return max(0, taxed - discount)`;

const CSS_OLD = `.container {
  display: flex;
  padding: 16px;
  background: #fff;
}`;

const CSS_NEW = `.container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 16px;
  padding: 16px;
  background: var(--surface-page);
}`;

const RUST_OLD = `fn process(data: &[u8]) -> Result<String, Error> {
    let parsed = parse(data)?;
    Ok(format!("{}", parsed))
}`;

const RUST_NEW = `fn process(data: &[u8]) -> Result<String, Error> {
    let parsed = parse(data).map_err(|e| Error::Parse(e))?;
    let validated = validate(&parsed)?;
    Ok(format!("{validated}"))
}`;

const LARGE_FILE_OLD = Array.from({ length: 200 }, (_, i) =>
  i === 50
    ? '  const value = computeOld();'
    : i === 100
      ? '  // TODO: refactor this section'
      : i === 150
        ? '  return result.filter(Boolean);'
        : `  // line ${i + 1}`
).join('\n');

const LARGE_FILE_NEW = Array.from({ length: 200 }, (_, i) =>
  i === 50
    ? '  const value = computeNew(options);'
    : i === 100
      ? '  // DONE: refactored this section'
      : i === 101
        ? '  const extra = processExtra();'
        : i === 150
          ? '  return result.filter(Boolean).map(normalize);'
          : `  // line ${i + 1}`
).join('\n');

const NEW_COMPONENT = `/**
 * StatusBadge — Displays a colored status indicator
 *
 * @ai-context
 * - CVA variants: success, warning, error, info
 * - data-slot="status-badge"
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@tryvienna/ui';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
  {
    variants: {
      variant: {
        success: 'bg-success/10 text-success',
        warning: 'bg-warning/10 text-warning',
        error: 'bg-error/10 text-error',
        info: 'bg-info/10 text-info',
      },
    },
    defaultVariants: { variant: 'info' },
  }
);

interface StatusBadgeProps extends VariantProps<typeof badgeVariants> {
  label: string;
  className?: string;
}

export function StatusBadge({ label, variant, className }: StatusBadgeProps) {
  return (
    <span
      data-slot="status-badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}
`;

function makeChange(
  overrides: Partial<PendingChange> & { requestId: string; toolId: string }
): PendingChange {
  return {
    toolType: 'Edit',
    filePath: 'src/unknown.ts',
    directory: 'src',
    timestamp: Date.now(),
    ...overrides,
  };
}

const defaultCallbacks = {
  onApprove: fn(),
  onApproveMultiple: fn(),
  onApproveAll: fn(),
  onDeny: fn(),
  onDenyMultiple: fn(),
  onDenyAll: fn(),
  onAllowAllForSession: fn(),
  onAllowAllPermanently: fn(),
  onCollapseChange: fn(),
  onRevokeRule: fn(),
};

// ─── DiffView Stories ─────────────────────────────────────────────────────────

const diffMeta: Meta<typeof DiffView> = {
  title: 'BulkReview/DiffView',
  component: DiffView,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <DiffModeProvider>
        <div className="max-w-[700px] border border-border-muted rounded-md overflow-hidden">
          <Story />
        </div>
      </DiffModeProvider>
    ),
  ],
};

export default diffMeta;
type DiffStory = StoryObj<typeof DiffView>;

/** TypeScript edit — added imports, fields, and useEffect hook */
export const TypeScriptEdit: DiffStory = {
  args: {
    oldContent: TS_OLD,
    newContent: TS_NEW,
    filePath: 'src/components/user-profile.tsx',
  },
};

/** Python edit — function signature and body rewrite */
export const PythonEdit: DiffStory = {
  args: {
    oldContent: PY_OLD,
    newContent: PY_NEW,
    filePath: 'app/utils/pricing.py',
  },
};

/** CSS edit — layout change from flex to grid */
export const CSSEdit: DiffStory = {
  args: {
    oldContent: CSS_OLD,
    newContent: CSS_NEW,
    filePath: 'src/styles/layout.css',
  },
};

/** Rust edit — added error mapping and validation step */
export const RustEdit: DiffStory = {
  args: {
    oldContent: RUST_OLD,
    newContent: RUST_NEW,
    filePath: 'src/processor.rs',
  },
};

/** Large file with scattered edits — demonstrates hunk splitting and collapsible context */
export const LargeFileMultiHunk: DiffStory = {
  args: {
    oldContent: LARGE_FILE_OLD,
    newContent: LARGE_FILE_NEW,
    filePath: 'src/services/data-processor.ts',
  },
};

/** Single-line change — word-level diff emphasis */
export const SingleLineChange: DiffStory = {
  args: {
    oldContent: 'const API_URL = "https://api.example.com/v1";',
    newContent: 'const API_URL = "https://api.example.com/v2";',
    filePath: 'src/config.ts',
  },
};

/** Variable rename — word-level diff across multiple lines */
export const VariableRename: DiffStory = {
  args: {
    oldContent: `function getUser(userId: string) {
  const userData = fetchUserById(userId);
  return formatUser(userData);
}`,
    newContent: `function getUser(userId: string) {
  const userRecord = fetchUserById(userId);
  return formatUser(userRecord);
}`,
    filePath: 'src/api/users.ts',
  },
};

/** Empty diff — no changes (should render nothing) */
export const EmptyDiff: DiffStory = {
  args: {
    oldContent: 'const x = 1;',
    newContent: 'const x = 1;',
    filePath: 'src/unchanged.ts',
  },
};

/** JSON config edit — tests JSON syntax highlighting */
export const JSONEdit: DiffStory = {
  args: {
    oldContent: `{
  "name": "@vienna/chat-ui",
  "version": "0.0.1",
  "dependencies": {
    "react": "^18.2.0"
  }
}`,
    newContent: `{
  "name": "@vienna/chat-ui",
  "version": "0.1.0",
  "dependencies": {
    "react": "^19.0.0",
    "highlight.js": "^11.11.1"
  }
}`,
    filePath: 'package.json',
  },
};

/** Streaming diff — cursor on last added line */
export const StreamingDiff: DiffStory = {
  args: {
    oldContent: 'export function hello() {\n  return "world";\n}',
    newContent:
      'export function hello() {\n  console.log("calling hello");\n  return "world";\n}\n\nexport function goodbye() {\n  return "farewell";',
    filePath: 'src/greetings.ts',
    isStreaming: true,
  },
};

/** Markdown edit — tests markdown highlighting */
export const MarkdownEdit: DiffStory = {
  args: {
    oldContent: `# README\n\nThis is a project.\n\n## Installation\n\n\`\`\`bash\nnpm install\n\`\`\``,
    newContent: `# README\n\nThis is an **awesome** project.\n\n## Installation\n\n\`\`\`bash\npnpm install\n\`\`\`\n\n## Usage\n\nImport and use the components.`,
    filePath: 'README.md',
  },
};

/** Go edit — tests Go syntax highlighting */
export const GoEdit: DiffStory = {
  args: {
    oldContent: `package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Println("Hello")\n}`,
    newContent: `package main\n\nimport (\n\t"fmt"\n\t"os"\n)\n\nfunc main() {\n\tname := os.Getenv("USER")\n\tfmt.Printf("Hello, %s\\n", name)\n}`,
    filePath: 'main.go',
  },
};

// ─── ChangeItem Stories ───────────────────────────────────────────────────────

export const ChangeItemEditCollapsed: StoryObj<typeof ChangeItem> = {
  render: () => (
    <div className="max-w-[600px] border border-border-muted rounded-md">
      <ChangeItem
        change={makeChange({
          requestId: 'r1',
          toolId: 't1',
          toolType: 'Edit',
          filePath: 'src/components/user-profile.tsx',
          directory: 'src/components',
          oldContent: TS_OLD,
          newContent: TS_NEW,
        })}
        focused={false}
        expanded={false}
        onClick={fn()}
        onToggleExpand={fn()}
        onApprove={fn()}
        onDeny={fn()}
      />
    </div>
  ),
  name: 'ChangeItem — Edit (Collapsed)',
};

export const ChangeItemEditExpanded: StoryObj<typeof ChangeItem> = {
  render: () => (
    <div className="max-w-[600px] border border-border-muted rounded-md">
      <ChangeItem
        change={makeChange({
          requestId: 'r1',
          toolId: 't1',
          toolType: 'Edit',
          filePath: 'src/components/user-profile.tsx',
          directory: 'src/components',
          oldContent: TS_OLD,
          newContent: TS_NEW,
        })}
        focused={true}
        expanded={true}
        onClick={fn()}
        onToggleExpand={fn()}
        onApprove={fn()}
        onDeny={fn()}
      />
    </div>
  ),
  name: 'ChangeItem — Edit (Expanded + Focused)',
};

export const ChangeItemWriteExpanded: StoryObj<typeof ChangeItem> = {
  render: () => (
    <div className="max-w-[600px] border border-border-muted rounded-md">
      <ChangeItem
        change={makeChange({
          requestId: 'r2',
          toolId: 't2',
          toolType: 'Write',
          filePath: 'src/components/status-badge.tsx',
          directory: 'src/components',
          newContent: NEW_COMPONENT,
        })}
        focused={true}
        expanded={true}
        onClick={fn()}
        onToggleExpand={fn()}
        onApprove={fn()}
        onDeny={fn()}
      />
    </div>
  ),
  name: 'ChangeItem — Write (New File)',
};

export const ChangeItemBashExpanded: StoryObj<typeof ChangeItem> = {
  render: () => (
    <div className="max-w-[600px] border border-border-muted rounded-md">
      <ChangeItem
        change={makeChange({
          requestId: 'r3',
          toolId: 't3',
          toolType: 'Bash',
          filePath: 'terminal',
          directory: '.',
          command: 'pnpm --filter @vienna/chat-ui typecheck && pnpm --filter @vienna/chat-ui test',
        })}
        focused={true}
        expanded={true}
        onClick={fn()}
        onToggleExpand={fn()}
        onApprove={fn()}
        onDeny={fn()}
      />
    </div>
  ),
  name: 'ChangeItem — Bash Command',
};

export const ChangeItemStreaming: StoryObj<typeof ChangeItem> = {
  render: () => (
    <div className="max-w-[600px] border border-border-muted rounded-md">
      <ChangeItem
        change={makeChange({
          requestId: 'r4',
          toolId: 't4',
          toolType: 'Write',
          filePath: 'src/utils/format.ts',
          directory: 'src/utils',
          newContent:
            'export function format(value: number): string {\n  return value.toLocaleString();\n',
          isStreaming: true,
        })}
        focused={true}
        expanded={true}
        onClick={fn()}
        onToggleExpand={fn()}
        onApprove={fn()}
        onDeny={fn()}
      />
    </div>
  ),
  name: 'ChangeItem — Streaming',
};

export const ChangeItemApproved: StoryObj<typeof ChangeItem> = {
  render: () => (
    <div className="max-w-[600px] border border-border-muted rounded-md">
      <ChangeItem
        change={makeChange({
          requestId: 'r5',
          toolId: 't5',
          toolType: 'Edit',
          filePath: 'src/store.ts',
          directory: 'src',
          oldContent: 'const x = 1;',
          newContent: 'const x = 2;',
        })}
        focused={false}
        expanded={false}
        action="approved"
        onClick={fn()}
        onToggleExpand={fn()}
        onApprove={fn()}
        onDeny={fn()}
      />
    </div>
  ),
  name: 'ChangeItem — Approved',
};

export const ChangeItemDenied: StoryObj<typeof ChangeItem> = {
  render: () => (
    <div className="max-w-[600px] border border-border-muted rounded-md">
      <ChangeItem
        change={makeChange({
          requestId: 'r6',
          toolId: 't6',
          toolType: 'Bash',
          filePath: 'terminal',
          directory: '.',
          command: 'rm -rf node_modules',
        })}
        focused={false}
        expanded={false}
        action="denied"
        onClick={fn()}
        onToggleExpand={fn()}
        onApprove={fn()}
        onDeny={fn()}
      />
    </div>
  ),
  name: 'ChangeItem — Denied',
};

export const ChangeItemAutoApproved: StoryObj<typeof ChangeItem> = {
  render: () => (
    <div className="max-w-[600px] border border-border-muted rounded-md">
      <ChangeItem
        change={makeChange({
          requestId: 'r7',
          toolId: 't7',
          toolType: 'Edit',
          filePath: 'src/types.ts',
          directory: 'src',
          oldContent: 'type Foo = string;',
          newContent: 'type Foo = string | number;',
          approvalMethod: 'session_rule',
        })}
        focused={false}
        expanded={false}
        action="approved"
        onClick={fn()}
        onToggleExpand={fn()}
        onApprove={fn()}
        onDeny={fn()}
        onRevokeRule={fn()}
      />
    </div>
  ),
  name: 'ChangeItem — Auto-Approved (Session Rule)',
};

export const ChangeItemPythonEdit: StoryObj<typeof ChangeItem> = {
  render: () => (
    <div className="max-w-[600px] border border-border-muted rounded-md">
      <ChangeItem
        change={makeChange({
          requestId: 'r8',
          toolId: 't8',
          toolType: 'Edit',
          filePath: 'app/utils/pricing.py',
          directory: 'app/utils',
          oldContent: PY_OLD,
          newContent: PY_NEW,
        })}
        focused={true}
        expanded={true}
        onClick={fn()}
        onToggleExpand={fn()}
        onApprove={fn()}
        onDeny={fn()}
      />
    </div>
  ),
  name: 'ChangeItem — Python Edit (Expanded)',
};

// ─── FileChangeReviewPanel Stories ────────────────────────────────────────────

export const PanelSingleFile: StoryObj<typeof FileChangeReviewPanel> = {
  render: () => (
    <div className="max-w-[600px]">
      <FileChangeReviewPanel
        changes={[
          makeChange({
            requestId: 'r1',
            toolId: 't1',
            toolType: 'Edit',
            filePath: 'src/components/user-profile.tsx',
            directory: 'src/components',
            oldContent: TS_OLD,
            newContent: TS_NEW,
          }),
        ]}
        {...defaultCallbacks}
      />
    </div>
  ),
  name: 'Panel — Single File (Auto-Expands)',
};

export const PanelMultipleFiles: StoryObj<typeof FileChangeReviewPanel> = {
  render: () => (
    <div className="max-w-[600px]">
      <FileChangeReviewPanel
        changes={[
          makeChange({
            requestId: 'r1',
            toolId: 't1',
            toolType: 'Edit',
            filePath: 'src/components/user-profile.tsx',
            directory: 'src/components',
            oldContent: TS_OLD,
            newContent: TS_NEW,
          }),
          makeChange({
            requestId: 'r2',
            toolId: 't2',
            toolType: 'Write',
            filePath: 'src/components/status-badge.tsx',
            directory: 'src/components',
            newContent: NEW_COMPONENT,
          }),
          makeChange({
            requestId: 'r3',
            toolId: 't3',
            toolType: 'Bash',
            filePath: 'terminal',
            directory: '.',
            command: 'pnpm typecheck',
          }),
        ]}
        {...defaultCallbacks}
      />
    </div>
  ),
  name: 'Panel — Multiple Files (3 pending)',
};

export const PanelMultipleDirectories: StoryObj<typeof FileChangeReviewPanel> = {
  render: () => (
    <div className="max-w-[600px]">
      <FileChangeReviewPanel
        changes={[
          makeChange({
            requestId: 'r1',
            toolId: 't1',
            toolType: 'Edit',
            filePath: 'src/components/button.tsx',
            directory: 'src/components',
            oldContent: 'export function Button() {}',
            newContent: 'export function Button({ variant }: Props) {}',
          }),
          makeChange({
            requestId: 'r2',
            toolId: 't2',
            toolType: 'Edit',
            filePath: 'src/components/input.tsx',
            directory: 'src/components',
            oldContent: 'export function Input() {}',
            newContent: 'export function Input({ size }: Props) {}',
          }),
          makeChange({
            requestId: 'r3',
            toolId: 't3',
            toolType: 'Edit',
            filePath: 'src/utils/format.ts',
            directory: 'src/utils',
            oldContent: 'export function format() {}',
            newContent: 'export function format(value: number) {}',
          }),
          makeChange({
            requestId: 'r4',
            toolId: 't4',
            toolType: 'Write',
            filePath: 'src/hooks/use-theme.ts',
            directory: 'src/hooks',
            newContent: 'export function useTheme() { return "dark"; }',
          }),
          makeChange({
            requestId: 'r5',
            toolId: 't5',
            toolType: 'Edit',
            filePath: 'tests/button.test.tsx',
            directory: 'tests',
            oldContent: 'test("renders", () => {});',
            newContent: 'test("renders with variant", () => {});',
          }),
        ]}
        {...defaultCallbacks}
      />
    </div>
  ),
  name: 'Panel — Multiple Directories (5 files)',
};

export const PanelMixedStates: StoryObj<typeof FileChangeReviewPanel> = {
  render: () => (
    <div className="max-w-[600px]">
      <FileChangeReviewPanel
        changes={[
          makeChange({
            requestId: 'r1',
            toolId: 't1',
            toolType: 'Edit',
            filePath: 'src/store.ts',
            directory: 'src',
            oldContent: 'const state = {};',
            newContent: 'const state = { count: 0 };',
            status: 'approved',
            approvalMethod: 'session_rule',
          }),
          makeChange({
            requestId: 'r2',
            toolId: 't2',
            toolType: 'Edit',
            filePath: 'src/components/counter.tsx',
            directory: 'src/components',
            oldContent: TS_OLD,
            newContent: TS_NEW,
          }),
          makeChange({
            requestId: 'r3',
            toolId: 't3',
            toolType: 'Write',
            filePath: 'src/components/display.tsx',
            directory: 'src/components',
            newContent: NEW_COMPONENT,
          }),
          makeChange({
            requestId: 'r4',
            toolId: 't4',
            toolType: 'Bash',
            filePath: 'terminal',
            directory: '.',
            command: 'pnpm test',
            status: 'denied',
          }),
        ]}
        {...defaultCallbacks}
      />
    </div>
  ),
  name: 'Panel — Mixed States (approved + pending + denied)',
};

export const PanelAllReviewed: StoryObj<typeof FileChangeReviewPanel> = {
  render: () => (
    <div className="max-w-[600px]">
      <FileChangeReviewPanel
        changes={[
          makeChange({
            requestId: 'r1',
            toolId: 't1',
            toolType: 'Edit',
            filePath: 'src/index.ts',
            directory: 'src',
            oldContent: 'export {};',
            newContent: 'export { App };',
            status: 'approved',
            approvalMethod: 'manual',
          }),
          makeChange({
            requestId: 'r2',
            toolId: 't2',
            toolType: 'Edit',
            filePath: 'src/app.tsx',
            directory: 'src',
            oldContent: 'function App() {}',
            newContent: 'export function App() { return <div />; }',
            status: 'approved',
            approvalMethod: 'session_rule',
          }),
        ]}
        {...defaultCallbacks}
      />
    </div>
  ),
  name: 'Panel — All Reviewed',
};

export const PanelCollapsed: StoryObj<typeof FileChangeReviewPanel> = {
  render: () => (
    <div className="max-w-[600px]">
      <FileChangeReviewPanel
        changes={[
          makeChange({
            requestId: 'r1',
            toolId: 't1',
            toolType: 'Edit',
            filePath: 'src/index.ts',
            directory: 'src',
            oldContent: 'export {};',
            newContent: 'export { App };',
          }),
          makeChange({
            requestId: 'r2',
            toolId: 't2',
            toolType: 'Write',
            filePath: 'src/app.tsx',
            directory: 'src',
            newContent: 'export function App() {}',
          }),
        ]}
        collapsed={true}
        {...defaultCallbacks}
      />
    </div>
  ),
  name: 'Panel — Collapsed',
};

export const PanelStreaming: StoryObj<typeof FileChangeReviewPanel> = {
  render: () => (
    <div className="max-w-[600px]">
      <FileChangeReviewPanel
        changes={[
          makeChange({
            requestId: 'r1',
            toolId: 't1',
            toolType: 'Edit',
            filePath: 'src/components/user-profile.tsx',
            directory: 'src/components',
            oldContent: TS_OLD,
            newContent: TS_NEW,
            status: 'approved',
            approvalMethod: 'manual',
          }),
          makeChange({
            requestId: 'r2',
            toolId: 't2',
            toolType: 'Write',
            filePath: 'src/components/status-badge.tsx',
            directory: 'src/components',
            newContent: 'export function StatusBadge() {\n  return <span className="badge"',
            isStreaming: true,
          }),
        ]}
        {...defaultCallbacks}
      />
    </div>
  ),
  name: 'Panel — With Streaming Change',
};

export const PanelLargeMultiHunk: StoryObj<typeof FileChangeReviewPanel> = {
  render: () => (
    <div className="max-w-[600px]">
      <FileChangeReviewPanel
        changes={[
          makeChange({
            requestId: 'r1',
            toolId: 't1',
            toolType: 'Edit',
            filePath: 'src/services/data-processor.ts',
            directory: 'src/services',
            oldContent: LARGE_FILE_OLD,
            newContent: LARGE_FILE_NEW,
          }),
        ]}
        {...defaultCallbacks}
      />
    </div>
  ),
  name: 'Panel — Large File Multi-Hunk',
};

/** Interactive demo — approve/deny changes and see state transitions */
export const PanelInteractive: StoryObj<typeof FileChangeReviewPanel> = {
  render: function InteractivePanel() {
    const [collapsed, setCollapsed] = useState(false);

    const changes: PendingChange[] = [
      makeChange({
        requestId: 'r1',
        toolId: 't1',
        toolType: 'Edit',
        filePath: 'src/components/user-profile.tsx',
        directory: 'src/components',
        oldContent: TS_OLD,
        newContent: TS_NEW,
      }),
      makeChange({
        requestId: 'r2',
        toolId: 't2',
        toolType: 'Write',
        filePath: 'src/components/status-badge.tsx',
        directory: 'src/components',
        newContent: NEW_COMPONENT,
      }),
      makeChange({
        requestId: 'r3',
        toolId: 't3',
        toolType: 'Edit',
        filePath: 'app/utils/pricing.py',
        directory: 'app/utils',
        oldContent: PY_OLD,
        newContent: PY_NEW,
      }),
      makeChange({
        requestId: 'r4',
        toolId: 't4',
        toolType: 'Bash',
        filePath: 'terminal',
        directory: '.',
        command: 'pnpm --filter @vienna/chat-ui typecheck',
      }),
      makeChange({
        requestId: 'r5',
        toolId: 't5',
        toolType: 'Edit',
        filePath: 'src/styles/layout.css',
        directory: 'src/styles',
        oldContent: CSS_OLD,
        newContent: CSS_NEW,
      }),
    ];

    return (
      <div className="max-w-[600px] space-y-4">
        <p className="text-xs text-muted-foreground">
          Use j/k to navigate, Enter/a to approve, Escape/d to deny, Shift+Enter to approve all.
          Click items to focus, click again to expand.
        </p>
        <FileChangeReviewPanel
          changes={changes}
          collapsed={collapsed}
          onCollapseChange={setCollapsed}
          onApprove={fn()}
          onApproveMultiple={fn()}
          onApproveAll={fn()}
          onDeny={fn()}
          onDenyMultiple={fn()}
          onDenyAll={fn()}
          onAllowAllForSession={fn()}
          onAllowAllPermanently={fn()}
          onRevokeRule={fn()}
        />
      </div>
    );
  },
  name: 'Panel — Interactive (Keyboard Nav)',
};

export const PanelManyLanguages: StoryObj<typeof FileChangeReviewPanel> = {
  render: () => (
    <div className="max-w-[600px]">
      <FileChangeReviewPanel
        changes={[
          makeChange({
            requestId: 'r1',
            toolId: 't1',
            toolType: 'Edit',
            filePath: 'src/app.tsx',
            directory: 'src',
            oldContent: TS_OLD,
            newContent: TS_NEW,
          }),
          makeChange({
            requestId: 'r2',
            toolId: 't2',
            toolType: 'Edit',
            filePath: 'app/pricing.py',
            directory: 'app',
            oldContent: PY_OLD,
            newContent: PY_NEW,
          }),
          makeChange({
            requestId: 'r3',
            toolId: 't3',
            toolType: 'Edit',
            filePath: 'src/processor.rs',
            directory: 'src',
            oldContent: RUST_OLD,
            newContent: RUST_NEW,
          }),
          makeChange({
            requestId: 'r4',
            toolId: 't4',
            toolType: 'Edit',
            filePath: 'src/styles/layout.css',
            directory: 'src/styles',
            oldContent: CSS_OLD,
            newContent: CSS_NEW,
          }),
          makeChange({
            requestId: 'r5',
            toolId: 't5',
            toolType: 'Edit',
            filePath: 'package.json',
            directory: '.',
            oldContent: '{\n  "version": "0.0.1"\n}',
            newContent: '{\n  "version": "0.1.0"\n}',
          }),
        ]}
        {...defaultCallbacks}
      />
    </div>
  ),
  name: 'Panel — Many Languages (TS, Python, Rust, CSS, JSON)',
};

export const PanelWithReviewButton: StoryObj<typeof FileChangeReviewPanel> = {
  render: () => (
    <div className="max-w-[600px]">
      <FileChangeReviewPanel
        changes={[
          makeChange({
            requestId: 'r1',
            toolId: 't1',
            toolType: 'Edit',
            filePath: 'src/index.ts',
            directory: 'src',
            oldContent: 'export {};',
            newContent: 'export { main };',
          }),
        ]}
        onReviewClick={fn()}
        {...defaultCallbacks}
      />
    </div>
  ),
  name: 'Panel — With Review Button',
};

/**
 * Verifies that the "Allow All" dropdown escapes overflow-hidden containers.
 * The panel is rendered inside a narrow, overflow-hidden box to simulate the
 * clipping that occurs in narrow tool use cards (e.g. "Writing file...").
 * Opening the dropdown should show all options above the container boundary.
 */
export const PanelDropdownClipping: StoryObj<typeof FileChangeReviewPanel> = {
  render: () => (
    <div className="max-w-[400px]">
      <p className="mb-4 text-xs text-muted-foreground">
        The panel below is inside an overflow-hidden container. Click the chevron
        next to &quot;Allow All&quot; — the dropdown should NOT be clipped.
      </p>
      <div className="overflow-hidden rounded-lg border border-border-muted" style={{ maxHeight: 120 }}>
        <FileChangeReviewPanel
          changes={[
            makeChange({
              requestId: 'r1',
              toolId: 't1',
              toolType: 'Write',
              filePath: 'src/index.ts',
              directory: 'src',
              oldContent: '',
              newContent: 'export const main = () => {};',
            }),
          ]}
          {...defaultCallbacks}
        />
      </div>
    </div>
  ),
  name: 'Panel — Dropdown Clipping (overflow-hidden)',
};
