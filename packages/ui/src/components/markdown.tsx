/**
 * Markdown — Renders raw markdown as styled HTML with syntax highlighting
 *
 * @ai-context
 * - Uses `marked` for GFM parsing with breaks enabled
 * - `highlight.js` for code syntax highlighting (190+ languages)
 * - Rich blocks: ```mermaid and ```chart fenced code blocks rendered as React components
 * - MermaidBlock and ChartBlock are lazy-loaded via React.lazy
 * - Fast path: no rich blocks = single dangerouslySetInnerHTML (no overhead)
 * - .vienna-md CSS class for prose styling
 * - External links open via window.api.shell.openExternal (Electron) or window.open
 * - data-slot="markdown"
 *
 * @props
 * - content: Raw markdown string
 * - html: Pre-parsed HTML (takes precedence over content)
 * - size: "sm" | "md" | "lg"
 *
 * @example
 * <Markdown content="# Hello\n\nSome **bold** text" />
 * <Markdown content={description} size="sm" />
 */
import * as React from 'react';
import { Marked } from 'marked';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils/cn';
import { Copy, Check } from 'lucide-react';
import hljs from 'highlight.js';

hljs.registerAliases(['jsx'], { languageName: 'javascript' });
hljs.registerAliases(['tsx'], { languageName: 'typescript' });

const markdownVariants = cva('vienna-md', {
  variants: {
    size: {
      sm: '[font-size:var(--text-sm)] [line-height:var(--text-sm--line-height)]',
      md: '[font-size:var(--text-base)] [line-height:var(--text-base--line-height)]',
      lg: '[font-size:var(--text-md)] [line-height:var(--text-md--line-height)]',
    },
  },
  defaultVariants: { size: 'md' },
});

interface RichBlock {
  type: 'mermaid' | 'chart' | 'code';
  code: string;
  lang?: string;
  id: string;
}

interface ParseResult {
  html: string;
  blocks: RichBlock[];
}

const LazyMermaidBlock = React.lazy(() =>
  import('./mermaid-block').then((mod) => ({ default: mod.MermaidBlock }))
);

const LazyChartBlock = React.lazy(() =>
  import('./chart-block').then((mod) => ({ default: mod.ChartBlock }))
);

let blockIdCounter = 0;

function parseMarkdown(content: string): ParseResult {
  const blocks: RichBlock[] = [];
  const md = new Marked();

  md.use({
    renderer: {
      code({ text, lang }: { text: string; lang?: string | undefined }) {
        if (lang === 'mermaid') {
          const id = `vienna-rb-${++blockIdCounter}`;
          blocks.push({ type: 'mermaid', code: text, id });
          return `<div data-vienna-rich="${id}"></div>`;
        }
        if (lang === 'chart') {
          const id = `vienna-rb-${++blockIdCounter}`;
          blocks.push({ type: 'chart', code: text, id });
          return `<div data-vienna-rich="${id}"></div>`;
        }
        const id = `vienna-rb-${++blockIdCounter}`;
        blocks.push({ type: 'code', code: text, lang: lang || undefined, id });
        return `<div data-vienna-rich="${id}"></div>`;
      },
    },
  });

  const html = md.parse(content, { breaks: true, gfm: true }) as string;
  return { html, blocks };
}

function CodeBlockComponent({ block }: { block: RichBlock }) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(block.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const highlighted = React.useMemo(() => {
    const lang = block.lang?.trim().toLowerCase();
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(block.code, { language: lang }).value;
      } catch {
        // fall through to plain text
      }
    }
    return null;
  }, [block.code, block.lang]);

  return (
    <div className="vienna-md-code">
      {block.lang && (
        <div className="vienna-md-code-header">
          <span className="vienna-md-code-lang">{block.lang}</span>
        </div>
      )}
      <button
        onClick={handleCopy}
        onMouseDown={(e) => e.preventDefault()}
        className="vienna-md-code-copy"
        title={copied ? 'Copied!' : 'Copy code'}
      >
        {copied ? <Check size={12} /> : <Copy size={12} />}
      </button>
      <pre>
        {highlighted != null ? (
          <code className="hljs" dangerouslySetInnerHTML={{ __html: highlighted }} />
        ) : (
          <code>{block.code}</code>
        )}
      </pre>
    </div>
  );
}

function RichBlockRenderer({ block }: { block: RichBlock }) {
  if (block.type === 'code') {
    return <CodeBlockComponent block={block} />;
  }

  return (
    <React.Suspense
      fallback={
        <div
          className={
            block.type === 'mermaid' ? 'vienna-md-mermaid-loading' : 'vienna-md-chart-loading'
          }
          aria-label={`Loading ${block.type}`}
        />
      }
    >
      {block.type === 'mermaid' ? (
        <LazyMermaidBlock code={block.code} />
      ) : (
        <LazyChartBlock json={block.code} />
      )}
    </React.Suspense>
  );
}

function handleExternalLinkClick(e: React.MouseEvent<HTMLDivElement>) {
  const anchor = (e.target as HTMLElement).closest('a');
  if (!anchor) return;
  const href = anchor.getAttribute('href');
  if (!href || (!href.startsWith('http://') && !href.startsWith('https://'))) return;
  e.preventDefault();
  if (typeof window !== 'undefined' && 'api' in window) {
    void (
      window.api as { shell: { openExternal: (opts: { url: string }) => void } }
    ).shell.openExternal({ url: href });
  } else {
    window.open(href, '_blank', 'noopener,noreferrer');
  }
}

type MarkdownProps = Omit<React.ComponentProps<'div'>, 'children'> &
  VariantProps<typeof markdownVariants> & {
    content?: string;
    html?: string;
  };

function Markdown({ className, content, html, size, ...props }: MarkdownProps) {
  const { html: rendered, blocks } = React.useMemo<ParseResult>(() => {
    if (html) return { html, blocks: [] };
    if (!content) return { html: '', blocks: [] };
    return parseMarkdown(content);
  }, [content, html]);

  if (!rendered) return null;

  if (blocks.length === 0) {
    return (
      <div
        data-slot="markdown"
        className={cn(markdownVariants({ size }), className)}
        dangerouslySetInnerHTML={{ __html: rendered }}
        onClick={handleExternalLinkClick}
        {...props}
      />
    );
  }

  const segments: React.ReactNode[] = [];
  let remaining = rendered;

  for (const block of blocks) {
    const placeholder = `<div data-vienna-rich="${block.id}"></div>`;
    const idx = remaining.indexOf(placeholder);
    if (idx === -1) continue;

    const before = remaining.slice(0, idx);
    if (before) {
      segments.push(<div key={`html-${block.id}`} dangerouslySetInnerHTML={{ __html: before }} />);
    }

    segments.push(<RichBlockRenderer key={block.id} block={block} />);
    remaining = remaining.slice(idx + placeholder.length);
  }

  if (remaining) {
    segments.push(<div key="html-tail" dangerouslySetInnerHTML={{ __html: remaining }} />);
  }

  return (
    <div
      data-slot="markdown"
      className={cn(markdownVariants({ size }), className)}
      onClick={handleExternalLinkClick}
      {...props}
    >
      {segments}
    </div>
  );
}

export { Markdown, markdownVariants };
export type { MarkdownProps };
