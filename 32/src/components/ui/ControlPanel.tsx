import { useSceneStore } from '../../store/useSceneStore';
import { takeScreenshot } from '../../utils/screenshot';
import { Camera, Grid3X3, CameraOff, Zap, Pause, Play } from 'lucide-react';

export default function ControlPanel() {
  const rotationSpeed = useSceneStore((state) => state.rotationSpeed);
  const showGrid = useSceneStore((state) => state.showGrid);
  const isAnimating = useSceneStore((state) => state.isAnimating);
  const currentTargetCity = useSceneStore((state) => state.currentTargetCity);
  const setRotationSpeed = useSceneStore((state) => state.setRotationSpeed);
  const toggleGrid = useSceneStore((state) => state.toggleGrid);

  const handleFlyToCity = () => {
    if ((window as any).flyToRandomCity) {
      (window as any).flyToRandomCity();
    }
  };

  return (
    <div className="fixed top-2 right-2 sm:top-4 sm:right-4 z-10 bg-slate-900/80 backdrop-blur-md rounded-lg p-3 sm:p-4 border border-cyan-500/30 shadow-lg shadow-cyan-500/20 w-[200px] sm:min-w-[240px]">
      <h2 className="text-cyan-400 font-bold text-xs sm:text-sm mb-3 sm:mb-4 tracking-wider uppercase">
        控制面板
      </h2>

      <div className="space-y-3 sm:space-y-4">
        <div className="space-y-2">
          <label className="text-slate-300 text-xs flex items-center justify-between">
            <span className="flex items-center gap-1.5 sm:gap-2">
              {rotationSpeed === 0 ? <Pause size={12} /> : <Play size={12} />}
              <span className="hidden sm:inline">自转速度</span>
              <span className="sm:hidden">速度</span>
            </span>
            <span className="text-cyan-400 font-mono text-[10px] sm:text-xs">{rotationSpeed.toFixed(2)}</span>
          </label>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={rotationSpeed}
            onChange={(e) => setRotationSpeed(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={toggleGrid}
            className={`flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-lg text-[10px] sm:text-xs font-medium transition-all duration-300 ${
              showGrid
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                : 'bg-slate-700/50 text-slate-400 border border-slate-600/50 hover:border-slate-500'
            }`}
          >
            <Grid3X3 size={14} />
            <span className="hidden sm:inline">{showGrid ? '隐藏网格' : '显示网格'}</span>
            <span className="sm:hidden">{showGrid ? '关网格' : '开网格'}</span>
          </button>

          <button
            onClick={takeScreenshot}
            className="flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-lg text-[10px] sm:text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 hover:bg-emerald-500/30 transition-all duration-300"
          >
            <Camera size={14} />
            <span className="hidden sm:inline">截屏保存</span>
            <span className="sm:hidden">截屏</span>
          </button>
        </div>

        <button
          onClick={handleFlyToCity}
          disabled={isAnimating}
          className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-300 ${
            isAnimating
              ? 'bg-slate-600/50 text-slate-500 cursor-not-allowed border border-slate-600/50'
              : 'bg-amber-500/20 text-amber-400 border border-amber-500/50 hover:bg-amber-500/30'
          }`}
        >
          <Zap size={14} />
          {isAnimating
            ? currentTargetCity
              ? `飞向 ${currentTargetCity.name}...`
              : '飞行中...'
            : '随机城市飞行'}
        </button>
      </div>

      <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-slate-700/50">
        <p className="text-slate-500 text-[10px] sm:text-xs text-center">
          拖拽旋转 · 滚轮缩放
        </p>
      </div>
    </div>
  );
}
