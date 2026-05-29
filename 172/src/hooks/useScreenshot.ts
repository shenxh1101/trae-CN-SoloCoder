import { useCallback } from 'react';

export function useScreenshot() {
  const takeScreenshot = useCallback((filename = 'atom-model.png') => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, []);

  return takeScreenshot;
}
