/**
 * useDrawerSelectionCapture — Higher-level hook for drawer-specific selection capture
 *
 * @ai-context
 * - Wraps useSelectionCapture with DrawerSelectionContext factory
 * - Automatically includes drawerId, drawerTitle, and entityUri metadata
 * - Returns same interface as useSelectionCapture
 *
 * @example
 * const { showPopover, handleCapture } = useDrawerSelectionCapture({ drawerId: 'd1', drawerTitle: 'Notes' });
 */

import { useCallback } from 'react';

import { useSelectionCapture } from './use-selection-capture';
import { createDrawerSelectionContext, createCodeSelectionContext } from './factories';
import type { NanoContext, UseSelectionCaptureReturn } from './types';

export interface UseDrawerSelectionCaptureOptions {
  drawerId: string;
  drawerTitle?: string;
  entityUri?: string;
  disabled?: boolean;
  containerRef?: React.RefObject<HTMLElement | null>;
}

export function useDrawerSelectionCapture({
  drawerId,
  drawerTitle,
  entityUri,
  disabled = false,
  containerRef,
}: UseDrawerSelectionCaptureOptions): UseSelectionCaptureReturn {
  const createContext = useCallback(
    (selectedText: string, metadata?: Record<string, string>): NanoContext => {
      // If selection is within a file context (e.g. diff view), create a code_selection
      if (metadata?.filePath) {
        const fileName = metadata.filePath.split('/').pop() ?? metadata.filePath;
        return createCodeSelectionContext({
          title: fileName,
          subtitle: drawerTitle,
          file: {
            filePath: metadata.filePath,
            fileName,
            language: metadata.language,
          },
          selectedText,
        });
      }
      return createDrawerSelectionContext({
        title: drawerTitle ? `Selection from ${drawerTitle}` : 'Drawer Selection',
        subtitle: drawerTitle,
        drawer: {
          drawerId,
          drawerTitle,
          entityUri,
        },
        selectedText,
      });
    },
    [drawerId, drawerTitle, entityUri]
  );

  const result = useSelectionCapture<NanoContext>({
    createContext,
    shouldShowPopover: disabled ? () => false : (text) => text.trim().length > 0,
    containerRef,
  });

  return result;
}
