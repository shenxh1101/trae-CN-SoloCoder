import { useEffect, useCallback, useRef } from 'react';
import type { editor } from 'monaco-editor';
import type { IRange } from 'monaco-editor';
import { cn } from '@/lib/utils';
import type { Collaborator } from '@/shared/types';

declare global {
  interface Window {
    monaco?: typeof import('monaco-editor');
  }
}

interface CollaboratorCursorsProps {
  editor: editor.IStandaloneCodeEditor | null;
  monaco: typeof import('monaco-editor') | null;
  collaborators: Collaborator[];
}

interface CursorDecoration {
  id: string;
  range: IRange;
  options: editor.IModelDecorationOptions;
}

const cursorColors = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#96CEB4',
  '#FFEAA7',
  '#DDA0DD',
  '#98D8C8',
  '#F7DC6F',
  '#BB8FCE',
  '#85C1E9',
];

export default function CollaboratorCursors({
  editor,
  monaco,
  collaborators,
}: CollaboratorCursorsProps) {
  const decorationsRef = useRef<Map<string, string>>(new Map());
  const widgetsRef = useRef<Map<string, { widget: editor.IContentWidget; userId: string }>>(new Map());

  const createCursorDecoration = useCallback(
    (collaborator: Collaborator): CursorDecoration => {
      const { lineNumber, column } = collaborator.cursor;
      const { selection } = collaborator.cursor;

      if (selection && selection.startLineNumber !== selection.endLineNumber || selection && selection.startColumn !== selection.endColumn) {
        return {
          id: `selection-${collaborator.userId}`,
          range: {
            startLineNumber: selection.startLineNumber,
            startColumn: selection.startColumn,
            endLineNumber: selection.endLineNumber,
            endColumn: selection.endColumn,
          },
          options: {
            className: `collaborator-selection-${collaborator.userId}`,
            inlineClassName: `collaborator-selection-inline-${collaborator.userId}`,
            zIndex: 1,
          },
        };
      }

      return {
        id: `cursor-${collaborator.userId}`,
        range: {
          startLineNumber: lineNumber,
          startColumn: column,
          endLineNumber: lineNumber,
          endColumn: column,
        },
        options: {
          className: `collaborator-cursor-${collaborator.userId}`,
          zIndex: 100,
        },
      };
    },
    []
  );

  const createCursorWidget = useCallback(
    (
      collaborator: Collaborator
    ): editor.IContentWidget => {
      if (!monaco) {
        throw new Error('Monaco editor instance is not available');
      }
      const color = collaborator.color || cursorColors[collaborators.indexOf(collaborator) % cursorColors.length];

      const domNode = document.createElement('div');
      domNode.className = 'collaborator-cursor-widget';
      domNode.style.position = 'absolute';
      domNode.style.pointerEvents = 'none';
      domNode.style.zIndex = '1000';

      const cursorElement = document.createElement('div');
      cursorElement.className = 'collaborator-cursor-line';
      cursorElement.style.width = '2px';
      cursorElement.style.height = '20px';
      cursorElement.style.backgroundColor = color;
      cursorElement.style.position = 'absolute';
      cursorElement.style.left = '0';
      cursorElement.style.animation = 'blink 1s step-end infinite';

      const labelElement = document.createElement('div');
      labelElement.className = 'collaborator-cursor-label';
      labelElement.style.position = 'absolute';
      labelElement.style.left = '2px';
      labelElement.style.top = '-24px';
      labelElement.style.whiteSpace = 'nowrap';
      labelElement.style.backgroundColor = color;
      labelElement.style.color = '#fff';
      labelElement.style.fontSize = '11px';
      labelElement.style.fontWeight = '500';
      labelElement.style.padding = '2px 6px';
      labelElement.style.borderRadius = '3px';
      labelElement.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
      labelElement.textContent = collaborator.username;

      domNode.appendChild(cursorElement);
      domNode.appendChild(labelElement);

      return {
        getId: () => `collaborator-cursor-${collaborator.userId}`,
        getDomNode: () => domNode,
        getPosition: () => ({
          position: {
            lineNumber: collaborator.cursor.lineNumber,
            column: collaborator.cursor.column,
          },
          preference: [
            monaco.editor.ContentWidgetPositionPreference.EXACT,
          ],
        }),
      };
    },
    [collaborators, monaco]
  );

  const injectStyles = useCallback((collaborators: Collaborator[]) => {
    const styleId = 'collaborator-cursors-styles';
    let styleElement = document.getElementById(styleId) as HTMLStyleElement | null;

    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }

    let css = `
      @keyframes blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0; }
      }
    `;

    collaborators.forEach((collab, index) => {
      const color = collab.color || cursorColors[index % cursorColors.length];
      css += `
        .collaborator-cursor-${collab.userId} {
          border-left: 2px solid ${color};
        }
        .collaborator-selection-${collab.userId} {
          background-color: ${color}20;
          border-radius: 2px;
        }
        .collaborator-selection-inline-${collab.userId} {
          background-color: ${color}30;
        }
      `;
    });

    styleElement.textContent = css;
  }, []);

  const updateDecorations = useCallback(() => {
    if (!editor) return;

    const model = editor.getModel();
    if (!model) return;

    if (!monaco) return;

    injectStyles(collaborators);

    const newDecorations: editor.IModelDeltaDecoration[] = [];
    const activeIds = new Set<string>();

    collaborators.forEach((collaborator) => {
      const decoration = createCursorDecoration(collaborator);
      newDecorations.push({
        range: decoration.range,
        options: decoration.options,
      });
      activeIds.add(decoration.id);

      let widget = widgetsRef.current.get(collaborator.userId);
      if (!widget) {
        const newWidget = createCursorWidget(collaborator);
        editor.addContentWidget(newWidget);
        widgetsRef.current.set(collaborator.userId, { widget: newWidget, userId: collaborator.userId });
      } else {
        editor.layoutContentWidget(widget.widget);
      }
    });

    widgetsRef.current.forEach(({ widget, userId }) => {
      if (!collaborators.find(c => c.userId === userId)) {
        editor.removeContentWidget(widget);
        widgetsRef.current.delete(userId);
      }
    });

    const oldIds = Array.from(decorationsRef.current.values());
    const newDecorationIds = model.deltaDecorations(oldIds, newDecorations);

    decorationsRef.current.clear();
    newDecorationIds.forEach((id, index) => {
      decorationsRef.current.set(activeIds.values().next().value || `dec-${index}`, id);
    });
  }, [editor, monaco, collaborators, createCursorDecoration, createCursorWidget, injectStyles]);

  useEffect(() => {
    updateDecorations();
  }, [updateDecorations]);

  useEffect(() => {
    if (!editor) return;

    const handleDidChangeModel = () => {
      decorationsRef.current.clear();
      updateDecorations();
    };

    editor.onDidChangeModel(handleDidChangeModel);

    return () => {
      widgetsRef.current.forEach(({ widget }) => {
        try {
          editor.removeContentWidget(widget);
        } catch (e) {
          // ignore
        }
      });
      widgetsRef.current.clear();
      decorationsRef.current.clear();
    };
  }, [editor, updateDecorations]);

  const OnlineUsers = () => (
    <div className="absolute right-4 top-4 z-10 flex items-center gap-2 rounded-lg bg-white/90 px-3 py-2 shadow-lg backdrop-blur-sm dark:bg-gray-800/90">
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
        协作者:
      </span>
      <div className="flex -space-x-2">
        {collaborators.map((collaborator, index) => (
          <div
            key={collaborator.userId}
            className="group relative"
            style={{ zIndex: collaborators.length - index }}
          >
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-xs font-medium text-white shadow-sm dark:border-gray-800"
              style={{
                backgroundColor: collaborator.color || cursorColors[index % cursorColors.length],
              }}
            >
              {collaborator.username.charAt(0).toUpperCase()}
            </div>
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 dark:bg-gray-700">
              {collaborator.username}
              <div className="absolute -top-1 left-1/2 h-0 w-0 -translate-x-1/2 border-x-4 border-b-4 border-x-transparent border-b-gray-900 dark:border-b-gray-700" />
            </div>
          </div>
        ))}
      </div>
      {collaborators.length > 0 && (
        <span className="ml-1 text-xs font-medium text-green-500">
          {collaborators.length} 在线
        </span>
      )}
    </div>
  );

  return collaborators.length > 0 ? <OnlineUsers /> : null;
}
