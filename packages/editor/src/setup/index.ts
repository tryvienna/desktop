/**
 * Editor Setup — Monaco initialization and theme registration.
 *
 * Import from '@vienna/editor/setup' and call once before rendering
 * any editor components. This configures web workers and themes.
 *
 * @module editor/setup
 */

export { initializeMonaco } from './monaco-setup';
export { defineEditorThemes } from './themes';
