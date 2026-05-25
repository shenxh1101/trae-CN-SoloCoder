import React from 'react';
import { Undo2, Redo2, RotateCcw, SplitSquareHorizontal, Camera, Keyboard } from 'lucide-react';
import { useConfigStore, useHistoryStore } from '@/store/useConfigStore';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { takeScreenshotFromCanvas } from '@/utils/screenshot';
import { cn } from '@/lib/utils';

export const StatusBar = () => {
  useKeyboardShortcuts();
  
  const { canUndo, canRedo, undo, redo, clearHistory, past, future } = useHistoryStore();
  const resetToDefault = useConfigStore((state) => state.resetToDefault);
  const compareMode = useConfigStore((state) => state.compareMode);
  const setCompareMode = useConfigStore((state) => state.setCompareMode);
  const selectedPart = useConfigStore((state) => state.selectedPart);
  const config = useConfigStore((state) => state.config);
  const { pushHistory } = useHistoryStore();

  const handleUndo = () => {
    undo();
  };

  const handleRedo = () => {
    redo();
  };

  const handleReset = () => {
    if (confirm('确定要重置为默认配置吗？所有自定义修改将丢失。')) {
      pushHistory(config);
      resetToDefault();
      clearHistory();
    }
  };

  const handleScreenshot = async () => {
    try {
      const dataUrl = await takeScreenshotFromCanvas(2);
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `my-shoe-design-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to take screenshot:', error);
    }
  };

  const handleToggleCompare = () => {
    setCompareMode(!compareMode);
  };

  return (
    <div className="h-12 bg-gray-900/95 backdrop-blur-xl border-t border-white/10 flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          <button
            onClick={handleUndo}
            disabled={!canUndo}
            className={cn(
              'p-2 rounded-lg transition-all',
              canUndo
                ? 'hover:bg-white/10 text-white/70 hover:text-white'
                : 'text-white/20 cursor-not-allowed'
            )}
            title="撤销 (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleRedo}
            disabled={!canRedo}
            className={cn(
              'p-2 rounded-lg transition-all',
              canRedo
                ? 'hover:bg-white/10 text-white/70 hover:text-white'
                : 'text-white/20 cursor-not-allowed'
            )}
            title="重做 (Ctrl+Y)"
          >
            <Redo2 className="w-4 h-4" />
          </button>
          <div className="w-px h-6 bg-white/10 mx-1" />
          <button
            onClick={handleReset}
            className="p-2 rounded-lg hover:bg-white/10 text-white/70 hover:text-red-400 transition-all"
            title="重置为默认"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        <div className="text-xs text-white/40 font-mono">
          历史: {past.length} ← / {future.length} →
        </div>
      </div>

      <div className="flex items-center gap-3">
        {selectedPart && (
          <div className="flex items-center gap-2 px-3 py-1 bg-cyan-500/20 rounded-full">
            <div
              className="w-3 h-3 rounded-full border border-white/30"
              style={{ backgroundColor: config.parts[selectedPart].color }}
            />
            <span className="text-xs text-cyan-300">
              {selectedPart === 'upper' && '鞋面主体'}
              {selectedPart === 'sole' && '鞋底'}
              {selectedPart === 'laces' && '鞋带'}
              {selectedPart === 'logo' && 'Logo标志'}
              {selectedPart === 'heel' && '后跟支撑片'}
              {selectedPart === 'tongue' && '鞋舌'}
              {selectedPart === 'lining' && '内衬'}
            </span>
          </div>
        )}

        <div className="w-px h-6 bg-white/10" />

        <div className="flex items-center gap-1">
          <button
            onClick={handleToggleCompare}
            className={cn(
              'p-2 rounded-lg transition-all flex items-center gap-1.5',
              compareMode
                ? 'bg-cyan-500/20 text-cyan-400'
                : 'hover:bg-white/10 text-white/70 hover:text-white'
            )}
            title="对比视图 (C)"
          >
            <SplitSquareHorizontal className="w-4 h-4" />
            <span className="text-xs">对比</span>
          </button>

          <button
            onClick={handleScreenshot}
            className="p-2 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-all flex items-center gap-1.5"
            title="截图"
          >
            <Camera className="w-4 h-4" />
            <span className="text-xs">截图</span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-white/40">
          <Keyboard className="w-3.5 h-3.5" />
          <span className="text-xs">快捷键: Ctrl+Z/Y, 1-7, C, Esc</span>
        </div>
      </div>
    </div>
  );
};

export default StatusBar;
