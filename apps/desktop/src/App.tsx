import { useCallback, useEffect, useMemo, useState } from 'react';
import { MemoryRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { getApi, getEvents } from '@vienna/ipc/renderer';
import {
  ApolloProvider,
  createApolloClient,
  invalidateEntity,
  updateCachedEntity,
  useQuery,
} from '@vienna/graphql/client';
import { GET_SETTINGS } from '@vienna/graphql/client';
import { api, events } from './ipc';
import { AuthProvider } from './providers/AuthProvider';
import { AppLayout } from './components/AppLayout';
import { SettingsPage } from './pages/SettingsPage';
import { EntityDebugPage } from './pages/EntityDebugPage';
import { WorkstreamProvider, useActiveWorkstreamId, useWorkstreamActions, useViewMode } from './renderer/contexts/WorkstreamContext';
import { TooltipProvider, Toaster } from '@tryvienna/ui';
import { ChatView } from './components/ChatView';
import { ChatErrorBoundary } from './components/ChatErrorBoundary';
import { InboxView } from './components/InboxView';
import { usePersistedState } from './storage';
import { ActionFormProvider, useActionForm } from './providers/ActionFormProvider';
import { DrawerRegistryProvider, DrawerProvider, useDrawerActions, useDrawerState } from './lib/drawer';
import { DrawerRegistrations, workstreamSettingsContent, gitDiffReviewContent } from './components/drawer';
import { KeybindingsProvider } from './providers/KeybindingsProvider';
import { CommandProvider, useCommandPalette, useRegisterCommandHandler } from './providers/CommandProvider';
import { useGlobalShortcuts } from './keybindings/useGlobalShortcuts';
import { KeyboardShortcutsModal } from './keybindings/components/KeyboardShortcutsModal';
import { EntityProvider } from './providers/EntityProvider';
import { ActiveChatStoreProvider } from './providers/ActiveChatStoreContext';
import { DiffModeProvider, NanoContextProvider, ActionFormBar } from '@vienna/chat-ui';
import { PluginSystem } from '@tryvienna/sdk';
import { PluginSystemProvider } from './renderer/contexts/PluginSystemContext';
import { useBuiltinPlugins } from './renderer/hooks/useBuiltinPlugins';
import { useCustomizedPlugins } from './renderer/hooks/useCustomizedPlugins';
import { NotificationProvider } from './renderer/contexts/NotificationContext';
import { EntityLinkingProvider } from './renderer/contexts/EntityLinkingProvider';
import { useWorkstreamNotifications } from './renderer/hooks/use-workstream-notifications';
import { WorktreeErrorDialog } from './components/WorktreeErrorDialog';
import { DetachableCardProvider, FloatingCardLayer } from '@tryvienna/ui/feed';
import { PluginMissingDepsHandler } from './components/store/PluginMissingDepsHandler';
import { PluginInstallConfirmDialog } from './components/store/PluginInstallConfirmDialog';
import { ResolvedThemeProvider, useResolvedTheme } from './renderer/contexts/ResolvedThemeContext';
import { ZoomIndicator } from './components/ZoomIndicator';

// Tailwind v4 default text sizes in rem (at 16px base)
const TAILWIND_TEXT_SIZES: Record<string, number> = {
  'xs': 0.75,
  'sm': 0.875,
  'base': 1,
  'lg': 1.125,
  'xl': 1.25,
  '2xl': 1.5,
  '3xl': 1.875,
  '4xl': 2.25,
};

function ThemedShell({ children }: { children: React.ReactNode }) {
  const { data } = useQuery(GET_SETTINGS);
  const resolvedTheme = useResolvedTheme();
  const fontSize = data?.settings?.appearance?.fontSize ?? 14;

  // Scale Tailwind's --text-* CSS variables proportionally to the font size setting.
  // We can't change <html> font-size because container widths (max-w-2xl = 42rem) use rem.
  // Instead we override the --text-* variables so text scales while layout stays fixed.
  // Sync theme class to <html> so Radix portals (which render at document.body) inherit it
  useEffect(() => {
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(resolvedTheme);
  }, [resolvedTheme]);

  useEffect(() => {
    const scale = fontSize / 16; // 16px is the browser default (1rem)
    const root = document.documentElement;
    for (const [key, baseRem] of Object.entries(TAILWIND_TEXT_SIZES)) {
      root.style.setProperty(`--text-${key}`, `${baseRem * scale}rem`);
    }
  }, [fontSize]);

  return (
    <div className={`${resolvedTheme} h-screen w-screen overflow-hidden bg-background text-foreground`}>
      {children}
      {/* Sonner portal — lives here for theme inheritance; NotificationProvider (inside MemoryRouter) calls toast.custom() imperatively */}
      <Toaster position="bottom-right" expand={false} visibleToasts={4} richColors closeButton gap={8} />
    </div>
  );
}

/**
 * GlobalActionFormOverlay — Renders the action form bar as a fixed overlay.
 *
 * Shows at the bottom of the screen regardless of which view is active
 * (inbox, settings, chat). Only visible when an action form is active.
 * ChatView's built-in form bar is suppressed when this is rendering.
 */
function GlobalActionFormOverlay() {
  const actionForm = useActionForm();
  const { activeForm } = actionForm;

  if (!activeForm) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
      <div className="pointer-events-auto pt-2 pb-4 mx-auto w-full max-w-[720px] px-4">
        <ActionFormBar
          definition={activeForm}
          onSubmit={(answers: Record<string, string>) => actionForm.handleSubmit(activeForm.id, answers)}
          onDismiss={actionForm.dismissForm}
          disabledStepIds={actionForm.disabledStepIds}
          onPreferencesChange={actionForm.handlePreferencesChange}
        />
      </div>
    </div>
  );
}

function WorkstreamChatView() {
  const activeWorkstreamId = useActiveWorkstreamId();
  const viewMode = useViewMode();
  const actionForm = useActionForm();

  if (viewMode === 'inbox') {
    return <InboxView />;
  }

  return (
    <ChatErrorBoundary resetKey={activeWorkstreamId}>
      <ChatView
        workstreamId={activeWorkstreamId}
        onShowForkForm={actionForm.showForkForm}
      />
    </ChatErrorBoundary>
  );
}

function GlobalShortcuts() {
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const navigate = useNavigate();
  const { executeCommand } = useCommandPalette();
  const { showForm: showNewWorkstreamForm, showGroupForm } = useActionForm();
  const drawerActions = useDrawerActions();
  const { isOpen: isDrawerOpen } = useDrawerState();
  const activeWorkstreamId = useActiveWorkstreamId();
  const { markNeedsReview, togglePreviousWorkstream, setViewMode } = useWorkstreamActions();

  // ─── Workstream notifications ────────────────────────────────────
  useWorkstreamNotifications();

  // ─── Zoom (IPC to main process + indicator state) ──────────────────
  const ipcRef = useMemo(() => getApi(api), []);
  // null = indicator hidden; number = indicator visible with this zoom level
  const [indicatorZoom, setIndicatorZoom] = useState<number | null>(null);

  const zoomIn = useCallback(() => {
    ipcRef.zoom.zoomIn({}).then(({ zoomLevel }) => setIndicatorZoom(zoomLevel));
  }, [ipcRef]);
  const zoomOut = useCallback(() => {
    ipcRef.zoom.zoomOut({}).then(({ zoomLevel }) => setIndicatorZoom(zoomLevel));
  }, [ipcRef]);
  const zoomReset = useCallback(() => {
    ipcRef.zoom.resetZoom({}).then(({ zoomLevel }) => setIndicatorZoom(zoomLevel));
  }, [ipcRef]);

  // ─── Listen for native menu accelerator events ────────────────────
  // macOS intercepts certain shortcuts at the system level before keydown
  // reaches the renderer. The main process catches them via native menu
  // accelerators and forwards via IPC.
  useEffect(() => {
    const eventSubs = getEvents(events);
    const unsub = eventSubs.menu.onAccelerator(({ commandId }) => {
      if (commandId === 'app:view-inbox') {
        setViewMode('inbox');
      } else if (commandId === 'workstream:toggle-previous') {
        togglePreviousWorkstream();
      } else if (commandId === 'view:zoom-in') {
        zoomIn();
      } else if (commandId === 'view:zoom-out') {
        zoomOut();
      } else if (commandId === 'view:zoom-reset') {
        zoomReset();
      }
    });
    return unsub;
  }, [setViewMode, togglePreviousWorkstream, zoomIn, zoomOut, zoomReset]);

  // ─── Register renderer-side command handlers ──────────────────────
  // These run when commands are executed from the palette OR keyboard shortcuts.

  useRegisterCommandHandler('app:new-workstream', () => {
    showNewWorkstreamForm();
  });

  useRegisterCommandHandler('app:new-group', () => {
    showGroupForm();
  });

  useRegisterCommandHandler('app:toggle-drawer', () => {
    if (isDrawerOpen) {
      drawerActions.close();
      requestAnimationFrame(() => {
        document.querySelector<HTMLElement>('[data-chat-input-textbox]')?.focus();
      });
    } else {
      drawerActions.openTabbed();
    }
  });

  useRegisterCommandHandler('app:toggle-sidebar', () => {
    // Dispatch a custom event that NavigationSidebar listens for
    document.dispatchEvent(new CustomEvent('vienna:toggle-sidebar'));
  });

  useRegisterCommandHandler('app:entity-browser', () => {
    const chatInput = document.querySelector('[data-chat-input]');
    if (chatInput) {
      chatInput.dispatchEvent(new CustomEvent('vienna:entity-browse'));
    }
  });

  useRegisterCommandHandler('workstream:browse', () => {
    const chatInput = document.querySelector('[data-chat-input]');
    if (chatInput) {
      chatInput.dispatchEvent(new CustomEvent('vienna:workstream-browse'));
    }
  });

  useRegisterCommandHandler('app:global-search', () => {
    const chatInput = document.querySelector('[data-chat-input]');
    if (chatInput) {
      chatInput.dispatchEvent(new CustomEvent('vienna:global-search'));
    }
  });

  useRegisterCommandHandler('app:keyboard-shortcuts', () => {
    setShortcutsOpen(true);
  });

  useRegisterCommandHandler('workstream:settings', () => {
    if (activeWorkstreamId) {
      drawerActions.openFull(workstreamSettingsContent(activeWorkstreamId));
    }
  });

  useRegisterCommandHandler('workstream:mark-needs-verification', () => {
    if (activeWorkstreamId) {
      markNeedsReview(activeWorkstreamId);
    }
  });

  useRegisterCommandHandler('workstream:toggle-previous', () => {
    togglePreviousWorkstream();
  });

  useRegisterCommandHandler('workstream:open-changes', () => {
    if (activeWorkstreamId) {
      drawerActions.openFull(gitDiffReviewContent(activeWorkstreamId));
    }
  });

  useRegisterCommandHandler('chat:focus-input', () => {
    document.querySelector<HTMLElement>('[data-chat-input-textbox]')?.focus();
  });

  // ─── Keyboard shortcuts ───────────────────────────────────────────
  // All shortcuts route through executeCommand for unified handling.
  // app:command-palette dispatches a DOM event to the inline chat input palette.

  useGlobalShortcuts({
    'app:command-palette': () => {
      const chatInput = document.querySelector('[data-chat-input]');
      if (chatInput) {
        chatInput.dispatchEvent(new CustomEvent('vienna:command-palette'));
      }
    },
    'app:entity-browser': () => {
      const chatInput = document.querySelector('[data-chat-input]');
      if (chatInput) {
        chatInput.dispatchEvent(new CustomEvent('vienna:entity-browse'));
      }
    },
    'app:keyboard-shortcuts': () => setShortcutsOpen(true),
    'app:new-workstream': () => void executeCommand('app:new-workstream'),
    'app:new-group': () => void executeCommand('app:new-group'),
    'app:toggle-sidebar': () => void executeCommand('app:toggle-sidebar'),
    'app:toggle-drawer': () => void executeCommand('app:toggle-drawer'),
    'app:nav-home': () => void executeCommand('app:nav-home'),
    'app:nav-settings': () => void executeCommand('app:nav-settings'),
    'app:toggle-theme': () => void executeCommand('app:toggle-theme'),
    'app:toggle-devtools': () => void executeCommand('app:toggle-devtools'),
    'app:reload': () => void executeCommand('app:reload'),
    'app:global-search': () => {
      const chatInput = document.querySelector('[data-chat-input]');
      if (chatInput) {
        chatInput.dispatchEvent(new CustomEvent('vienna:global-search'));
      }
    },
    'workstream:browse': () => {
      const chatInput = document.querySelector('[data-chat-input]');
      if (chatInput) {
        chatInput.dispatchEvent(new CustomEvent('vienna:workstream-browse'));
      }
    },
    'workstream:settings': () => void executeCommand('workstream:settings'),
    'workstream:recall-message': () => void executeCommand('workstream:recall-message'),
    'workstream:mark-needs-verification': () => void executeCommand('workstream:mark-needs-verification'),
    'workstream:toggle-previous': () => togglePreviousWorkstream(),
    'workstream:toggle-todo-panel': () => {
      document.dispatchEvent(new CustomEvent('vienna:toggle-todo-panel'));
    },
    'chat:focus-input': () => {
      document.querySelector<HTMLElement>('[data-chat-input-textbox]')?.focus();
    },
    'view:zoom-in': zoomIn,
    'view:zoom-out': zoomOut,
    'view:zoom-reset': zoomReset,
  }, {
    'input:voice': {
      onStart: () => { document.dispatchEvent(new CustomEvent('vienna:voice-input-start')); },
      onEnd: () => { document.dispatchEvent(new CustomEvent('vienna:voice-input-end')); },
    },
  });

  return (
    <>
      <KeyboardShortcutsModal
        isOpen={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
        onEditShortcuts={() => {
          setShortcutsOpen(false);
          navigate('/settings?tab=keyboard');
        }}
      />
      <ZoomIndicator
        zoomLevel={indicatorZoom}
        onReset={zoomReset}
        onDismiss={() => setIndicatorZoom(null)}
      />
    </>
  );
}

/** Loads builtin + customized plugin definitions into the renderer PluginSystem. */
function PluginBootstrap() {
  useBuiltinPlugins();
  useCustomizedPlugins();
  return null;
}

function HomePage() {
  return (
    <AppLayout>
      <WorkstreamChatView />
    </AppLayout>
  );
}

function MainContent() {
  const ipc = useMemo(() => getApi(api), []);
  const client = useMemo(() => createApolloClient(ipc.graphql.execute), [ipc]);
  const pluginSystem = useMemo(() => new PluginSystem(), []);

  // Sync persisted tray emoji to native menu bar on startup
  const [trayEmoji] = usePersistedState('trayEmoji');
  useEffect(() => {
    ipc.system.setTrayLabel({ label: trayEmoji });
  }, [trayEmoji, ipc]);

  // Subscribe to cache invalidation events from the main process
  useEffect(() => {
    const eventSubs = getEvents(events);

    const unsubInvalidate = eventSubs.graphql.onInvalidate(({ typename, id, keyFields }) => {
      invalidateEntity(client, typename, id, keyFields);
    });

    const unsubCacheUpdate = eventSubs.graphql.onCacheUpdate(({ typename, id, fields }) => {
      updateCachedEntity(client, typename, id, fields);
    });

    return () => {
      unsubInvalidate();
      unsubCacheUpdate();
    };
  }, [client]);

  return (
    <ApolloProvider client={client}>
      <ResolvedThemeProvider>
      <WorkstreamProvider>
        <EntityProvider>
          <DiffModeProvider>
            <ActiveChatStoreProvider>
              <PluginSystemProvider system={pluginSystem}>
              <DetachableCardProvider>
              <PluginBootstrap />
              <PluginMissingDepsHandler />
              <PluginInstallConfirmDialog />
              <DrawerRegistryProvider>
                <DrawerProvider>
                  <DrawerRegistrations />
                  <EntityLinkingProvider>
                  <KeybindingsProvider>
                    <CommandProvider>
                      <ActionFormProvider>
                        <NanoContextProvider>
                          <WorktreeErrorDialog />
                          <TooltipProvider>
                            <ThemedShell>
                              <MemoryRouter>
                                <NotificationProvider>
                                  <GlobalShortcuts />
                                  <Routes>
                                    <Route path="/" element={<HomePage />} />
                                    <Route path="/settings" element={<SettingsPage />} />
                                    <Route path="/entity-tool/:encodedUri" element={<EntityDebugPage />} />
                                  </Routes>
                                  <GlobalActionFormOverlay />
                                </NotificationProvider>
                              </MemoryRouter>
                            </ThemedShell>
                          </TooltipProvider>
                        </NanoContextProvider>
                      </ActionFormProvider>
                    </CommandProvider>
                  </KeybindingsProvider>
                  </EntityLinkingProvider>
                </DrawerProvider>
              </DrawerRegistryProvider>
              <FloatingCardLayer />
              </DetachableCardProvider>
              </PluginSystemProvider>
            </ActiveChatStoreProvider>
          </DiffModeProvider>
        </EntityProvider>
      </WorkstreamProvider>
      </ResolvedThemeProvider>
    </ApolloProvider>
  );
}

export function App() {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  );
}
