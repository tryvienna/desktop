/**
 * ActiveChatStoreContext — Shares the active workstream's chat store and
 * permission callbacks with components outside the ChatProvider tree
 * (e.g. drawer panels).
 *
 * @ai-context
 * - ChatView sets the active store + callbacks via useSetActiveChatContext()
 * - Drawer panels read them via useActiveChatStore() / useActiveChatCallbacks()
 * - Returns null when no workstream is active
 * - Provider lives near the app root, above both DrawerProvider and ChatView
 */

import React, { createContext, useCallback, useContext, useRef, useState } from 'react';

import type { createChatStore } from '@vienna/chat-ui';

type ChatStoreApi = ReturnType<typeof createChatStore>;

export interface ActiveChatCallbacks {
  approvePermission: (requestId: string, scope: 'once' | 'session' | 'permanent') => void;
  denyPermission: (requestId: string, message?: string) => Promise<void>;
}

interface ActiveChatStoreContextValue {
  store: ChatStoreApi | null;
  callbacks: ActiveChatCallbacks | null;
  setContext: (store: ChatStoreApi | null, callbacks: ActiveChatCallbacks | null) => void;
}

const ActiveChatStoreCtx = createContext<ActiveChatStoreContextValue>({
  store: null,
  callbacks: null,
  setContext: () => {},
});

export function ActiveChatStoreProvider({ children }: { children: React.ReactNode }) {
  const [store, setStore] = useState<ChatStoreApi | null>(null);
  const [callbacks, setCallbacks] = useState<ActiveChatCallbacks | null>(null);
  const storeRef = useRef<ChatStoreApi | null>(null);

  const setContext = useCallback((s: ChatStoreApi | null, cb: ActiveChatCallbacks | null) => {
    if (s !== storeRef.current) {
      storeRef.current = s;
      setStore(s);
    }
    setCallbacks(cb);
  }, []);

  return (
    <ActiveChatStoreCtx.Provider value={{ store, callbacks, setContext }}>
      {children}
    </ActiveChatStoreCtx.Provider>
  );
}

/** Set the active chat context (call from ChatView on mount/workstream change) */
export function useSetActiveChatContext(): (store: ChatStoreApi | null, callbacks: ActiveChatCallbacks | null) => void {
  return useContext(ActiveChatStoreCtx).setContext;
}

/** Read the active chat store (call from drawer panels) */
export function useActiveChatStore(): ChatStoreApi | null {
  return useContext(ActiveChatStoreCtx).store;
}

/** Read the active chat callbacks (call from drawer panels) */
export function useActiveChatCallbacks(): ActiveChatCallbacks | null {
  return useContext(ActiveChatStoreCtx).callbacks;
}
