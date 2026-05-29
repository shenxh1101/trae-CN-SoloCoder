import { Camera, RefreshCw, FileJson } from 'lucide-react';

interface ActionButtonsProps {
  onScreenshot: () => void;
  onExport: () => void;
  onRegenerate: () => void;
}

export function ActionButtons({ onScreenshot, onExport, onRegenerate }: ActionButtonsProps) {
  return (
    <div className="space-y-2 mt-4">
      <button
        onClick={onScreenshot}
        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white rounded-lg font-medium text-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-cyan-500/30 active:scale-[0.98]"
      >
        <Camera size={16} />
        一键截图 PNG
      </button>
      
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={onExport}
          className="flex items-center justify-center gap-1.5 py-2 px-3 bg-gray-700/50 hover:bg-gray-600/50 text-gray-200 rounded-lg font-medium text-xs transition-all duration-200 hover:scale-[1.02] border border-gray-600"
        >
          <FileJson size={14} />
          导出配置
        </button>
        
        <button
          onClick={onRegenerate}
          className="flex items-center justify-center gap-1.5 py-2 px-3 bg-gray-700/50 hover:bg-gray-600/50 text-gray-200 rounded-lg font-medium text-xs transition-all duration-200 hover:scale-[1.02] border border-gray-600"
        >
          <RefreshCw size={14} />
          重新生成
        </button>
      </div>
    </div>
  );
}
