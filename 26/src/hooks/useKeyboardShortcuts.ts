import { useEffect } from 'react';
import { useHistoryStore, useConfigStore } from '@/store/useConfigStore';

export const useKeyboardShortcuts = () => {
  const { undo, redo, canUndo, canRedo } = useHistoryStore();
  const { selectedPart, setSelectedPart, compareMode, setCompareMode } = useConfigStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) {
          undo();
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        if (canRedo) {
          redo();
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        return;
      }

      const partKeys: Record<string, string> = {
        '1': 'upper',
        '2': 'sole',
        '3': 'laces',
        '4': 'logo',
        '5': 'heel',
        '6': 'tongue',
        '7': 'lining'
      };

      if (partKeys[e.key]) {
        setSelectedPart(partKeys[e.key] as any);
        return;
      }

      if (e.key === 'c' || e.key === 'C') {
        setCompareMode(!compareMode);
        return;
      }

      if (e.key === 'Escape') {
        setSelectedPart(null);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, canUndo, canRedo, selectedPart, setSelectedPart, compareMode, setCompareMode]);
};
