import { useEffect, useRef, useCallback } from 'react';
import { EditorState, Compartment, StateEffect } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { oneDark } from '@codemirror/theme-one-dark';
import { languages } from '@codemirror/language-data';
import { useSettingsStore } from '../../store/useSettingsStore';

interface MarkdownEditorProps {
  content: string;
  onChange: (content: string) => void;
  onSave?: () => void;
  readOnly?: boolean;
  className?: string;
}

export default function MarkdownEditor({
  content,
  onChange,
  onSave,
  readOnly = false,
  className = '',
}: MarkdownEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const isInternalUpdate = useRef(false);
  const { settings } = useSettingsStore();
  const themeCompartment = useRef(new Compartment());
  const fontSizeCompartment = useRef(new Compartment());
  const fontFamilyCompartment = useRef(new Compartment());
  const editableCompartment = useRef(new Compartment());

  const updateListener = EditorView.updateListener.of((update) => {
    if (update.docChanged && !isInternalUpdate.current) {
      const newContent = update.state.doc.toString();
      onChange(newContent);
    }
  });

  const createEditor = useCallback(() => {
    if (!editorRef.current) return;

    if (viewRef.current) {
      viewRef.current.destroy();
    }

    const isDark = document.documentElement.classList.contains('dark');

    const extensions = [
      lineNumbers(),
      highlightActiveLine(),
      highlightActiveLineGutter(),
      history(),
      markdown({ base: markdownLanguage, codeLanguages: languages }),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      keymap.of([
        ...defaultKeymap,
        ...historyKeymap,
        indentWithTab,
        {
          key: 'Mod-s',
          run: () => {
            onSave?.();
            return true;
          },
        },
      ]),
      updateListener,
      themeCompartment.current.of(isDark ? oneDark : []),
      fontSizeCompartment.current.of(
        EditorView.theme({
          '&': {
            fontSize: `${settings.editorFontSize}px`,
          },
        })
      ),
      fontFamilyCompartment.current.of(
        EditorView.theme({
          '&': {
            fontFamily: settings.editorFontFamily,
          },
          '.cm-content': {
            fontFamily: settings.editorFontFamily,
          },
          '.cm-line': {
            fontFamily: settings.editorFontFamily,
          },
          '.cm-gutters': {
            fontFamily: settings.editorFontFamily,
          },
        })
      ),
      EditorView.lineWrapping,
      editableCompartment.current.of(EditorView.editable.of(!readOnly)),
      EditorView.theme({
        '&': {
          height: '100%',
          backgroundColor: 'transparent',
        },
        '.cm-scroller': {
          overflow: 'auto',
          fontFamily: settings.editorFontFamily,
        },
        '.cm-content': {
          padding: '16px 0',
          lineHeight: '1.6',
        },
        '.cm-line': {
          padding: '0 16px',
        },
        '.cm-gutters': {
          borderRight: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-secondary)',
          color: 'var(--text-muted)',
        },
        '.cm-activeLine': {
          backgroundColor: 'var(--bg-tertiary)',
        },
        '.cm-activeLineGutter': {
          backgroundColor: 'var(--bg-tertiary)',
        },
        '.cm-cursor': {
          borderLeftColor: 'var(--accent-primary)',
          borderLeftWidth: '2px',
        },
        '.cm-selectionBackground': {
          backgroundColor: 'rgba(30, 64, 175, 0.3)',
        },
      }),
    ];

    const state = EditorState.create({
      doc: content,
      extensions,
    });

    viewRef.current = new EditorView({
      state,
      parent: editorRef.current,
    });
  }, [content, onSave, settings.editorFontSize, settings.editorFontFamily, readOnly]);

  useEffect(() => {
    createEditor();

    return () => {
      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
      }
    };
  }, [createEditor]);

  useEffect(() => {
    if (viewRef.current) {
      const currentContent = viewRef.current.state.doc.toString();
      if (currentContent !== content) {
        isInternalUpdate.current = true;
        viewRef.current.dispatch({
          changes: {
            from: 0,
            to: currentContent.length,
            insert: content,
          },
        });
        isInternalUpdate.current = false;
      }
    }
  }, [content]);

  useEffect(() => {
    if (viewRef.current) {
      const isDark = document.documentElement.classList.contains('dark');
      viewRef.current.dispatch({
        effects: themeCompartment.current.reconfigure(isDark ? oneDark : []),
      });
    }
  }, [settings.theme]);

  useEffect(() => {
    if (viewRef.current) {
      viewRef.current.dispatch({
        effects: fontSizeCompartment.current.reconfigure(
          EditorView.theme({
            '&': {
              fontSize: `${settings.editorFontSize}px`,
            },
          })
        ),
      });
    }
  }, [settings.editorFontSize]);

  useEffect(() => {
    if (viewRef.current) {
      viewRef.current.dispatch({
        effects: fontFamilyCompartment.current.reconfigure(
          EditorView.theme({
            '&': {
              fontFamily: settings.editorFontFamily,
            },
            '.cm-content': {
              fontFamily: settings.editorFontFamily,
            },
            '.cm-line': {
              fontFamily: settings.editorFontFamily,
            },
            '.cm-gutters': {
              fontFamily: settings.editorFontFamily,
            },
          })
        ),
      });
    }
  }, [settings.editorFontFamily]);

  useEffect(() => {
    if (viewRef.current) {
      viewRef.current.dispatch({
        effects: editableCompartment.current.reconfigure(EditorView.editable.of(!readOnly)),
      });
    }
  }, [readOnly]);

  return (
    <div
      ref={editorRef}
      className={`h-full w-full overflow-hidden ${className}`}
      style={{ backgroundColor: 'var(--bg-secondary)' }}
    />
  );
}
