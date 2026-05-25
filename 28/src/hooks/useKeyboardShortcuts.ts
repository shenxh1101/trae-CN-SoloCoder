import { useEffect } from 'react';
import { usePlayerStore } from '../store/playerStore';

export function useKeyboardShortcuts() {
  const { togglePlay, prevSong, nextSong, volume, setVolume } = usePlayerStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          prevSong();
          break;
        case 'ArrowRight':
          e.preventDefault();
          nextSong();
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolume(Math.min(1, volume + 0.1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolume(Math.max(0, volume - 0.1));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, prevSong, nextSong, volume, setVolume]);
}
