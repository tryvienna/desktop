/**
 * CodeMirror Theme — Dual dark/light themes using concrete OKLCH values
 * Synced with Vercel-inspired design tokens in index.css
 */

import { EditorView } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';

function createTheme(mode: 'dark' | 'light') {
  const isDark = mode === 'dark';

  // Surface colors — match index.css tokens
  const bg = isDark ? 'oklch(11% 0 0)' : 'oklch(99% 0 0)';
  const surface = isDark ? 'oklch(15% 0 0)' : '#ffffff';
  // Use rgba for borders since CM concatenates them into border shorthand
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const foreground = isDark ? 'oklch(93% 0 0)' : 'oklch(15% 0 0)';
  const muted = isDark ? 'oklch(45% 0 0)' : 'oklch(55% 0 0)';
  const brand = isDark ? 'oklch(67.8% 0.12 86.9)' : 'oklch(54.5% 0.11 86.7)';
  const selection = isDark ? 'oklch(40% 0.06 255 / 0.3)' : 'oklch(70% 0.06 255 / 0.25)';
  const activeLine = isDark ? 'oklch(15% 0 0 / 0.6)' : 'oklch(96% 0 0 / 0.7)';

  // Syntax colors — same accent palette
  const keyword = isDark ? 'oklch(70.9% 0.16 294)' : 'oklch(56.3% 0.22 296)';
  const string = isDark ? 'oklch(77.3% 0.15 163)' : 'oklch(55.1% 0.17 155)';
  const number = isDark ? 'oklch(83.7% 0.16 84.4)' : 'oklch(64.4% 0.16 55)';
  const property = isDark ? 'oklch(71.4% 0.14 255)' : 'oklch(55.4% 0.19 261)';
  const comment = isDark ? 'oklch(38% 0 0)' : 'oklch(60% 0 0)';
  const type = isDark ? 'oklch(79.7% 0.13 212)' : 'oklch(55.4% 0.15 212)';
  const error = 'oklch(63.7% 0.21 25.3)';

  const theme = EditorView.theme(
    {
      '&': {
        backgroundColor: bg,
        color: foreground,
      },
      '.cm-content': {
        caretColor: brand,
        fontFamily: 'var(--font-mono-value)',
      },
      '.cm-cursor, .cm-dropCursor': {
        borderLeftColor: brand,
        borderLeftWidth: '2px',
      },
      '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
        backgroundColor: selection,
      },
      '.cm-panels': {
        backgroundColor: surface,
        color: foreground,
      },
      '.cm-panels.cm-panels-top': {
        borderBottom: `1px solid ${border}`,
      },
      '.cm-panels.cm-panels-bottom': {
        borderTop: `1px solid ${border}`,
      },
      '.cm-searchMatch': {
        backgroundColor: isDark ? 'oklch(75.4% 0.12 83.6 / 0.25)' : 'oklch(75.4% 0.12 83.6 / 0.3)',
        outline: 'oklch(75.4% 0.12 83.6 / 0.4)',
      },
      '.cm-searchMatch.cm-searchMatch-selected': {
        backgroundColor: isDark ? 'oklch(75.4% 0.12 83.6 / 0.45)' : 'oklch(75.4% 0.12 83.6 / 0.5)',
      },
      '.cm-activeLine': {
        backgroundColor: activeLine,
      },
      '.cm-selectionMatch': {
        backgroundColor: isDark ? 'oklch(40% 0.06 255 / 0.2)' : 'oklch(70% 0.06 255 / 0.15)',
      },
      '.cm-matchingBracket, .cm-nonmatchingBracket': {
        backgroundColor: isDark ? 'oklch(40% 0.06 255 / 0.3)' : 'oklch(70% 0.06 255 / 0.2)',
        outline: 'none',
      },
      '.cm-gutters': {
        backgroundColor: bg,
        color: muted,
        border: 'none',
        borderRight: `1px solid ${border}`,
      },
      '.cm-activeLineGutter': {
        backgroundColor: activeLine,
        color: foreground,
      },
      '.cm-foldPlaceholder': {
        backgroundColor: surface,
        border: `1px solid ${border}`,
        color: muted,
      },
      '.cm-tooltip': {
        backgroundColor: surface,
        border: `1px solid ${border}`,
        color: foreground,
        borderRadius: '8px',
        boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.5)' : '0 8px 24px rgba(0,0,0,0.12)',
      },
      '.cm-tooltip .cm-tooltip-arrow:before': {
        borderTopColor: border,
        borderBottomColor: border,
      },
      '.cm-tooltip .cm-tooltip-arrow:after': {
        borderTopColor: surface,
        borderBottomColor: surface,
      },
      '.cm-tooltip-autocomplete': {
        '& > ul > li[aria-selected]': {
          backgroundColor: isDark ? 'oklch(40% 0.06 255 / 0.25)' : 'oklch(70% 0.06 255 / 0.2)',
          color: foreground,
        },
      },
      '.cm-completionIcon': {
        opacity: '0.7',
      },
      '.cm-completionDetail': {
        color: muted,
        fontStyle: 'normal',
      },
      '.cm-diagnostic': {
        borderBottom: 'none',
      },
      '.cm-diagnostic-error': {
        borderLeft: `3px solid ${error}`,
      },
      '.cm-diagnostic-warning': {
        borderLeft: `3px solid ${number}`,
      },
      '.cm-diagnostic-info': {
        borderLeft: `3px solid ${property}`,
      },
      '.cm-lintPoint::after': {
        bottom: '-2px',
      },
    },
    { dark: isDark }
  );

  const highlightStyle = syntaxHighlighting(
    HighlightStyle.define([
      { tag: tags.keyword, color: keyword },
      { tag: tags.operator, color: keyword },
      { tag: tags.special(tags.variableName), color: brand },
      { tag: tags.typeName, color: type },
      { tag: tags.atom, color: number },
      { tag: tags.number, color: number },
      { tag: tags.bool, color: number },
      { tag: tags.string, color: string },
      { tag: tags.definition(tags.variableName), color: foreground },
      { tag: tags.propertyName, color: property },
      { tag: tags.attributeName, color: property },
      { tag: tags.name, color: foreground },
      { tag: tags.variableName, color: foreground },
      { tag: tags.comment, color: comment, fontStyle: 'italic' },
      { tag: tags.punctuation, color: muted },
      { tag: tags.meta, color: muted },
      { tag: tags.invalid, color: error },
    ])
  );

  return { theme, highlightStyle };
}

export const darkTheme = createTheme('dark');
export const lightTheme = createTheme('light');

/** Get the right theme extensions for a given mode */
export function getThemeExtensions(mode: 'dark' | 'light') {
  const t = mode === 'dark' ? darkTheme : lightTheme;
  return [t.theme, t.highlightStyle];
}
