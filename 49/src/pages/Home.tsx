import { useCallback, useState, useEffect, useRef } from 'react';
import StarScene from '@/components/StarScene';
import ControlPanel from '@/components/ControlPanel';
import { useStarStore } from '@/store/useStarStore';

export default function Home() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isTakingScreenshot, setIsTakingScreenshot] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { isPanelOpen, setIsPanelOpen } = useStarStore();

  const handleReady = useCallback(() => {
    setIsLoaded(true);
  }, []);

  const handleCanvasReady = useCallback((canvas: HTMLCanvasElement) => {
    canvasRef.current = canvas;
  }, []);

  const handleScreenshot = useCallback(() => {
    if (!canvasRef.current) return;

    setIsTakingScreenshot(true);
    const wasPanelOpen = isPanelOpen;

    if (wasPanelOpen) {
      setIsPanelOpen(false);
    }

    setTimeout(() => {
      if (!canvasRef.current) return;

      const link = document.createElement('a');
      link.download = `starfield-${Date.now()}.png`;
      link.href = canvasRef.current.toDataURL('image/png');
      link.click();

      if (wasPanelOpen) {
        setTimeout(() => {
          setIsPanelOpen(true);
          setIsTakingScreenshot(false);
        }, 100);
      } else {
        setIsTakingScreenshot(false);
      }
    }, 150);
  }, [isPanelOpen, setIsPanelOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'h' || e.key === 'H') {
        setIsPanelOpen(!isPanelOpen);
      }
      if (e.key === 's' || e.key === 'S') {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          handleScreenshot();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleScreenshot, isPanelOpen, setIsPanelOpen]);

  return (
    <div className="w-full h-screen bg-black relative overflow-hidden">
      <div className="absolute inset-0">
        <StarScene onReady={handleReady} onCanvasReady={handleCanvasReady} />
      </div>

      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-40">
          <div className="text-center">
            <div className="w-12 h-12 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white/60 text-sm tracking-wider">加载星空...</p>
          </div>
        </div>
      )}

      {!isTakingScreenshot && (
        <ControlPanel onScreenshot={handleScreenshot} />
      )}

      <div className="absolute bottom-4 left-4 text-white/40 text-xs space-y-1 z-50">
        <p>拖拽旋转视角 | 滚轮缩放</p>
        <p>按 H 切换控制面板 | Ctrl+S 截图</p>
      </div>
    </div>
  );
}
