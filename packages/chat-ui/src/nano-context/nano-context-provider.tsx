/**
 * NanoContextProvider — Multi-context state provider for the NanoContext system
 *
 * @ai-context
 * - Manages array of pending NanoContexts to attach to next message
 * - Provides attachContext, removeContext, updateContextContent, clearContexts
 * - buildMessageWithContexts serializes contexts into the message string
 * - consumeContexts returns and clears pending contexts on send
 *
 * @example
 * <NanoContextProvider onContextAttached={log}>
 *   <ChatInput />
 * </NanoContextProvider>
 */

import { createContext, useContext, useState, useCallback, useRef, useMemo, type ReactNode } from 'react';
import type { NanoContext, NanoContextValue } from './types';
import { NanoContextTypeRegistry, NanoContextTypeRegistryProvider } from './registry';
import { buildMessageWithNanoContexts } from './serialization';
import { setContextContent } from './factories';

// ─────────────────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────────────────

const NanoContextContext = createContext<NanoContextValue | null>(null);

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────

export interface NanoContextProviderProps {
  children: ReactNode;
  onContextAttached?: (context: NanoContext) => void;
  onContextRemoved?: (contextId: string) => void;
  onContextsCleared?: () => void;
}

export function NanoContextProvider({
  children,
  onContextAttached,
  onContextRemoved,
  onContextsCleared,
}: NanoContextProviderProps) {
  const [pendingContexts, setPendingContexts] = useState<NanoContext[]>([]);
  const [typeRegistry] = useState(() => new NanoContextTypeRegistry());
  const focusInputRef = useRef<(() => void) | null>(null);

  const attachContext = useCallback(
    (context: NanoContext) => {
      setPendingContexts((prev) => {
        const filtered = prev.filter((c) => c.id !== context.id);
        return [...filtered, context];
      });
      onContextAttached?.(context);
    },
    [onContextAttached]
  );

  const removeContext = useCallback(
    (contextId: string) => {
      setPendingContexts((prev) => prev.filter((c) => c.id !== contextId));
      onContextRemoved?.(contextId);
    },
    [onContextRemoved]
  );

  const updateContextContent = useCallback((contextId: string, newContent: string) => {
    setPendingContexts((prev) =>
      prev.map((c) => (c.id === contextId ? setContextContent(c, newContent) : c))
    );
  }, []);

  const clearContexts = useCallback(() => {
    setPendingContexts([]);
    onContextsCleared?.();
  }, [onContextsCleared]);

  const buildMessageWithContexts = useCallback(
    (userMessage: string): string => {
      if (pendingContexts.length === 0) {
        return userMessage;
      }
      return buildMessageWithNanoContexts(userMessage, pendingContexts, typeRegistry);
    },
    [pendingContexts, typeRegistry]
  );

  const consumeContexts = useCallback((): NanoContext[] => {
    const contexts = [...pendingContexts];
    if (contexts.length > 0) {
      setPendingContexts([]);
      onContextsCleared?.();
    }
    return contexts;
  }, [pendingContexts, onContextsCleared]);

  const focusInput = useCallback(() => {
    focusInputRef.current?.();
  }, []);

  const registerFocusInput = useCallback((fn: () => void) => {
    focusInputRef.current = fn;
  }, []);

  const value = useMemo<NanoContextValue>(
    () => ({
      pendingContexts,
      attachContext,
      removeContext,
      updateContextContent,
      clearContexts,
      buildMessageWithContexts,
      consumeContexts,
      focusInput,
      registerFocusInput,
    }),
    [
      pendingContexts,
      attachContext,
      removeContext,
      updateContextContent,
      clearContexts,
      buildMessageWithContexts,
      consumeContexts,
      focusInput,
      registerFocusInput,
    ]
  );

  return (
    <NanoContextContext.Provider value={value}>
      <NanoContextTypeRegistryProvider value={typeRegistry}>
        {children}
      </NanoContextTypeRegistryProvider>
    </NanoContextContext.Provider>
  );
}

NanoContextProvider.displayName = 'NanoContextProvider';

// ─────────────────────────────────────────────────────────────────────────────
// Hooks
// ─────────────────────────────────────────────────────────────────────────────

export function useNanoContext(): NanoContextValue {
  const context = useContext(NanoContextContext);
  if (!context) {
    throw new Error('useNanoContext must be used within a NanoContextProvider');
  }
  return context;
}

export function useNanoContextOptional(): NanoContextValue | null {
  return useContext(NanoContextContext);
}
