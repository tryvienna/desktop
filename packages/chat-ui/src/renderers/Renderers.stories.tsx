/**
 * Content Renderer Storybooks
 *
 * Interactive documentation for all content renderers.
 * Each story demonstrates the renderer with realistic content blocks.
 *
 * System renderers are covered in SystemWidgets.stories.tsx — this
 * file focuses on the content-level renderers (text, code, thinking,
 * image, entity text, paste text).
 *
 * @module chat-ui/renderers/Renderers.stories
 */

import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import { TextRenderer } from './text-renderer';
import { ThinkingRenderer } from './thinking-renderer';
import { CodeRenderer } from './code-renderer';
import { ImageAttachmentRenderer } from './image-attachment-renderer';
import { EntityTextRenderer, EntityClickProvider } from './entity-text-renderer';
import { PasteTextRenderer, PasteEditorProvider } from './paste-text-renderer';
import { EntityWidgetProvider } from './entity-widget-context';
import { createDefaultRendererRegistry, RendererRegistryProvider } from './index';
import type {
  ContentBlock,
  TextBlock,
  ThinkingBlock,
  CodeBlock,
  ImageAttachmentBlock,
} from '../types/messages';

const meta: Meta = {
  title: 'Content Renderers',
  parameters: {
    layout: 'padded',
    backgrounds: { default: 'dark' },
    docs: {
      description: {
        component: `
# Content Renderers

Priority-based renderer system for all content block types in messages.
Each renderer matches specific ContentBlock types via type guards and
renders them with consistent styling.

## Priority Order
- **30** — System renderers (model_change, rate_limit, etc.)
- **15** — Paste text (text with paste markup)
- **10** — Entity text (text with entity URIs), Code
- **5**  — Thinking, Image attachment
- **0**  — Plain text (catch-all fallback)

## Registry Usage
\`\`\`tsx
const registry = createDefaultRendererRegistry();
<RendererRegistryProvider value={registry}>
  <MessageList />
</RendererRegistryProvider>
\`\`\`
        `,
      },
    },
  },
};

export default meta;

const wrapStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  maxWidth: 640,
  padding: 24,
};

const MSG_ID = 'story-msg-001';

// ─── TextRenderer ───────────────────────────────────────────────────────

export const Text: StoryObj = {
  render: () => (
    <div style={wrapStyle}>
      <TextRenderer
        content={{ type: 'text', text: 'Hello! This is a simple text message.' } as TextBlock}
        messageId={MSG_ID}
      />
      <TextRenderer
        content={
          {
            type: 'text',
            text: 'Multi-line text preserves\nwhitespace formatting\n  including indentation.',
          } as TextBlock
        }
        messageId={MSG_ID}
      />
      <TextRenderer
        content={{ type: 'text', text: 'Streaming message in progress...' } as TextBlock}
        messageId={MSG_ID}
        isStreaming
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          '**TextRenderer** — Base text renderer with pre-wrap whitespace. Priority 0 (catch-all for text blocks).',
      },
    },
  },
};

// ─── ThinkingRenderer ───────────────────────────────────────────────────

export const Thinking: StoryObj = {
  render: () => (
    <div style={wrapStyle}>
      <ThinkingRenderer
        content={
          {
            type: 'thinking',
            text: "Let me analyze this step by step:\n\n1. First, I need to understand the user's request\n2. Then identify the relevant files\n3. Finally, propose a solution\n\nThe user wants to add authentication to their API endpoints. I should check if there's an existing auth middleware...",
          } as ThinkingBlock
        }
        messageId={MSG_ID}
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          '**ThinkingRenderer** — Collapsible disclosure for thinking blocks. Click to expand and see the full thought process. Vienna-specific (drift-v2 does not render thinking).',
      },
    },
  },
};

export const ThinkingStreaming: StoryObj = {
  render: () => (
    <div style={wrapStyle}>
      <ThinkingRenderer
        content={
          {
            type: 'thinking',
            text: 'Processing the request...',
          } as ThinkingBlock
        }
        messageId={MSG_ID}
        isStreaming
      />
    </div>
  ),
  parameters: {
    docs: {
      description: { story: 'Thinking block during streaming — shows "streaming..." indicator.' },
    },
  },
};

// ─── CodeRenderer ───────────────────────────────────────────────────────

export const Code: StoryObj = {
  render: () => (
    <div style={wrapStyle}>
      <CodeRenderer
        content={
          {
            type: 'code',
            code: 'function greet(name: string): string {\n  return `Hello, ${name}!`;\n}',
            language: 'typescript',
            filename: 'greet.ts',
          } as CodeBlock
        }
        messageId={MSG_ID}
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          '**CodeRenderer** — Code block with filename header, language badge, and copy button. Priority 10.',
      },
    },
  },
};

export const CodeNoFilename: StoryObj = {
  render: () => (
    <div style={wrapStyle}>
      <CodeRenderer
        content={
          {
            type: 'code',
            code: 'pip install requests\npython -m pytest tests/',
            language: 'bash',
          } as CodeBlock
        }
        messageId={MSG_ID}
      />
    </div>
  ),
  parameters: {
    docs: { description: { story: 'Code block without filename — only shows language badge.' } },
  },
};

export const CodeMultiple: StoryObj = {
  render: () => (
    <div style={wrapStyle}>
      <CodeRenderer
        content={
          {
            type: 'code',
            code: 'export interface User {\n  id: string;\n  name: string;\n  email: string;\n  createdAt: Date;\n}',
            language: 'typescript',
            filename: 'types/user.ts',
          } as CodeBlock
        }
        messageId={MSG_ID}
      />
      <CodeRenderer
        content={
          {
            type: 'code',
            code: 'import { User } from "./types/user";\n\nconst users: User[] = await db.query("SELECT * FROM users");',
            language: 'typescript',
            filename: 'services/userService.ts',
          } as CodeBlock
        }
        messageId={MSG_ID}
      />
    </div>
  ),
  parameters: {
    docs: {
      description: { story: 'Multiple code blocks stacked — demonstrates visual separation.' },
    },
  },
};

// ─── ImageAttachmentRenderer ────────────────────────────────────────────

export const ImageAttachment: StoryObj = {
  render: () => (
    <div style={wrapStyle}>
      <ImageAttachmentRenderer
        content={
          {
            type: 'image_attachment',
            name: 'screenshot.png',
            size: 245_760,
            mimeType: 'image/png',
            previewUrl: 'https://placehold.co/400x200/1a1a2e/e0e0e0?text=Screenshot',
          } as ImageAttachmentBlock
        }
        messageId={MSG_ID}
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          '**ImageAttachmentRenderer** — Image preview with filename, size display, and click-to-expand. Priority 5.',
      },
    },
  },
};

// ─── EntityTextRenderer ─────────────────────────────────────────────────

export const EntityTextInlineChips: StoryObj = {
  render: () => (
    <div style={wrapStyle}>
      <EntityTextRenderer
        content={
          {
            type: 'text',
            text: 'I found the PR you mentioned: [@vienna//github_pr/anthropics/claude/42] and the related issue [@vienna//linear_issue/TEAM-123]. Both look relevant.',
          } as TextBlock
        }
        messageId={MSG_ID}
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          '**EntityTextRenderer** — Inline entity chips within text flow. Uses `[@vienna//type/path]` syntax. Priority 10.',
      },
    },
  },
};

export const EntityTextBlockCards: StoryObj = {
  render: () => (
    <div style={wrapStyle}>
      <EntityTextRenderer
        content={
          {
            type: 'text',
            text: 'Here is the pull request:\n\n[[@vienna//github_pr/anthropics/claude/42]]\n\nPlease review it when you get a chance.',
          } as TextBlock
        }
        messageId={MSG_ID}
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Block card rendering using `[[@vienna//type/path]]` syntax — renders as a full-width card.',
      },
    },
  },
};

export const EntityTextWithLabels: StoryObj = {
  render: () => {
    const label1 = btoa('Fix authentication flow');
    const label2 = btoa('#development');
    return (
      <div style={wrapStyle}>
        <EntityTextRenderer
          content={
            {
              type: 'text',
              text: `Check out [@vienna//github_pr/owner/repo/42?label=${label1}] and the channel [@vienna//slack_channel/C123?label=${label2}].`,
            } as TextBlock
          }
          messageId={MSG_ID}
        />
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Entity chips with custom base64-encoded labels via `?label=` query parameter.',
      },
    },
  },
};

export const EntityTextWithClickHandler: StoryObj = {
  render: () => {
    const [lastClick, setLastClick] = useState<string>('(click an entity)');
    return (
      <div style={wrapStyle}>
        <EntityClickProvider onEntityClick={(uri) => setLastClick(uri)}>
          <EntityTextRenderer
            content={
              {
                type: 'text',
                text: 'Click on [@vienna//github_pr/owner/repo/42] or [@vienna//linear_issue/TEAM-456] to see the click handler.',
              } as TextBlock
            }
            messageId={MSG_ID}
          />
        </EntityClickProvider>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
          Last clicked: {lastClick}
        </div>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story:
          'Entity chips with click handler via EntityClickProvider. Click events pass the full entity URI.',
      },
    },
  },
};

export const EntityTextWithCustomWidget: StoryObj = {
  render: () => (
    <div style={wrapStyle}>
      <EntityWidgetProvider
        renderer={({ entityType, pathSegments, compact }) => {
          if (entityType === 'github_pr') {
            return (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '2px 8px',
                  borderRadius: 4,
                  fontSize: '0.85em',
                  backgroundColor: 'rgba(139, 92, 246, 0.15)',
                  color: 'rgb(139, 92, 246)',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                }}
              >
                {compact ? '🔀' : '🔀 PR'} #{pathSegments[pathSegments.length - 1]}
              </span>
            );
          }
          return null;
        }}
      >
        <EntityTextRenderer
          content={
            {
              type: 'text',
              text: 'Custom widget for PRs: [@vienna//github_pr/owner/repo/42] but default for issues: [@vienna//linear_issue/TEAM-123].',
            } as TextBlock
          }
          messageId={MSG_ID}
        />
      </EntityWidgetProvider>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Custom entity widget renderer via EntityWidgetProvider. Returns custom JSX for github_pr, falls back to default for other types.',
      },
    },
  },
};

// ─── PasteTextRenderer ──────────────────────────────────────────────────

export const PasteText: StoryObj = {
  render: () => {
    const preview = btoa('const x = 42;\nconst y = x + 1;');
    const content = btoa('const x = 42;\nconst y = x + 1;\nconsole.log(y);');
    return (
      <div style={wrapStyle}>
        <PasteTextRenderer
          content={
            {
              type: 'text',
              text: `Here is the code I pasted: [paste://abc123?preview=${preview}&content=${content}&chars=48&lines=3]`,
            } as TextBlock
          }
          messageId={MSG_ID}
        />
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story:
          '**PasteTextRenderer** — Inline paste chip with click-to-view modal. Priority 15 (higher than entity text). Click the chip to see the full pasted content.',
      },
    },
  },
};

export const PasteTextWithProvider: StoryObj = {
  render: () => {
    const [lastPaste, setLastPaste] = useState<string | null>(null);
    const preview = btoa('function hello() {');
    const content = btoa('function hello() {\n  console.log("Hello, world!");\n}\n\nhello();');
    return (
      <div style={wrapStyle}>
        <PasteEditorProvider onPasteOpen={(paste) => setLastPaste(paste.content)}>
          <PasteTextRenderer
            content={
              {
                type: 'text',
                text: `I pasted this function: [paste://def456?preview=${preview}&content=${content}&chars=62&lines=5]`,
              } as TextBlock
            }
            messageId={MSG_ID}
          />
        </PasteEditorProvider>
        {lastPaste && (
          <div
            style={{
              padding: 12,
              borderRadius: 8,
              backgroundColor: 'var(--surface-sunken)',
              fontSize: 11,
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap',
              color: 'var(--text-primary)',
            }}
          >
            PasteEditorProvider received:\n{lastPaste}
          </div>
        )}
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story:
          'Paste chip with PasteEditorProvider — clicking delegates to the provider instead of opening the fallback modal.',
      },
    },
  },
};

// ─── Registry Demo ──────────────────────────────────────────────────────

function RegistryDemo() {
  const blocks: ContentBlock[] = [
    { type: 'text', text: 'Here is a simple text block.' } as TextBlock,
    { type: 'code', code: 'const x = 42;', language: 'typescript' } as CodeBlock,
    { type: 'thinking', text: 'Let me think about this...' } as ThinkingBlock,
    {
      type: 'text',
      text: 'And an entity reference: [@vienna//github_pr/owner/repo/99]',
    } as TextBlock,
  ];

  const registry = createDefaultRendererRegistry();

  return (
    <RendererRegistryProvider value={registry}>
      <div style={wrapStyle}>
        {blocks.map((block, i) => {
          const def = registry.getRenderer(block);
          if (!def)
            return (
              <div key={i} style={{ color: 'var(--text-error)', fontSize: 12 }}>
                No renderer for: {block.type}
              </div>
            );
          const Component = def.component;
          return <Component key={i} content={block} messageId={MSG_ID} />;
        })}
      </div>
    </RendererRegistryProvider>
  );
}

export const Registry: StoryObj = {
  render: () => <RegistryDemo />,
  parameters: {
    docs: {
      description: {
        story: `
**Registry Demo** — Shows the full renderer pipeline in action.
Multiple content blocks of different types are passed through
\`createDefaultRendererRegistry()\` and rendered by their matching
renderer. Priority ensures entity text (priority 10) wins over
plain text (priority 0) when entity markup is detected.
        `,
      },
    },
  },
};
