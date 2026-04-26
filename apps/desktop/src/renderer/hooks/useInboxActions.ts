/**
 * useInboxActions — Bridges inbox action execution with the action form bar.
 *
 * When a handler calls ctx.prompt(formSpec), this hook receives the form
 * via IPC, converts it to an ActionFormDefinition, and shows the form bar.
 * User answers are sent back via IPC to resume the handler.
 */

import { useEffect, useCallback, useRef } from 'react';
import { getApi, getEvents } from '@vienna/ipc/renderer';
import { defineActionForm } from '@tryvienna/sdk';
import type { ActionFormDefinition } from '@tryvienna/sdk';
import { toast } from '@tryvienna/ui';
import { api, events } from '../../ipc';
import type { InboxActionFormSpec } from '../../ipc/inbox-action/contract';

interface UseInboxActionsOptions {
  showPluginActionForm: (definition: ActionFormDefinition) => void;
  dismissForm: () => void;
}

type IpcClient = ReturnType<typeof getApi<typeof api>>;

export function useInboxActions({ showPluginActionForm, dismissForm }: UseInboxActionsOptions) {
  const ipcClient = useRef(getApi(api));
  const activeSessionRef = useRef<string | null>(null);

  // Deferred promise resolved when the handler responds after form submission.
  // Keeps the form's isSubmitting spinner visible while the handler works.
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
      // Cancel previous session if a new prompt arrives
      if (activeSessionRef.current && activeSessionRef.current !== sessionId) {
        void ipcClient.current.inboxAction.cancel({ sessionId: activeSessionRef.current }).catch(() => {});
      }
      activeSessionRef.current = sessionId;
      const definition = formSpecToDefinition(sessionId, form, ipcClient.current, pendingSubmitRef);
      showPluginActionForm(definition);
    });

    const unsubResult = eventBus.inboxAction.onResult(() => {
      resolveSubmit();
    });

    const unsubComplete = eventBus.inboxAction.onComplete(({ sessionId }: { sessionId: string }) => {
      resolveSubmit();
      if (activeSessionRef.current === sessionId) {
        activeSessionRef.current = null;
        dismissForm();
      }
    });

    const unsubError = eventBus.inboxAction.onError(({ sessionId, error }: { sessionId: string; error: string }) => {
      resolveSubmit();
      if (activeSessionRef.current === sessionId) {
        activeSessionRef.current = null;
        dismissForm();
      }
      if (error !== 'User cancelled') {
        toast.error(`Action failed: ${error}`);
      }
    });

    return () => {
      unsubPrompt();
      unsubResult();
      unsubComplete();
      unsubError();
    };
  }, [showPluginActionForm, dismissForm, resolveSubmit]);

  const executeAction = useCallback(
    (actionId: string, payload: unknown) => {
      void ipcClient.current.inboxAction.execute({ actionId, payload }).catch((err: Error) => {
        toast.error(`Action failed: ${err.message}`);
      });
    },
    [],
  );

  return { executeAction };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function formSpecToDefinition(
  sessionId: string,
  form: InboxActionFormSpec,
  ipc: IpcClient,
  pendingSubmitRef: React.RefObject<{ resolve: () => void } | null>,
): ActionFormDefinition {
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
          ...base,
          type: 'select' as const,
          options: step.options?.map((o) => ({ value: o.value, label: o.label, description: o.description })),
          defaultValue: step.defaultValue,
        };
      case 'confirm':
        return { ...base, type: 'confirm' as const, confirmLabel: step.confirmLabel, denyLabel: step.denyLabel };
      default:
        return { ...base, type: 'text' as const };
    }
  });

  const formId = `inbox-action-${sessionId.slice(0, 8)}`;

  return defineActionForm({
    id: formId,
    title: form.title,
    description: form.description,
    icon: form.icon,
    steps,
    onSubmit: async (answers: Record<string, string>) => {
      // Deferred promise pattern: keeps the form's isSubmitting spinner visible
      // while the handler does async work (pushing branches, creating PRs, etc.).
      // Resolves when the handler emits onResult/onComplete/onError, or after
      // a 2-minute safety timeout to prevent infinite spinners from hung handlers.
      const deferred = new Promise<void>((resolve) => {
        pendingSubmitRef.current = { resolve };
        setTimeout(() => {
          if (pendingSubmitRef.current?.resolve === resolve) {
            pendingSubmitRef.current = null;
            resolve();
          }
        }, 120_000);
      });

      await ipc.inboxAction.respond({ sessionId, answers });
      await deferred;
    },
  });
}
