/**
 * NanoContext Stories
 *
 * Comprehensive storybook demonstrating all NanoContext components.
 *
 * @module chat-ui/NanoContext/stories
 */

import { useState, useCallback } from 'react';
import type { Meta } from '@storybook/react';
import { action } from '@storybook/test';
import { NanoContextWidget } from './nano-context-widget';
import { NanoContextPreview, NanoContextPreviewList } from './nano-context-preview';
import { SelectionPopover } from './selection-popover';
import { NanoContextProvider, useNanoContext } from './nano-context-provider';
import {
  createDrawerSelectionContext,
  createEntityReferenceContext,
  createCodeSelectionContext,
} from './factories';
import type { NanoContext } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Meta
// ─────────────────────────────────────────────────────────────────────────────

const meta: Meta = {
  title: 'NanoContext',
};
export default meta;

// ─────────────────────────────────────────────────────────────────────────────
// Sample Data
// ─────────────────────────────────────────────────────────────────────────────

const SAMPLE_CODE = `function fibonacci(n: number): number {
  if (n <= 1) return n;
  let a = 0, b = 1;
  for (let i = 2; i <= n; i++) {
    const temp = a + b;
    a = b;
    b = temp;
  }
  return b;
}

// Usage
console.log(fibonacci(10)); // 55
console.log(fibonacci(20)); // 6765`;

const LONG_CONTENT = Array.from(
  { length: 25 },
  (_, i) =>
    `Line ${i + 1}: ${i % 3 === 0 ? 'const result = await processData(input);' : i % 3 === 1 ? '// Handle edge cases for null values' : 'return { status: "ok", data: result };'}`
).join('\n');

const SAMPLE_DRAWER_CONTEXT = createDrawerSelectionContext({
  title: 'Selection from Linear Issue',
  subtitle: 'ENG-1234',
  drawer: {
    drawerId: 'drawer-linear-123',
    drawerTitle: 'ENG-1234: Fix auth regression',
    entityUri: '@vienna//linear_issue/ENG-1234',
  },
  selectedText:
    'The authentication token is being invalidated prematurely when the user navigates between pages. This causes a 401 error on subsequent API calls.',
});

const SAMPLE_ENTITY_CONTEXT = createEntityReferenceContext({
  title: 'GitHub PR #42',
  subtitle: 'feat: add dark mode support',
  entity: {
    entityType: 'github_pr',
    id: '42',
    title: 'feat: add dark mode support',
    uri: '@vienna//github_pr/vienna/app/42',
    source: 'github',
  },
  content:
    'This PR adds dark mode support to the application. It includes:\n- Theme context provider\n- CSS variable-based theming\n- System preference detection\n- Toggle component in settings',
});

const SAMPLE_CODE_CONTEXT = createCodeSelectionContext({
  title: 'fibonacci.ts',
  subtitle: 'Lines 1-14',
  file: {
    filePath: '/src/utils/fibonacci.ts',
    fileName: 'fibonacci.ts',
    language: 'typescript',
  },
  selectedText: SAMPLE_CODE,
  selectionRange: {
    startLine: 1,
    startColumn: 1,
    endLine: 14,
    endColumn: 35,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Widget Stories
// ─────────────────────────────────────────────────────────────────────────────

function WidgetDrawerInner() {
  return (
    <div style={{ maxWidth: 600, padding: 24 }}>
      <NanoContextWidget
        contextType="drawer_selection"
        title="Selection from Linear Issue"
        subtitle="ENG-1234"
        content="The authentication token is being invalidated prematurely when the user navigates between pages. This causes a 401 error on subsequent API calls."
        metadata={{
          drawerTitle: 'ENG-1234: Fix auth regression',
          entityUri: '@vienna//linear_issue/ENG-1234',
        }}
      />
    </div>
  );
}
export const WidgetDrawer = () => <WidgetDrawerInner />;
WidgetDrawer.storyName = 'Widget / Drawer Selection';

function WidgetCodeInner() {
  return (
    <div style={{ maxWidth: 600, padding: 24 }}>
      <NanoContextWidget
        contextType="code_selection"
        title="fibonacci.ts"
        subtitle="Lines 1-14"
        content={SAMPLE_CODE}
        metadata={{
          filePath: '/src/utils/fibonacci.ts',
          fileName: 'fibonacci.ts',
          language: 'typescript',
        }}
      />
    </div>
  );
}
export const WidgetCode = () => <WidgetCodeInner />;
WidgetCode.storyName = 'Widget / Code Selection';

function WidgetEntityInner() {
  return (
    <div style={{ maxWidth: 600, padding: 24 }}>
      <NanoContextWidget
        contextType="entity_reference"
        title="GitHub PR #42"
        subtitle="feat: add dark mode support"
        content="This PR adds dark mode support to the application. It includes:\n- Theme context provider\n- CSS variable-based theming\n- System preference detection\n- Toggle component in settings"
        metadata={{
          entityType: 'github_pr',
          entityUri: '@vienna//github_pr/vienna/app/42',
        }}
      />
    </div>
  );
}
export const WidgetEntity = () => <WidgetEntityInner />;
WidgetEntity.storyName = 'Widget / Entity Reference';

function WidgetPluginInner() {
  return (
    <div style={{ maxWidth: 600, padding: 24 }}>
      <NanoContextWidget
        contextType="plugin_context"
        title="Production Deployment"
        subtitle="vercel.com"
        content="Deployment dpl_abc123 failed\nProject: vienna-app\nBranch: main\nCommit: fix: resolve auth race condition\nError: Build failed - TypeScript errors in src/auth.ts"
        metadata={{
          pluginId: 'vercel',
          deploymentId: 'dpl_abc123',
        }}
      />
    </div>
  );
}
export const WidgetPlugin = () => <WidgetPluginInner />;
WidgetPlugin.storyName = 'Widget / Plugin Context';

function WidgetLongContentInner() {
  return (
    <div style={{ maxWidth: 600, padding: 24 }}>
      <NanoContextWidget
        contextType="code_selection"
        title="data-processor.ts"
        subtitle="Lines 1-25"
        content={LONG_CONTENT}
        metadata={{
          filePath: '/src/utils/data-processor.ts',
          language: 'typescript',
        }}
      />
    </div>
  );
}
export const WidgetLongContent = () => <WidgetLongContentInner />;
WidgetLongContent.storyName = 'Widget / Long Content (Expandable)';

function WidgetAllTypesInner() {
  return (
    <div style={{ maxWidth: 600, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <NanoContextWidget
        contextType="drawer_selection"
        title="Drawer Selection"
        content="Selected text from a drawer panel"
        metadata={{ drawerTitle: 'Issue Details' }}
      />
      <NanoContextWidget
        contextType="code_selection"
        title="Code Selection"
        content="const x = 42;"
        metadata={{ filePath: '/src/app.ts', language: 'typescript' }}
      />
      <NanoContextWidget
        contextType="entity_reference"
        title="Entity Reference"
        content="Issue description content here"
        metadata={{ entityType: 'linear_issue', entityUri: '@vienna//linear_issue/123' }}
      />
      <NanoContextWidget
        contextType="plugin_context"
        title="Plugin Context"
        content="Plugin-specific data"
        metadata={{ pluginId: 'custom-plugin' }}
      />
    </div>
  );
}
export const WidgetAllTypes = () => <WidgetAllTypesInner />;
WidgetAllTypes.storyName = 'Widget / All Types Gallery';

// ─────────────────────────────────────────────────────────────────────────────
// Preview Stories
// ─────────────────────────────────────────────────────────────────────────────

function PreviewSingleInner() {
  return (
    <div style={{ maxWidth: 500, padding: 24 }}>
      <NanoContextPreview
        context={SAMPLE_DRAWER_CONTEXT}
        onDismiss={action('Dismissed')}
      />
    </div>
  );
}
export const PreviewSingle = () => <PreviewSingleInner />;
PreviewSingle.storyName = 'Preview / Single Card';

function PreviewExpandedInner() {
  return (
    <div style={{ maxWidth: 500, padding: 24 }}>
      <NanoContextPreview
        context={SAMPLE_CODE_CONTEXT}
        expanded
        onDismiss={action('Dismissed')}
      />
    </div>
  );
}
export const PreviewExpanded = () => <PreviewExpandedInner />;
PreviewExpanded.storyName = 'Preview / Expanded';

function PreviewEditableInner() {
  const [ctx, setCtx] = useState(SAMPLE_DRAWER_CONTEXT);
  return (
    <div style={{ maxWidth: 500, padding: 24 }}>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
        Click the pencil icon to edit. Cmd/Ctrl+Enter to save, Escape to cancel.
      </p>
      <NanoContextPreview
        context={ctx}
        onDismiss={action('Dismissed')}
        onUpdateContent={(newContent) => {
          setCtx({ ...ctx, selectedText: newContent } as typeof ctx);
          action('Updated')(newContent);
        }}
      />
    </div>
  );
}
export const PreviewEditable = () => <PreviewEditableInner />;
PreviewEditable.storyName = 'Preview / Editable';

function PreviewListInner() {
  const [contexts, setContexts] = useState<NanoContext[]>([
    SAMPLE_DRAWER_CONTEXT,
    SAMPLE_CODE_CONTEXT,
    SAMPLE_ENTITY_CONTEXT,
  ]);

  return (
    <div style={{ maxWidth: 500, padding: 24 }}>
      <NanoContextPreviewList
        contexts={contexts}
        onRemove={(id) => setContexts((prev) => prev.filter((c) => c.id !== id))}
        onUpdateContent={(id, newContent) => {
          setContexts((prev) =>
            prev.map((c) => {
              if (c.id !== id) return c;
              if (c.type === 'drawer_selection' || c.type === 'code_selection') {
                return { ...c, selectedText: newContent };
              }
              return { ...c, content: newContent } as typeof c;
            })
          );
        }}
        onClearAll={() => setContexts([])}
      />
      {contexts.length === 0 && (
        <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: 24 }}>
          All contexts cleared. Refresh to reset.
        </p>
      )}
    </div>
  );
}
export const PreviewList = () => <PreviewListInner />;
PreviewList.storyName = 'Preview / Multi-Context List';

// ─────────────────────────────────────────────────────────────────────────────
// SelectionPopover Story
// ─────────────────────────────────────────────────────────────────────────────

function PopoverDemoInner() {
  const [captured, setCaptured] = useState(false);
  return (
    <div
      style={{
        position: 'relative',
        width: 400,
        height: 200,
        padding: 24,
        border: '1px dashed var(--border-default)',
        borderRadius: 8,
      }}
    >
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
        The floating popover appears near text selections. Click it to capture.
      </p>
      {captured ? (
        <p style={{ fontSize: 12, color: 'var(--text-success)' }}>
          Context captured! The popover would disappear.
        </p>
      ) : (
        <SelectionPopover
          visible
          position={{ x: 150, y: 80 }}
          onCapture={() => setCaptured(true)}
        />
      )}
    </div>
  );
}
export const PopoverDemo = () => <PopoverDemoInner />;
PopoverDemo.storyName = 'SelectionPopover';

// ─────────────────────────────────────────────────────────────────────────────
// Provider Integration Story
// ─────────────────────────────────────────────────────────────────────────────

function ProviderDemoContent() {
  const { pendingContexts, attachContext, removeContext, clearContexts, consumeContexts } =
    useNanoContext();
  const [consumed, setConsumed] = useState<NanoContext[]>([]);

  const addDrawer = useCallback(() => {
    attachContext(
      createDrawerSelectionContext({
        title: `Selection ${Date.now() % 1000}`,
        subtitle: 'From drawer',
        drawer: { drawerId: `d-${Date.now()}`, drawerTitle: 'Test Drawer' },
        selectedText: 'Some selected text from the drawer content area.',
      })
    );
  }, [attachContext]);

  const addEntity = useCallback(() => {
    attachContext(
      createEntityReferenceContext({
        title: `Issue ${Date.now() % 1000}`,
        entity: {
          entityType: 'linear_issue',
          id: `LIN-${Date.now() % 1000}`,
          title: 'Test Issue',
          uri: `@vienna//linear_issue/LIN-${Date.now() % 1000}`,
        },
        content: 'This is the issue description with details about the bug.',
      })
    );
  }, [attachContext]);

  const addCode = useCallback(() => {
    attachContext(
      createCodeSelectionContext({
        title: 'app.ts',
        file: { filePath: '/src/app.ts', fileName: 'app.ts', language: 'typescript' },
        selectedText: 'const app = express();\napp.use(cors());\napp.listen(3000);',
      })
    );
  }, [attachContext]);

  const handleConsume = useCallback(() => {
    const result = consumeContexts();
    setConsumed(result);
  }, [consumeContexts]);

  return (
    <div style={{ maxWidth: 600, padding: 24 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <button onClick={addDrawer} style={buttonStyle}>
          + Drawer Selection
        </button>
        <button onClick={addEntity} style={buttonStyle}>
          + Entity Reference
        </button>
        <button onClick={addCode} style={buttonStyle}>
          + Code Selection
        </button>
        <button onClick={handleConsume} style={{ ...buttonStyle, borderColor: 'var(--border-ai)' }}>
          Consume All
        </button>
        <button
          onClick={clearContexts}
          style={{ ...buttonStyle, borderColor: 'var(--border-error)' }}
        >
          Clear
        </button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <h4
          style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}
        >
          Pending Contexts ({pendingContexts.length})
        </h4>
        <NanoContextPreviewList
          contexts={pendingContexts}
          onRemove={removeContext}
          onClearAll={clearContexts}
        />
        {pendingContexts.length === 0 && (
          <p style={{ fontSize: 12, color: 'var(--text-muted)', padding: '12px 0' }}>
            No pending contexts. Click the buttons above to add some.
          </p>
        )}
      </div>

      {consumed.length > 0 && (
        <div>
          <h4
            style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}
          >
            Last Consumed ({consumed.length})
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {consumed.map((ctx) => (
              <NanoContextWidget
                key={ctx.id}
                contextType={ctx.type}
                title={ctx.title}
                subtitle={ctx.subtitle}
                content={
                  ctx.type === 'drawer_selection' || ctx.type === 'code_selection'
                    ? ctx.selectedText
                    : ctx.content
                }
                metadata={
                  ctx.type === 'drawer_selection'
                    ? { drawerTitle: ctx.drawer.drawerTitle }
                    : ctx.type === 'entity_reference'
                      ? { entityType: ctx.entity.entityType }
                      : {}
                }
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  padding: '6px 12px',
  fontSize: 12,
  fontWeight: 500,
  border: '1px solid var(--border-default)',
  borderRadius: 6,
  backgroundColor: 'var(--surface-elevated)',
  color: 'var(--text-primary)',
  cursor: 'pointer',
};

function ProviderDemoInner() {
  return (
    <NanoContextProvider>
      <ProviderDemoContent />
    </NanoContextProvider>
  );
}
export const ProviderIntegration = () => <ProviderDemoInner />;
ProviderIntegration.storyName = 'Provider / Integration Demo';
