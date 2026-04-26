/**
 * QueryEditor — CodeMirror 6 with GraphQL support, theme switching, external value sync
 */

import { useRef, useEffect } from 'react';
import { EditorView, keymap, lineNumbers, highlightActiveLine } from '@codemirror/view';
import { EditorState, Compartment } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { bracketMatching, foldGutter, foldKeymap } from '@codemirror/language';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { graphql } from 'cm6-graphql';
import type { GraphQLSchema } from 'graphql';
import { getThemeExtensions } from './codemirror-theme';
import type { Theme } from '@/hooks/use-theme';

interface QueryEditorProps {
  schema: GraphQLSchema | null;
  value: string;
  onChange: (value: string) => void;
  onExecute: () => void;
  theme: Theme;
}

export function QueryEditor({ schema, value, onChange, onExecute, theme }: QueryEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const graphqlCompartment = useRef(new Compartment());
  const themeCompartment = useRef(new Compartment());
  const onChangeRef = useRef(onChange);
  const onExecuteRef = useRef(onExecute);

  onChangeRef.current = onChange;
  onExecuteRef.current = onExecute;

  // Create editor once
  useEffect(() => {
    if (!containerRef.current) return;

    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        history(),
        foldGutter(),
        bracketMatching(),
        closeBrackets(),
        highlightSelectionMatches(),
        themeCompartment.current.of(getThemeExtensions(theme)),
        graphqlCompartment.current.of(schema ? [graphql(schema)] : []),
        keymap.of([
          {
            key: 'Mod-Enter',
            run: () => {
              onExecuteRef.current();
              return true;
            },
          },
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...historyKeymap,
          ...foldKeymap,
          ...searchKeymap,
        ]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString());
          }
        }),
      ],
    });

    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reconfigure schema
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: graphqlCompartment.current.reconfigure(schema ? [graphql(schema)] : []),
    });
  }, [schema]);

  // Reconfigure theme
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: themeCompartment.current.reconfigure(getThemeExtensions(theme)),
    });
  }, [theme]);

  // Sync external value (tab switching)
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== value) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
      });
    }
  }, [value]);

  return <div ref={containerRef} className="h-full overflow-hidden" />;
}
