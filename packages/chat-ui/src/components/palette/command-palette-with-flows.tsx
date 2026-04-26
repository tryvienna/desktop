/**
 * CommandPaletteWithFlows — Wraps CommandPalette with multi-step flow management
 *
 * @ai-context
 * - Extends CommandPalette with flow registry for multi-step command sequences
 * - Manages flow state (screen index, data, cancel/complete lifecycle)
 * - Capture-phase keyboard handling for Escape and flow screen navigation
 * - Supports direct-mode (initialCommandId) to skip command list
 * - data-slot="command-palette-with-flows"
 *
 * @example
 * <CommandPaletteWithFlows isOpen={open} onClose={close} onExecute={exec} dataProvider={provider} flowRegistry={flows} />
 */

import {
  useState,
  useCallback,
  useRef,
  useMemo,
  useEffect,
  memo,
  forwardRef,
  useImperativeHandle,
} from 'react';

import { CommandPalette } from './command-palette';
import { FlowKeyboardContext } from './flow-keyboard-context';
import type { FlowKeyboardContextValue } from './flow-keyboard-context';
import { PaletteContainer, PaletteKeyboardHints } from './primitives';
import type {
  Command,
  CommandPaletteDataProvider,
  FlowDefinition,
  FlowScreenProps,
  PaletteTab,
  PaletteHandle,
} from './types';

// =============================================================================
// TYPES
// =============================================================================

export interface CommandPaletteWithFlowsProps {
  isOpen: boolean;
  onClose: () => void;
  onExecute: (command: Command) => void;
  dataProvider: CommandPaletteDataProvider;
  query?: string;
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  tabs?: PaletteTab[];
  maxResults?: number;
  className?: string;
  /** Flow registry: maps command ID to flow definition */
  flowRegistry?: Record<string, FlowDefinition>;
  /** When set, immediately activates this command's flow on open (skips command list) */
  initialCommandId?: string;
  /** Called when the flow active state changes (for hiding outer search input, etc.) */
  onFlowStateChange?: (isFlowActive: boolean) => void;
  /** Factory for a fallback command shown when the user is searching */
  fallbackCommand?: (query: string) => Command | undefined;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const CommandPaletteWithFlows = memo(
  forwardRef<PaletteHandle, CommandPaletteWithFlowsProps>(function CommandPaletteWithFlows(
    {
      isOpen,
      onClose,
      onExecute,
      dataProvider,
      query,
      activeTab,
      onTabChange,
      tabs,
      maxResults,
      className,
      flowRegistry,
      initialCommandId,
      onFlowStateChange,
      fallbackCommand,
    },
    ref
  ) {
    // --- Flow state --------------------------------------------------------
    // When true, Escape/back closes the palette instead of returning to command list
    const directModeRef = useRef(false);

    // Initialise flow synchronously so there's no flicker frame showing the command list.
    // If initialCommandId is provided on the first render we jump straight to that flow.
    const [activeFlow, setActiveFlow] = useState<FlowDefinition | null>(() => {
      if (initialCommandId && flowRegistry) {
        const flow = flowRegistry[initialCommandId];
        if (flow) {
          directModeRef.current = true;
          return flow;
        }
      }
      return null;
    });
    const [flowData, setFlowData] = useState<Record<string, unknown>>(() => {
      if (initialCommandId && flowRegistry) {
        const flow = flowRegistry[initialCommandId];
        if (flow?.initialData) return { ...flow.initialData };
      }
      return {};
    });
    const [flowScreenIndex, setFlowScreenIndex] = useState(0);
    const paletteRef = useRef<PaletteHandle>(null);

    // --- Flow keyboard context ---------------------------------------------
    // Allows FlowList (and other flow components) to register their
    // keyboard handler. Events are forwarded through the capture-phase
    // document listener — the same proven path used for Escape handling.
    const flowKeyHandlerRef = useRef<((e: KeyboardEvent) => boolean) | null>(null);

    const flowKeyboardValue = useMemo<FlowKeyboardContextValue>(
      () => ({
        register: (handler) => {
          flowKeyHandlerRef.current = handler;
        },
        unregister: () => {
          flowKeyHandlerRef.current = null;
        },
      }),
      []
    );

    // --- Activate flow when initialCommandId changes while open ---------------
    useEffect(() => {
      if (!isOpen || !initialCommandId || !flowRegistry) return;
      const flow = flowRegistry[initialCommandId];
      if (flow && flow !== activeFlow) {
        directModeRef.current = true;
        setActiveFlow(flow);
        setFlowData(flow.initialData ? { ...flow.initialData } : {});
        setFlowScreenIndex(0);
      }
    }, [isOpen, initialCommandId, flowRegistry]);

    // --- Notify parent of flow state changes --------------------------------
    useEffect(() => {
      onFlowStateChange?.(activeFlow != null);
    }, [activeFlow, onFlowStateChange]);

    // --- Flow lifecycle ----------------------------------------------------

    const handleCommandExecute = useCallback(
      (command: Command) => {
        // Check if this command has a flow
        if (command.hasFlow && flowRegistry?.[command.id]) {
          const flow = flowRegistry[command.id];
          setActiveFlow(flow);
          setFlowData(flow.initialData ? { ...flow.initialData } : {});
          setFlowScreenIndex(0);
          return;
        }

        // No flow — execute directly
        onExecute(command);
      },
      [flowRegistry, onExecute]
    );

    const handleFlowNext = useCallback(() => {
      if (!activeFlow) return;
      if (flowScreenIndex < activeFlow.screens.length - 1) {
        setFlowScreenIndex((i) => i + 1);
      }
    }, [activeFlow, flowScreenIndex]);

    const handleFlowCancel = useCallback(() => {
      if (activeFlow) {
        activeFlow.onCancel();
      }
      setActiveFlow(null);
      setFlowData({});
      setFlowScreenIndex(0);
    }, [activeFlow]);

    const handleFlowBack = useCallback(() => {
      if (flowScreenIndex > 0) {
        setFlowScreenIndex((i) => i - 1);
      } else if (directModeRef.current) {
        // Opened directly (e.g. CMD+G) — close entirely instead of returning to command list
        directModeRef.current = false;
        handleFlowCancel();
        onClose();
      } else {
        // Back from first screen -> cancel flow, return to palette
        handleFlowCancel();
      }
    }, [flowScreenIndex, handleFlowCancel, onClose]);

    const handleFlowComplete = useCallback(
      (result: unknown) => {
        if (activeFlow) {
          void activeFlow.onComplete(result as Record<string, unknown>);
        }
        directModeRef.current = false;
        setActiveFlow(null);
        setFlowData({});
        setFlowScreenIndex(0);
        onClose();
      },
      [activeFlow, onClose]
    );

    const handleFlowSetData = useCallback((updates: Partial<Record<string, unknown>>) => {
      setFlowData((prev) => ({ ...prev, ...updates }));
    }, []);

    // --- Reset flow on close -----------------------------------------------

    const handleClose = useCallback(() => {
      directModeRef.current = false;
      if (activeFlow) {
        handleFlowCancel();
      }
      onClose();
    }, [activeFlow, handleFlowCancel, onClose]);

    // --- Keyboard handling via document listener ---------------------------
    // Centralized here because this component owns the flow state.
    // Uses capture phase on document so it fires before bubble-phase
    // handlers (e.g. drawer's Escape) and works regardless of focus.
    // Also forwards Arrow/Enter to flow components when a flow is active.
    useEffect(() => {
      if (!isOpen) return;

      const handleKeyDown = (e: KeyboardEvent) => {
        // Escape: navigate back or close
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();

          if (activeFlow) {
            handleFlowBack();
          } else {
            onClose();
          }
          return;
        }

        // When a flow is active, forward navigation keys to the
        // registered flow keyboard handler (e.g. FlowList)
        if (activeFlow && flowKeyHandlerRef.current) {
          const handled = flowKeyHandlerRef.current(e);
          if (handled) {
            e.preventDefault();
            e.stopPropagation();
          }
        }
      };

      document.addEventListener('keydown', handleKeyDown, true); // capture phase
      return () => document.removeEventListener('keydown', handleKeyDown, true);
    }, [isOpen, activeFlow, handleFlowBack, onClose]);

    // Forward non-Escape keys to inner palette for arrow/Enter/Tab navigation
    useImperativeHandle(
      ref,
      () => ({
        handleKeyDown: (e: React.KeyboardEvent): boolean => {
          if (e.key === 'Escape') return false; // handled by useEffect above
          if (activeFlow) return false; // flow screens handle their own keys
          return paletteRef.current?.handleKeyDown(e) ?? false;
        },
        isFlowActive: activeFlow != null,
      }),
      [activeFlow]
    );

    // --- Render ------------------------------------------------------------

    if (!isOpen) return null;

    // If a flow is active, render the flow screen
    if (activeFlow) {
      const currentScreen = activeFlow.screens[flowScreenIndex];
      if (!currentScreen) {
        // Safety: if screen is missing, cancel flow
        handleFlowCancel();
        return null;
      }

      const flowScreenProps: FlowScreenProps = {
        data: flowData,
        setData: handleFlowSetData,
        onNext: handleFlowNext,
        onBack: handleFlowBack,
        onComplete: handleFlowComplete,
        onCancel: handleFlowCancel,
        screenIndex: flowScreenIndex,
        totalScreens: activeFlow.screens.length,
      };

      return (
        <FlowKeyboardContext.Provider value={flowKeyboardValue}>
          <PaletteContainer
            className={className}
            data-slot="command-palette-with-flows"
            data-palette-type="command-flow"
          >
            {currentScreen.render(flowScreenProps)}
            <PaletteKeyboardHints hints={['navigate', 'select', 'back']} />
          </PaletteContainer>
        </FlowKeyboardContext.Provider>
      );
    }

    // Otherwise render the normal command palette
    return (
      <CommandPalette
        ref={paletteRef}
        isOpen={isOpen}
        onClose={handleClose}
        onExecute={handleCommandExecute}
        dataProvider={dataProvider}
        query={query}
        activeTab={activeTab}
        onTabChange={onTabChange}
        tabs={tabs}
        maxResults={maxResults}
        className={className}
        flowRegistry={flowRegistry}
        fallbackCommand={fallbackCommand}
      />
    );
  })
);

CommandPaletteWithFlows.displayName = 'CommandPaletteWithFlows';
