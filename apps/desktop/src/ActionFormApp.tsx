/**
 * ActionFormApp — Lightweight React root for the floating action form overlay.
 *
 * Renders ActionFormBar for form prompts and InboxActionResult for
 * success/error result screens. No heavy providers needed.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getApi, getEvents } from '@vienna/ipc/renderer';
import {
  ApolloProvider,
  createApolloClient,
  useQuery,
} from '@vienna/graphql/client';
import { GET_SETTINGS } from '@vienna/graphql/client';
import { ActionFormBar } from '@vienna/chat-ui';
import { defineActionForm } from '@tryvienna/sdk';
import type { ActionFormDefinition } from '@tryvienna/sdk';
import { api, events } from './ipc';
import type { InboxActionFormSpec, InboxActionResultSpec } from './ipc/inbox-action/contract';
import { InboxActionResult } from './components/inbox-action-result';

// ── IPC ───────────────────────────────────────────────────────────────────

let ipcRenderer: { send(channel: string, ...args: unknown[]): void } | null = null;
try {
  ipcRenderer = require('electron').ipcRenderer;
} catch { /* not in electron */ }

// ── Theme ─────────────────────────────────────────────────────────────────

function FormThemeShell({ children }: { children: React.ReactNode }) {
  const { data } = useQuery(GET_SETTINGS);
  const theme = data?.settings?.appearance?.theme ?? 'system';

  useEffect(() => {
    const resolved =
      theme === 'system'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        : theme;
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(resolved);
  }, [theme]);

  return <>{children}</>;
}

// ── Form spec conversion ──────────────────────────────────────────────────

function formSpecToDefinition(
  sessionId: string,
  form: InboxActionFormSpec,
): ActionFormDefinition {
  const ipc = getApi(api);
  const steps = form.steps.map((step) => {
    const base = {
      id: step.id,
      header: step.header,
      question: step.question,
      required: step.required,
      skippable: step.skippable,
    };
    switch (step.type) {
      case 'text':
        return { ...base, type: 'text' as const, placeholder: step.placeholder, defaultValue: step.defaultValue };
      case 'select':
        return {
          ...base, type: 'select' as const,
          options: step.options?.map((o) => ({ value: o.value, label: o.label, description: o.description })),
          defaultValue: step.defaultValue,
        };
      case 'confirm':
        return { ...base, type: 'confirm' as const, confirmLabel: step.confirmLabel, denyLabel: step.denyLabel };
      default:
        return { ...base, type: 'text' as const };
    }
  });

  return defineActionForm({
    id: `inbox-action-${sessionId.slice(0, 8)}`,
    title: form.title,
    description: form.description,
    icon: form.icon,
    steps,
    onSubmit: async (answers: Record<string, string>) => {
      await ipc.inboxAction.respond({ sessionId, answers });
    },
  });
}

// ── View state ────────────────────────────────────────────────────────────

type ViewState =
  | { type: 'idle' }
  | { type: 'form'; sessionId: string; form: ActionFormDefinition }
  | { type: 'result'; sessionId: string; result: InboxActionResultSpec };

// ── Renderer ──────────────────────────────────────────────────────────────

function ActionFormRenderer() {
  const [view, setView] = useState<ViewState>({ type: 'idle' });

  // Deferred promise resolved when the handler responds after form submission.
  // This keeps the form's isSubmitting spinner visible while the handler works
  // (e.g. pushing a branch, creating a PR, starting a workstream).
  const pendingSubmitRef = useRef<{ resolve: () => void } | null>(null);

  const resolveSubmit = useCallback(() => {
    if (pendingSubmitRef.current) {
      pendingSubmitRef.current.resolve();
      pendingSubmitRef.current = null;
    }
  }, []);

  useEffect(() => {
    const eventBus = getEvents(events);

    const unsubPrompt = eventBus.inboxAction.onPrompt(({ sessionId, form }: { sessionId: string; form: InboxActionFormSpec }) => {
      resolveSubmit();
      setView({ type: 'form', sessionId, form: formSpecToDefinition(sessionId, form) });
    });

    const unsubResult = eventBus.inboxAction.onResult(({ sessionId, result }: { sessionId: string; result: InboxActionResultSpec }) => {
      resolveSubmit();
      setView({ type: 'result', sessionId, result });
    });

    const unsubComplete = eventBus.inboxAction.onComplete(() => {
      resolveSubmit();
      setView({ type: 'idle' });
      ipcRenderer?.send('action-form:dismiss');
    });

    const unsubError = eventBus.inboxAction.onError(() => {
      resolveSubmit();
      setView({ type: 'idle' });
      ipcRenderer?.send('action-form:dismiss');
    });

    return () => { unsubPrompt(); unsubResult(); unsubComplete(); unsubError(); };
  }, [resolveSubmit]);

  const handleDismiss = useCallback(() => {
    resolveSubmit();
    setView({ type: 'idle' });
    ipcRenderer?.send('action-form:dismiss');
  }, [resolveSubmit]);

  const handleFormSubmit = useCallback(async (answers: Record<string, string>) => {
    if (view.type !== 'form') return;

    // Deferred promise pattern: keeps the form's isSubmitting spinner visible
    // while the handler does async work (pushing branches, creating PRs, etc.).
    // The promise resolves when the handler emits onResult/onComplete/onError,
    // or after a 2-minute safety timeout to prevent infinite spinners from hung handlers.
    const deferred = new Promise<void>((resolve) => {
      pendingSubmitRef.current = { resolve };
      setTimeout(() => {
        if (pendingSubmitRef.current?.resolve === resolve) {
          pendingSubmitRef.current = null;
          resolve();
        }
      }, 120_000);
    });

    void view.form.onSubmit(answers);
    await deferred;
  }, [view]);

  const handleResultAction = useCallback((actionId: string) => {
    if (view.type === 'result') {
      const ipc = getApi(api);
      void ipc.inboxAction.respondResult({ sessionId: view.sessionId, actionId });
    }
    // Don't dismiss — handler will emit onComplete
  }, [view]);

  const handleResultDismiss = useCallback(() => {
    if (view.type === 'result') {
      const ipc = getApi(api);
      void ipc.inboxAction.respondResult({ sessionId: view.sessionId, actionId: 'dismiss' });
    }
    setView({ type: 'idle' });
    ipcRenderer?.send('action-form:dismiss');
  }, [view]);

  if (view.type === 'idle') return null;

  return (
    <div className="flex items-end justify-center h-full p-4">
      <div
        className="w-full max-w-[720px] mx-auto rounded-xl border border-border bg-popover overflow-hidden"
        style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.24), 0 2px 8px rgba(0,0,0,0.12)' }}
      >
        {/* Drag handle */}
        <div className="flex items-center justify-center h-5 cursor-grab active:cursor-grabbing [-webkit-app-region:drag]">
          <div className="w-8 h-1 rounded-full bg-muted-foreground/30" />
        </div>
        {/* Content */}
        <div className="px-3 pb-3 [-webkit-app-region:no-drag]">
          {view.type === 'form' && (
            <ActionFormBar
              definition={view.form}
              onSubmit={handleFormSubmit}
              onDismiss={handleDismiss}
            />
          )}
          {view.type === 'result' && (
            <InboxActionResult
              result={view.result}
              onAction={handleResultAction}
              onDismiss={handleResultDismiss}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────

export function ActionFormApp() {
  const ipc = useMemo(() => getApi(api), []);
  const client = useMemo(() => createApolloClient(ipc.graphql.execute), [ipc]);

  return (
    <ApolloProvider client={client}>
      <FormThemeShell>
        <ActionFormRenderer />
      </FormThemeShell>
    </ApolloProvider>
  );
}
