import React from 'react';
import { Undo2, Redo2, RotateCcw, History } from 'lucide-react';
import { useHistoryStore } from '@/store/useConfigStore';
import { useConfigStore } from '@/store/useConfigStore';
import { cn } from '@/lib/utils';

interface HistoryBarProps {
  className?: string;
}

export const HistoryBar = ({ className }: HistoryBarProps) => {
  const { canUndo, canRedo, undo, redo, clearHistory, past, future } = useHistoryStore();
  const resetToDefault = useConfigStore((state) => state.resetToDefault);
  const { pushHistory } = useHistoryStore();

  const handleUndo = () => {
    undo();
  };

  const handleRedo = () => {
    redo();
  };

  const handleReset = () => {
    if (confirm('确定要重置为默认配置吗？所有自定义修改将丢失。')) {
      pushHistory(useConfigStore.getState().config);
      resetToDefault();
      clearHistory();
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-white">历史记录</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-white/50">
          <span>{past.length} 步可撤销</span>
          <span className="mx-1">/</span>
          <span>{future.length} 步可重做</span>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleUndo}
          disabled={!canUndo}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-all',
            canUndo
              ? 'bg-white/5 border-white/20 hover:bg-white/10 hover:border-cyan-400 text-white'
              : 'bg-white/5 border-white/10 text-white/30 cursor-not-allowed'
          )}
          title="撤销 (Ctrl+Z)"
        >
          <Undo2 className="w-4 h-4" />
          <span className="text-xs">撤销</span>
        </button>

        <button
          onClick={handleRedo}
          disabled={!canRedo}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-all',
            canRedo
              ? 'bg-white/5 border-white/20 hover:bg-white/10 hover:border-cyan-400 text-white'
              : 'bg-white/5 border-white/10 text-white/30 cursor-not-allowed'
          )}
          title="重做 (Ctrl+Y)"
        >
          <Redo2 className="w-4 h-4" />
          <span className="text-xs">重做</span>
        </button>

        <button
          onClick={handleReset}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all"
          title="重置为默认"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      <div className="p-3 bg-white/5 rounded-lg">
        <div className="text-xs text-white/60 mb-2">操作提示</div>
        <ul className="space-y-1 text-xs text-white/50">
          <li className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-white/70 font-mono">Ctrl+Z</kbd>
            <span>撤销上一步操作</span>
          </li>
          <li className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-white/70 font-mono">Ctrl+Y</kbd>
            <span>重做已撤销的操作</span>
          </li>
          <li className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-white/70 font-mono">1-7</kbd>
            <span>快速选择部件</span>
          </li>
          <li className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-white/70 font-mono">C</kbd>
            <span>切换对比视图</span>
          </li>
          <li className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-white/70 font-mono">Esc</kbd>
            <span>取消选择</span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default HistoryBar;
