import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ShortcutInputProps {
  value: string;
  onChange: (shortcut: string) => void;
  onCancel: () => void;
}

const MODIFIER_KEYS = new Set([
  'Control',
  'Shift',
  'Alt',
  'Meta',
  'OS',
]);

const KEY_ALIASES: Record<string, string> = {
  ' ': 'Space',
  'ArrowUp': '↑',
  'ArrowDown': '↓',
  'ArrowLeft': '←',
  'ArrowRight': '→',
  'Delete': 'Del',
  'Escape': 'Esc',
  'Backspace': '⌫',
  'Enter': '↵',
  'Tab': '⇥',
};

export default function ShortcutInput({ value, onChange, onCancel }: ShortcutInputProps) {
  const [recordingKeys, setRecordingKeys] = useState<string[]>([]);
  const [hasValidShortcut, setHasValidShortcut] = useState(false);
  const inputRef = useRef<HTMLDivElement>(null);
  const pressedKeys = useRef<Set<string>>(new Set());

  const parseShortcut = (shortcut: string): string[] => {
    return shortcut.split('+').filter(Boolean);
  };

  const displayKeys = hasValidShortcut ? parseShortcut(value) : recordingKeys;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const key = e.key;

    if (key === 'Escape') {
      onCancel();
      return;
    }

    pressedKeys.current.add(key);

    const keys: string[] = [];
    if (e.ctrlKey || e.metaKey) keys.push('Ctrl');
    if (e.shiftKey) keys.push('Shift');
    if (e.altKey) keys.push('Alt');

    let displayKey = key;
    if (KEY_ALIASES[key]) {
      displayKey = KEY_ALIASES[key];
    } else if (!MODIFIER_KEYS.has(key)) {
      displayKey = key.length === 1 ? key.toUpperCase() : key;
    }

    if (!MODIFIER_KEYS.has(key)) {
      keys.push(displayKey);
    }

    setRecordingKeys(keys);

    const hasModifier = keys.some(k => ['Ctrl', 'Shift', 'Alt'].includes(k));
    const hasNonModifier = keys.some(k => !['Ctrl', 'Shift', 'Alt'].includes(k));

    if (hasModifier && hasNonModifier && keys.length >= 2) {
      setHasValidShortcut(true);
      onChange(keys.join('+'));
    }
  }, [onChange, onCancel]);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    pressedKeys.current.delete(e.key);

    if (pressedKeys.current.size === 0) {
      const hasModifier = recordingKeys.some(k => ['Ctrl', 'Shift', 'Alt'].includes(k));
      const hasNonModifier = recordingKeys.some(k => !['Ctrl', 'Shift', 'Alt'].includes(k));
      
      if (hasModifier && hasNonModifier && recordingKeys.length >= 2) {
        onCancel();
      }
    }
  }, [recordingKeys, onCancel]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keyup', handleKeyUp, true);
    };
  }, [handleKeyDown, handleKeyUp]);

  return (
    <div
      ref={inputRef}
      tabIndex={0}
      className={cn(
        'inline-flex items-center gap-1 rounded-md border-2 border-blue-500 bg-blue-50 px-3 py-1.5 text-sm font-mono text-blue-700 outline-none dark:bg-blue-900/30 dark:text-blue-400',
        'animate-pulse'
      )}
    >
      {displayKeys.length > 0 ? (
        displayKeys.map((key, idx) => (
          <span key={idx}>
            {idx > 0 && <span className="mx-0.5 text-blue-400">+</span>}
            <kbd className="rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium dark:bg-blue-800/50">
              {key}
            </kbd>
          </span>
        ))
      ) : (
        <span className="text-blue-600 dark:text-blue-400">按下新快捷键...</span>
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onCancel();
        }}
        className="ml-2 rounded p-0.5 text-blue-400 hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-800/50"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
