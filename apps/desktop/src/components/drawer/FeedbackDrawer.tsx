import { useCallback, useEffect, useRef, useState } from 'react';
import { getApi } from '@vienna/ipc/renderer';
import { Button } from '@tryvienna/ui';
import { api } from '../../ipc';
import { DrawerContainer } from '../../lib/drawer/DrawerContainer';
import { useDrawerActionsOptional } from '../../lib/drawer/DrawerActionsContext';
import { useAuth } from '../../providers/AuthProvider';

type Phase = 'form' | 'submitting' | 'success' | 'error';

const NAME_STORAGE_KEY = 'vienna:feedback:name';

export function FeedbackDrawer() {
  const drawerActions = useDrawerActionsOptional();
  const { userId } = useAuth();

  const [message, setMessage] = useState('');
  const [name, setName] = useState(() => {
    try {
      return localStorage.getItem(NAME_STORAGE_KEY) ?? '';
    } catch {
      return '';
    }
  });
  const [phase, setPhase] = useState<Phase>('form');
  const [errorMsg, setErrorMsg] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!message.trim()) return;
    setPhase('submitting');
    setErrorMsg('');

    // Persist name for next time
    try {
      if (name.trim()) {
        localStorage.setItem(NAME_STORAGE_KEY, name.trim());
      }
    } catch { /* ignore */ }

    try {
      const client = getApi(api);
      const result = await client.feedback.submit({
        message: message.trim(),
        name: name.trim() || undefined,
        source: 'desktop',
        metadata: { userId: userId ?? undefined },
      });

      if (result.success) {
        setPhase('success');
      } else {
        setErrorMsg(result.error ?? 'Something went wrong. Please try again.');
        setPhase('error');
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setPhase('error');
    }
  }, [message, name, userId]);

  const handleReset = useCallback(() => {
    setMessage('');
    setPhase('form');
    setErrorMsg('');
    setTimeout(() => textareaRef.current?.focus(), 0);
  }, []);

  const handleClose = useCallback(() => {
    drawerActions?.close();
  }, [drawerActions]);

  if (phase === 'success') {
    return (
      <DrawerContainer id="feedback" title="Feedback">
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="text-3xl">&#10003;</div>
          <h2 className="text-lg font-semibold text-foreground">Thank you for your feedback!</h2>
          <p className="text-sm text-muted-foreground">
            Your input helps us improve the experience.
          </p>
          <div className="mt-2 flex gap-3">
            <Button variant="outline" size="sm" onClick={handleReset}>
              Submit More
            </Button>
            <Button variant="default" size="sm" onClick={handleClose}>
              Close
            </Button>
          </div>
        </div>
      </DrawerContainer>
    );
  }

  return (
    <DrawerContainer id="feedback" title="Provide Feedback">
      <div className="flex flex-1 flex-col gap-4 px-4 py-4">
        {phase === 'error' && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {errorMsg}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="feedback-name" className="text-sm font-medium text-foreground">
            Name <span className="text-muted-foreground">(optional)</span>
          </label>
          <input
            id="feedback-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            disabled={phase === 'submitting'}
          />
        </div>

        <div className="flex flex-1 flex-col gap-1.5">
          <label htmlFor="feedback-message" className="text-sm font-medium text-foreground">
            Feedback
          </label>
          <textarea
            ref={textareaRef}
            id="feedback-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tell us what you think, report a bug, or request a feature..."
            className="min-h-40 flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            disabled={phase === 'submitting'}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.metaKey && message.trim()) {
                void handleSubmit();
              }
            }}
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {message.length}/5000
          </span>
          <Button
            variant="default"
            size="sm"
            disabled={!message.trim() || phase === 'submitting'}
            onClick={handleSubmit}
          >
            {phase === 'submitting' ? 'Sending...' : 'Send Feedback'}
          </Button>
        </div>
      </div>
    </DrawerContainer>
  );
}
