import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Language, EditorSettings } from '@/shared/types';

interface EditorState {
  code: string;
  language: Language;
  settings: EditorSettings;
  setCode: (code: string) => void;
  setLanguage: (language: Language) => void;
  updateSettings: (settings: Partial<EditorSettings>) => void;
  resetSettings: () => void;
  updateKeybinding: (command: string, shortcut: string) => void;
}

const defaultSettings: EditorSettings = {
  theme: 'vs-dark',
  fontSize: 14,
  fontFamily: 'JetBrains Mono, Menlo, Monaco, Consolas, "Courier New", monospace',
  tabSize: 2,
  insertSpaces: true,
  minimap: true,
  wordWrap: 'off',
  keybindings: {
    save: 'Ctrl+S',
    run: 'Ctrl+Enter',
    format: 'Shift+Alt+F',
    comment: 'Ctrl+/',
    find: 'Ctrl+F',
    replace: 'Ctrl+H',
  },
};

const defaultCodeTemplates: Record<Language, string> = {
  javascript: `// JavaScript 代码
function greet(name) {
  return \`Hello, \${name}!\`;
}

console.log(greet('World'));
`,
  python: `# Python 代码
def greet(name):
    return f"Hello, {name}!"

print(greet("World"))
`,
  go: `// Go 代码
package main

import "fmt"

func greet(name string) string {
	return fmt.Sprintf("Hello, %s!", name)
}

func main() {
	fmt.Println(greet("World"))
}
`,
  rust: `// Rust 代码
fn greet(name: &str) -> String {
    format!("Hello, {}!", name)
}

fn main() {
    println!("{}", greet("World"));
}
`,
};

export const useEditorStore = create<EditorState>()(
  persist(
    (set) => ({
      code: defaultCodeTemplates.javascript,
      language: 'javascript',
      settings: defaultSettings,

      setCode: (code: string) => set({ code }),

      setLanguage: (language: Language) => set({
        language,
        code: defaultCodeTemplates[language],
      }),

      updateSettings: (settings: Partial<EditorSettings>) => set((state) => ({
        settings: { ...state.settings, ...settings },
      })),

      resetSettings: () => set({ settings: defaultSettings }),

      updateKeybinding: (command: string, shortcut: string) => set((state) => ({
        settings: {
          ...state.settings,
          keybindings: {
            ...state.settings.keybindings,
            [command]: shortcut,
          },
        },
      })),
    }),
    {
      name: 'editor-storage',
      partialize: (state) => ({ settings: state.settings }),
    }
  )
);
