import { useState, useCallback, useEffect } from 'react';
import BubbleScene from '../components/BubbleScene';
import ControlPanel from '../components/ControlPanel';
import StatsDisplay from '../components/StatsDisplay';
import { useBubbleStore } from '../store/useBubbleStore';

export default function Home() {
  const [bubbleCount, setBubbleCount] = useState(0);
  const { setCurrentBubbleCount } = useBubbleStore();

  const handleBubbleCountChange = useCallback((count: number) => {
    setBubbleCount(count);
    setCurrentBubbleCount(count);
  }, [setCurrentBubbleCount]);

  const handleScreenshot = useCallback(() => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      try {
        const dataURL = canvas.toDataURL('image/png', 1.0);
        
        if (dataURL.startsWith('data:image/png;base64,')) {
          const link = document.createElement('a');
          link.download = `bubbles-${Date.now()}.png`;
          link.href = dataURL;
          link.click();
        } else {
          canvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.download = `bubbles-${Date.now()}.png`;
              link.href = url;
              link.click();
              URL.revokeObjectURL(url);
            }
          }, 'image/png', 1.0);
        }
      } catch (e) {
        console.error('Screenshot failed:', e);
      }
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleScreenshot();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleScreenshot]);

  return (
    <div className="w-full h-screen overflow-hidden relative">
      <BubbleScene onBubbleCountChange={handleBubbleCountChange} />
      <ControlPanel onScreenshot={handleScreenshot} />
      <StatsDisplay bubbleCount={bubbleCount} />

      <div className="fixed bottom-4 right-4 z-50">
        <div className="bg-black/30 backdrop-blur-lg rounded-xl border border-white/10 px-4 py-2">
          <p className="text-xs text-white/50">
            提示：点击气泡可戳破 · Ctrl+S 保存截图
          </p>
        </div>
      </div>
    </div>
  );
}
