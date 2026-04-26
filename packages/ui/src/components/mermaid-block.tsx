/**
 * MermaidBlock — Renders Mermaid diagrams as SVG
 *
 * @ai-context
 * - Lazy-loads the mermaid library (singleton pattern)
 * - Initializes with neutral theme and strict security
 * - Renders diagrams as SVG via async rendering
 * - Loading/error states with fallback code display
 * - Cancels render on unmount
 * - data-slot="mermaid-block"
 *
 * @example
 * <React.Suspense fallback={<Skeleton className="h-48" />}>
 *   <MermaidBlock code="graph TD; A-->B" />
 * </React.Suspense>
 */
import * as React from 'react';
import type MermaidAPI from 'mermaid';

export interface MermaidBlockProps {
  code: string;
  className?: string;
}

let mermaidPromise: Promise<{ default: typeof MermaidAPI }> | null = null;
let mermaidInitialized = false;

function getMermaid() {
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid').then((mod) => {
      if (!mermaidInitialized) {
        mod.default.initialize({
          startOnLoad: false,
          theme: 'neutral',
          securityLevel: 'strict',
          fontFamily: 'var(--font-sans)',
        });
        mermaidInitialized = true;
      }
      return mod;
    });
  }
  return mermaidPromise;
}

let renderCounter = 0;

function MermaidBlock({ code, className }: MermaidBlockProps) {
  const [state, setState] = React.useState<'loading' | 'rendered' | 'error'>('loading');
  const [svgHtml, setSvgHtml] = React.useState('');
  const [errorMsg, setErrorMsg] = React.useState('');

  React.useEffect(() => {
    let cancelled = false;
    const id = `vienna-mermaid-${++renderCounter}`;

    setState('loading');
    setSvgHtml('');

    getMermaid()
      .then(async (mod) => {
        if (cancelled) return;
        try {
          const { svg } = await mod.default.render(id, code);
          if (cancelled) return;
          setSvgHtml(svg);
          setState('rendered');
        } catch (err) {
          if (cancelled) return;
          setErrorMsg(err instanceof Error ? err.message : 'Mermaid render failed');
          setState('error');
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setErrorMsg(err instanceof Error ? err.message : 'Failed to load mermaid');
        setState('error');
      });

    return () => {
      cancelled = true;
    };
  }, [code]);

  if (state === 'error') {
    return (
      <div data-slot="mermaid-block" className={`vienna-md-fallback ${className ?? ''}`}>
        <pre>
          <code>{code}</code>
        </pre>
        <span className="vienna-md-fallback-msg">{errorMsg}</span>
      </div>
    );
  }

  if (state === 'rendered') {
    return (
      <div
        data-slot="mermaid-block"
        className={`vienna-md-mermaid ${className ?? ''}`}
        dangerouslySetInnerHTML={{ __html: svgHtml }}
      />
    );
  }

  return (
    <div data-slot="mermaid-block" className={`vienna-md-mermaid ${className ?? ''}`}>
      <div className="vienna-md-mermaid-loading" aria-label="Loading diagram" />
    </div>
  );
}

export { MermaidBlock };
