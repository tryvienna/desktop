/**
 * Monaco Editor Initialization
 *
 * Configures @monaco-editor/react to use the local monaco-editor package
 * instead of loading from CDN. Sets up web workers for TypeScript parsing.
 *
 * Call once before rendering any editor components.
 *
 * @module editor/setup/monaco-setup
 */

import { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import { defineEditorThemes } from './themes';

let initialized = false;

/**
 * Initialize Monaco editor with local workers and custom themes.
 * Safe to call multiple times — only the first call has effect.
 */
export function initializeMonaco(): void {
  if (initialized) return;
  initialized = true;

  // Configure web workers — required for TypeScript intellisense and peek view.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (self as any).MonacoEnvironment = {
    getWorker(_workerId: string, label: string) {
      if (label === 'typescript' || label === 'javascript') {
        return new tsWorker();
      }
      if (label === 'json') {
        return new jsonWorker();
      }
      if (label === 'css' || label === 'scss' || label === 'less') {
        return new cssWorker();
      }
      if (label === 'html' || label === 'handlebars' || label === 'razor') {
        return new htmlWorker();
      }
      return new editorWorker();
    },
  };

  // Use local Monaco (no CDN)
  loader.config({ monaco });

  // Register custom themes
  defineEditorThemes(monaco);
}
