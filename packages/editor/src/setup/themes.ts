/**
 * Editor Themes — Custom Monaco color themes for Vienna.
 *
 * Defines vienna-dark and vienna-light themes with full token colorization
 * and editor chrome colors (peek view, suggestions, hover widgets).
 *
 * @module editor/setup/themes
 */

import type * as Monaco from 'monaco-editor';

/**
 * Register custom editor themes with a Monaco instance.
 * Called once during initialization.
 */
export function defineEditorThemes(monacoInstance: typeof Monaco): void {
  monacoInstance.editor.defineTheme('vienna-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6a737d', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'c586c0' },
      { token: 'string', foreground: 'ce9178' },
      { token: 'number', foreground: 'b5cea8' },
      { token: 'type', foreground: '4ec9b0' },
      { token: 'function', foreground: 'dcdcaa' },
      { token: 'variable', foreground: '9cdcfe' },
      { token: 'constant', foreground: '4fc1ff' },
    ],
    colors: {
      'editor.background': '#1A1918',
      'editor.foreground': '#CBC7C1',
      'editor.lineHighlightBackground': '#222120',
      'editor.selectionBackground': '#264f78',
      'editor.inactiveSelectionBackground': '#3a3d41',
      'editorLineNumber.foreground': '#706C67',
      'editorLineNumber.activeForeground': '#CBC7C1',
      'editorCursor.foreground': '#ACA8A2',
      'editorIndentGuide.background': '#3D3B38',
      'editorIndentGuide.activeBackground': '#706C67',
      'editor.selectionHighlightBackground': '#add6ff26',
      'editorBracketMatch.background': '#0064001a',
      'editorBracketMatch.border': '#8D8983',
      'editorWidget.background': '#222120',
      'editorWidget.border': '#3D3B38',
      'editorSuggestWidget.background': '#222120',
      'editorSuggestWidget.border': '#3D3B38',
      'editorSuggestWidget.selectedBackground': '#04395e',
      'editorHoverWidget.background': '#222120',
      'editorHoverWidget.border': '#3D3B38',
      'minimap.background': '#1A1918',
      'peekView.border': '#3794ff',
      'peekViewEditor.background': '#001f33',
      'peekViewEditorGutter.background': '#001f33',
      'peekViewResult.background': '#222120',
      'peekViewResult.fileForeground': '#F0EDEA',
      'peekViewResult.lineForeground': '#ACA8A2',
      'peekViewResult.matchHighlightBackground': '#ea5c004d',
      'peekViewResult.selectionBackground': '#3399ff33',
      'peekViewResult.selectionForeground': '#F0EDEA',
      'peekViewTitle.background': '#222120',
      'peekViewTitleLabel.foreground': '#F0EDEA',
      'peekViewTitleDescription.foreground': '#CBC7C1',
    },
  });

  monacoInstance.editor.defineTheme('vienna-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6a737d', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'd73a49' },
      { token: 'string', foreground: '032f62' },
      { token: 'number', foreground: '005cc5' },
      { token: 'type', foreground: '22863a' },
      { token: 'function', foreground: '6f42c1' },
      { token: 'variable', foreground: '24292e' },
      { token: 'constant', foreground: '005cc5' },
    ],
    colors: {
      'editor.background': '#ffffff',
      'editor.foreground': '#24292e',
      'editor.lineHighlightBackground': '#f6f8fa',
      'editor.selectionBackground': '#0366d625',
      'editor.inactiveSelectionBackground': '#0366d611',
      'editorLineNumber.foreground': '#babbbc',
      'editorLineNumber.activeForeground': '#24292e',
      'editorCursor.foreground': '#24292e',
      'editorIndentGuide.background': '#eeeeee',
      'editorIndentGuide.activeBackground': '#cccccc',
      'editorWidget.background': '#ffffff',
      'editorWidget.border': '#e1e4e8',
      'editorSuggestWidget.background': '#ffffff',
      'editorSuggestWidget.border': '#e1e4e8',
      'editorSuggestWidget.selectedBackground': '#e8f0fe',
      'editorHoverWidget.background': '#ffffff',
      'editorHoverWidget.border': '#e1e4e8',
      'minimap.background': '#ffffff',
      'peekView.border': '#007acc',
      'peekViewEditor.background': '#f2f8fc',
      'peekViewEditorGutter.background': '#f2f8fc',
      'peekViewResult.background': '#f3f3f3',
      'peekViewResult.fileForeground': '#1e1e1e',
      'peekViewResult.lineForeground': '#646465',
      'peekViewResult.matchHighlightBackground': '#ea5c004d',
      'peekViewResult.selectionBackground': '#3399ff33',
      'peekViewResult.selectionForeground': '#1e1e1e',
      'peekViewTitle.background': '#ffffff',
      'peekViewTitleLabel.foreground': '#1e1e1e',
      'peekViewTitleDescription.foreground': '#717171',
    },
  });
}
