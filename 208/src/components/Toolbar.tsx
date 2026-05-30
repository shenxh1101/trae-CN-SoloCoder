import { Camera, Download, Stars, Square, RotateCcw } from 'lucide-react';

interface ToolbarProps {
  backgroundType: 'solid' | 'stars';
  setBackgroundType: (type: 'solid' | 'stars') => void;
  onScreenshot: () => void;
  onExportTextures: () => void;
  onReset: () => void;
}

export function Toolbar({
  backgroundType,
  setBackgroundType,
  onScreenshot,
  onExportTextures,
  onReset,
}: ToolbarProps) {
  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-900/90 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-2xl">
        <button
          onClick={onScreenshot}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition-all hover:shadow-lg hover:shadow-purple-500/30 active:scale-95"
        >
          <Camera className="w-4 h-4" />
          <span className="text-sm font-medium">截图保存</span>
        </button>

        <div className="w-px h-6 bg-slate-700" />

        <button
          onClick={onExportTextures}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-all hover:shadow-lg active:scale-95"
        >
          <Download className="w-4 h-4" />
          <span className="text-sm font-medium">导出纹理</span>
        </button>

        <div className="w-px h-6 bg-slate-700" />

        <div className="flex items-center gap-1 bg-slate-800 rounded-xl p-1">
          <button
            onClick={() => setBackgroundType('solid')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
              backgroundType === 'solid'
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Square className="w-4 h-4" />
            <span className="text-sm">纯色</span>
          </button>
          <button
            onClick={() => setBackgroundType('stars')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
              backgroundType === 'stars'
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Stars className="w-4 h-4" />
            <span className="text-sm">星空</span>
          </button>
        </div>

        <div className="w-px h-6 bg-slate-700" />

        <button
          onClick={onReset}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-all hover:shadow-lg active:scale-95"
        >
          <RotateCcw className="w-4 h-4" />
          <span className="text-sm font-medium">重置</span>
        </button>
      </div>
    </div>
  );
}
