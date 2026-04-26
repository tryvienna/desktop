/**
 * ResultsPanel — Tabbed results: Response | SDL | History
 * With animated tab transitions and rich JSON display
 */

import { useState, useCallback } from 'react';
import { FileJson, FileCode, History, AlertCircle, Copy, Check, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { SPRINGS, TRANSITIONS } from '@/lib/animations';
import type { GraphQLResult } from '@/lib/graphql-client';
import type { HistoryEntry } from '@/hooks/use-history';

interface ResultsPanelProps {
  result: GraphQLResult | null;
  duration: number | null;
  loading: boolean;
  error: string | null;
  sdl: string | null;
  history: HistoryEntry[];
  onHistorySelect: (entry: HistoryEntry) => void;
  onHistoryClear: () => void;
}

type Tab = 'response' | 'sdl' | 'history';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
      title="Copy to clipboard"
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-[var(--text-success)]" />
      ) : (
        <Copy className="w-3.5 h-3.5" />
      )}
    </button>
  );
}

function JsonSyntaxHighlight({ json: jsonStr }: { json: string }) {
  // Highlight JSON semantically using CSS vars
  const highlighted = jsonStr
    .replace(/("(?:\\.|[^"\\])*")\s*:/g, '<span style="color:var(--json-key)">$1</span>:')
    .replace(/:\s*("(?:\\.|[^"\\])*")/g, ': <span style="color:var(--json-string)">$1</span>')
    .replace(/:\s*(\d+(?:\.\d+)?)/g, ': <span style="color:var(--json-number)">$1</span>')
    .replace(/:\s*(true|false)/g, ': <span style="color:var(--json-boolean)">$1</span>')
    .replace(/:\s*(null)/g, ': <span style="color:var(--json-null)">$1</span>');

  return (
    <pre
      className="text-sm font-mono text-[var(--text-primary)] whitespace-pre-wrap break-all leading-relaxed"
      dangerouslySetInnerHTML={{ __html: highlighted }}
    />
  );
}

function relativeTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(timestamp).toLocaleDateString();
}

export function ResultsPanel({
  result,
  duration,
  loading,
  error,
  sdl,
  history,
  onHistorySelect,
  onHistoryClear,
}: ResultsPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('response');

  const tabs: { id: Tab; label: string; icon: typeof FileJson }[] = [
    { id: 'response', label: 'Response', icon: FileJson },
    { id: 'sdl', label: 'SDL', icon: FileCode },
    { id: 'history', label: 'History', icon: History },
  ];

  const resultJson = result ? JSON.stringify(result, null, 2) : null;

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex items-center border-b border-[var(--border-default)] px-2">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={cn(
              'relative flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-medium transition-colors',
              activeTab === id
                ? 'text-[var(--text-primary)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
            {id === 'history' && history.length > 0 && (
              <span className="text-[10px] bg-[var(--surface-interactive)] rounded-full px-2 py-0.5">
                {history.length}
              </span>
            )}
            {activeTab === id && (
              <motion.div
                layoutId="results-tab-underline"
                className="absolute bottom-0 left-2 right-2 h-0.5 bg-[var(--button-brand-bg)] rounded-full"
                transition={SPRINGS.SNAPPY}
              />
            )}
          </button>
        ))}

        <div className="flex-1" />

        {/* Copy button for response/SDL */}
        {activeTab === 'response' && resultJson && !loading && <CopyButton text={resultJson} />}
        {activeTab === 'sdl' && sdl && <CopyButton text={sdl} />}

        {duration != null && activeTab === 'response' && (
          <span className="text-xs text-[var(--text-muted)] pr-2">{duration.toFixed(0)}ms</span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        <AnimatePresence mode="wait">
          {activeTab === 'response' && (
            <motion.div
              key="response"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={TRANSITIONS.fade}
              className="h-full"
            >
              {loading && (
                <div className="flex items-center justify-center h-full">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={SPRINGS.GENTLE}
                    className="flex items-center gap-2 text-sm text-[var(--text-muted)]"
                  >
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Executing...
                  </motion.div>
                </div>
              )}
              {!loading && error && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={SPRINGS.GENTLE}
                  className="flex items-start gap-2 p-4 bg-[var(--surface-error)] border border-[var(--text-error)]/20 rounded-lg"
                >
                  <AlertCircle className="w-4 h-4 text-[var(--text-error)] shrink-0 mt-0.5" />
                  <pre className="text-sm text-[var(--text-error)] font-mono whitespace-pre-wrap break-all">
                    {error}
                  </pre>
                </motion.div>
              )}
              {!loading && !error && result && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={SPRINGS.GENTLE}
                >
                  <JsonSyntaxHighlight json={resultJson!} />
                </motion.div>
              )}
              {!loading && !error && !result && (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-[var(--text-muted)]">
                    Press{' '}
                    <kbd className="px-2 py-1 bg-[var(--surface-interactive)] rounded-md text-xs font-mono border border-[var(--border-default)]">
                      Cmd+Enter
                    </kbd>{' '}
                    to execute
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'sdl' && (
            <motion.div
              key="sdl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={TRANSITIONS.fade}
            >
              <pre className="text-sm font-mono text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">
                {sdl ?? 'Loading SDL...'}
              </pre>
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={TRANSITIONS.fade}
              className="space-y-1"
            >
              {history.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)] text-center py-8">No history yet</p>
              ) : (
                <>
                  <div className="flex justify-end mb-2">
                    <button
                      type="button"
                      onClick={onHistoryClear}
                      className="text-xs text-[var(--text-muted)] hover:text-[var(--text-error)] transition-colors"
                    >
                      Clear all
                    </button>
                  </div>
                  {history.map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => onHistorySelect(entry)}
                      className="w-full text-left p-3 rounded-lg hover:bg-[var(--surface-hover)] transition-colors group"
                    >
                      <div className="flex items-center gap-2">
                        <pre className="text-xs font-mono text-[var(--text-primary)] truncate flex-1">
                          {entry.query.trim().split('\n')[0]}
                        </pre>
                        {entry.hasErrors && (
                          <AlertCircle className="w-3 h-3 text-[var(--text-error)] shrink-0" />
                        )}
                        {entry.duration != null && (
                          <span className="text-[10px] text-[var(--text-muted)] shrink-0">
                            {entry.duration.toFixed(0)}ms
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                        {relativeTime(entry.timestamp)}
                      </p>
                    </button>
                  ))}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
