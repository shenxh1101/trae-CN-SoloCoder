import React, { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { EditorState, StateEffect } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightActiveLine, drawSelection } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching } from '@codemirror/language';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { java } from '@codemirror/lang-java';
import { go } from '@codemirror/lang-go';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { oneDark } from '@codemirror/theme-one-dark';

const languageExtensions = {
  javascript: javascript(),
  python: python(),
  java: java(),
  go: go(),
  html: html(),
  css: css()
};

const CodeEditor = forwardRef(({
  initialCode,
  language,
  onCodeChange,
  onCursorChange,
  onSelectionChange,
  remoteUsers = [],
  readOnly = false,
  userId
}, ref) => {
  const viewRef = useRef(null);
  const containerRef = useRef(null);
  const remoteCursorsRef = useRef([]);
  const remoteSelectionsRef = useRef([]);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);
  const updateListenerRef = useRef(null);

  useImperativeHandle(ref, () => ({
    insertCode: (text) => insertCode(text),
    getCode: () => getCode()
  }));

  const getLanguageExtension = useCallback((lang) => {
    if (lang === 'html') {
      return html({ autoCloseTags: true, matchClosingTags: true });
    }
    return languageExtensions[lang] || languageExtensions.javascript;
  }, []);

  const buildExtensions = useCallback((lang, readonly, onCodeChange, onCursorChange, onSelectionChange) => {
    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        const newCode = update.state.doc.toString();
        const changes = update.changes.toJSON();
        
        if (onCodeChange) {
          onCodeChange(newCode, changes);
        }

        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        setIsTyping(true);
        typingTimeoutRef.current = setTimeout(() => {
          setIsTyping(false);
        }, 2000);
      }

      if (update.selectionSet) {
        const selection = update.state.selection.main;
        const cursor = {
          line: update.state.doc.lineAt(selection.head).number,
          column: selection.head - update.state.doc.lineAt(selection.head).from + 1,
          pos: selection.head
        };

        const selectionRange = {
          from: selection.from,
          to: selection.to,
          anchor: selection.anchor,
          head: selection.head
        };

        if (onCursorChange) {
          onCursorChange(cursor);
        }
        if (onSelectionChange) {
          onSelectionChange(selectionRange, cursor);
        }
      }
    });
    
    updateListenerRef.current = updateListener;

    return [
      lineNumbers(),
      highlightActiveLineGutter(),
      highlightActiveLine(),
      drawSelection(),
      history(),
      bracketMatching(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      oneDark,
      getLanguageExtension(lang),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      EditorView.editable.of(!readonly),
      EditorView.lineWrapping,
      updateListener
    ];
  }, [getLanguageExtension]);

  useEffect(() => {
    if (!containerRef.current) return;

    const startState = EditorState.create({
      doc: initialCode || '',
      extensions: buildExtensions(language, readOnly, onCodeChange, onCursorChange, onSelectionChange)
    });

    viewRef.current = new EditorView({
      state: startState,
      parent: containerRef.current
    });

    return () => {
      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!viewRef.current) return;

    viewRef.current.dispatch({
      effects: StateEffect.reconfigure.of(
        buildExtensions(language, readOnly, onCodeChange, onCursorChange, onSelectionChange)
      )
    });
  }, [language, readOnly, buildExtensions, onCodeChange, onCursorChange, onSelectionChange]);

  useEffect(() => {
    if (!viewRef.current) return;

    const currentCode = viewRef.current.state.doc.toString();
    if (initialCode !== currentCode) {
      viewRef.current.dispatch({
        changes: {
          from: 0,
          to: currentCode.length,
          insert: initialCode
        }
      });
    }
  }, [initialCode]);

  const updateRemoteCursors = useCallback(() => {
    if (!viewRef.current || !containerRef.current) return;

    const view = viewRef.current;
    const editorEl = containerRef.current.querySelector('.cm-editor');
    if (!editorEl) return;
    
    const editorRect = editorEl.getBoundingClientRect();
    const scrollDom = view.scrollDOM;

    remoteCursorsRef.current.forEach(el => el.remove());
    remoteSelectionsRef.current.forEach(el => el.remove());
    remoteCursorsRef.current = [];
    remoteSelectionsRef.current = [];

    remoteUsers.forEach(user => {
      if (user.id === userId) return;

      if (user.cursor && user.cursor.pos !== undefined) {
        try {
          const coords = view.coordsAtPos(user.cursor.pos);
          if (coords) {
            const cursorEl = document.createElement('div');
            cursorEl.className = 'remote-cursor';
            cursorEl.style.backgroundColor = user.color;
            cursorEl.style.left = `${coords.left - editorRect.left + scrollDom.scrollLeft}px`;
            cursorEl.style.top = `${coords.top - editorRect.top + scrollDom.scrollTop}px`;
            cursorEl.style.height = `${coords.bottom - coords.top}px`;

            const labelEl = document.createElement('div');
            labelEl.className = 'remote-cursor-label';
            labelEl.style.backgroundColor = user.color;
            labelEl.textContent = user.name;
            cursorEl.appendChild(labelEl);

            editorEl.appendChild(cursorEl);
            remoteCursorsRef.current.push(cursorEl);
          }
        } catch (e) {
        }
      }

      if (user.selection && user.selection.from !== user.selection.to) {
        try {
          const fromCoords = view.coordsAtPos(user.selection.from);
          const toCoords = view.coordsAtPos(user.selection.to);
          
          if (fromCoords && toCoords) {
            const selectionEl = document.createElement('div');
            selectionEl.className = 'remote-selection';
            selectionEl.style.backgroundColor = user.color;
            selectionEl.style.left = `${fromCoords.left - editorRect.left + scrollDom.scrollLeft}px`;
            selectionEl.style.top = `${fromCoords.top - editorRect.top + scrollDom.scrollTop}px`;
            selectionEl.style.width = `${Math.max(1, toCoords.left - fromCoords.left)}px`;
            selectionEl.style.height = `${Math.max(16, toCoords.bottom - fromCoords.top)}px`;

            editorEl.appendChild(selectionEl);
            remoteSelectionsRef.current.push(selectionEl);
          }
        } catch (e) {
        }
      }
    });
  }, [remoteUsers, userId]);

  useEffect(() => {
    updateRemoteCursors();
  }, [updateRemoteCursors]);

  useEffect(() => {
    if (!viewRef.current) return;
    
    const view = viewRef.current;
    const scrollDom = view.scrollDOM;
    
    const handleScroll = () => {
      updateRemoteCursors();
    };
    
    scrollDom.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleScroll);
    
    return () => {
      scrollDom.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [updateRemoteCursors]);

  const insertCode = useCallback((text) => {
    if (!viewRef.current || readOnly) return;
    
    const view = viewRef.current;
    const selection = view.state.selection.main;
    
    view.dispatch({
      changes: {
        from: selection.from,
        to: selection.to,
        insert: text
      }
    });
  }, [readOnly]);

  const getCode = useCallback(() => {
    if (!viewRef.current) return '';
    return viewRef.current.state.doc.toString();
  }, []);

  return (
    <div ref={containerRef} className="editor-container" style={{ height: '100%', minHeight: '400px' }}>
      {readOnly && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          zIndex: 1001,
          pointerEvents: 'none'
        }}>
          <div className="read-only-indicator">
            <span>🔒</span>
            <span>只读模式</span>
          </div>
        </div>
      )}
    </div>
  );
});

CodeEditor.displayName = 'CodeEditor';

export default CodeEditor;
