import { app } from 'electron';
import type { ApiHandlers } from '@vienna/ipc';
import type { feedbackApi } from './contract';

const REQUEST_TIMEOUT = 15_000;

export function createFeedbackHandlers(webUrl: string): ApiHandlers<typeof feedbackApi> {
  const endpoint = `${webUrl}/api/feedback`;

  return {
    feedback: {
      submit: async ({ message, name, email, source, metadata }) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

        try {
          const body = {
            message,
            name,
            email,
            source: source ?? 'desktop',
            metadata: {
              ...metadata,
              appVersion: app.getVersion(),
              platform: process.platform,
              arch: process.arch,
            },
          };

          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMsg = (errorData as Record<string, unknown>).error ?? `HTTP ${response.status}`;
            return { success: false, error: String(errorMsg) };
          }

          const data = (await response.json()) as { id: string };
          return { success: true, id: data.id };
        } catch (error) {
          clearTimeout(timeoutId);
          const msg = error instanceof Error ? error.message : String(error);
          return { success: false, error: msg };
        }
      },
    },
  };
}
