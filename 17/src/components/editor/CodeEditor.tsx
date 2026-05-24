import { useRef, useCallback, useEffect } from 'react';
import Editor, { type EditorProps, type OnMount, type OnChange } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import type { IPosition, ISelection, IRange } from 'monaco-editor';
import { cn } from '@/lib/utils';
import type { Language, EditorSettings } from '@/shared/types';

const languageConfig: Record<Language, { label: string; icon: string }> = {
  javascript: { label: 'JavaScript', icon: 'JS' },
  python: { label: 'Python', icon: 'PY' },
  go: { label: 'Go', icon: 'GO' },
  rust: { label: 'Rust', icon: 'RS' },
};

interface CodeEditorProps extends Omit<EditorProps, 'language' | 'theme' | 'onChange'> {
  value: string;
  language?: Language;
  onChange?: (value: string) => void;
  onCursorChange?: (position: IPosition) => void;
  onSelectionChange?: (selection: ISelection) => void;
  settings?: Partial<EditorSettings>;
  readOnly?: boolean;
  className?: string;
}

export default function CodeEditor({
  value,
  language = 'javascript',
  onChange,
  onCursorChange,
  onSelectionChange,
  settings = {},
  readOnly = false,
  className,
  height = '100%',
  ...props
}: CodeEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof import('monaco-editor') | null>(null);

  const defaultSettings: EditorSettings = {
    theme: 'vs-dark',
    fontSize: 14,
    fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
    tabSize: 2,
    insertSpaces: true,
    minimap: true,
    wordWrap: 'on',
    keybindings: {},
  };

  const mergedSettings = { ...defaultSettings, ...settings };

  const handleEditorMount: OnMount = useCallback(
    (editor, monaco) => {
      editorRef.current = editor;
      monacoRef.current = monaco;

      editor.onDidChangeCursorPosition((e) => {
        onCursorChange?.(e.position);
      });

      editor.onDidChangeCursorSelection((e) => {
        onSelectionChange?.(e.selection);
      });

      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        console.log('Save triggered');
      });

      monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: true,
        noSyntaxValidation: false,
      });

      monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
        target: monaco.languages.typescript.ScriptTarget.ESNext,
        allowNonTsExtensions: true,
      });

      props.onMount?.(editor, monaco);
    },
    [onCursorChange, onSelectionChange, props]
  );

  const handleChange: OnChange = useCallback(
    (value) => {
      onChange?.(value ?? '');
    },
    [onChange]
  );

  useEffect(() => {
    if (editorRef.current && monacoRef.current) {
      const model = editorRef.current.getModel();
      if (model) {
        monacoRef.current.editor.setModelLanguage(model, language);
      }
    }
  }, [language]);

  return (
    <div className={cn('relative h-full w-full overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900', className)}>
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-2 dark:border-gray-800 dark:bg-gray-800/50">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="h-3 w-3 rounded-full bg-red-500" />
            <span className="h-3 w-3 rounded-full bg-yellow-500" />
            <span className="h-3 w-3 rounded-full bg-green-500" />
          </div>
          <div className="ml-4 flex items-center gap-2">
            <span className="rounded bg-gray-200 px-2 py-0.5 text-xs font-mono font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-200">
              {languageConfig[language]?.icon || language.toUpperCase()}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {languageConfig[language]?.label || language}
            </span>
          </div>
        </div>
        {readOnly && (
          <span className="rounded bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
            只读
          </span>
        )}
      </div>

      <Editor
        height={`calc(${height} - 41px)`}
        language={language}
        value={value}
        onChange={handleChange}
        onMount={handleEditorMount}
        theme={mergedSettings.theme}
        options={{
          fontSize: mergedSettings.fontSize,
          fontFamily: mergedSettings.fontFamily,
          tabSize: mergedSettings.tabSize,
          insertSpaces: mergedSettings.insertSpaces,
          minimap: { enabled: mergedSettings.minimap },
          wordWrap: mergedSettings.wordWrap,
          readOnly,
          automaticLayout: true,
          scrollBeyondLastLine: false,
          lineNumbers: 'on',
          renderLineHighlight: 'all',
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          smoothScrolling: true,
          padding: { top: 16, bottom: 16 },
          bracketPairColorization: { enabled: true },
          guides: { bracketPairs: true },
          renderWhitespace: 'selection',
          quickSuggestions: {
            other: true,
            comments: false,
            strings: false,
          },
          suggestOnTriggerCharacters: true,
          acceptSuggestionOnEnter: 'smart',
          tabCompletion: 'on',
          folding: true,
          foldingHighlight: true,
          formatOnPaste: true,
          formatOnType: true,
          links: true,
          mouseWheelZoom: true,
          multiCursorModifier: 'ctrlCmd',
        }}
        {...props}
      />
    </div>
  );
}
