import { useSceneStore } from '../../store/useSceneStore';

export default function StatusBar() {
  const fps = useSceneStore((state) => state.fps);
  const cameraPosition = useSceneStore((state) => state.cameraPosition);

  const getFpsColor = () => {
    if (fps >= 50) return 'text-emerald-400';
    if (fps >= 30) return 'text-amber-400';
    return 'text-red-400';
  };

  return (
    <div className="fixed bottom-2 sm:bottom-4 left-1/2 transform -translate-x-1/2 z-10 bg-slate-900/80 backdrop-blur-md rounded-lg px-3 sm:px-6 py-1.5 sm:py-2 border border-slate-700/50 shadow-lg max-w-[95vw] overflow-x-auto">
      <div className="flex items-center gap-4 sm:gap-8 text-[10px] sm:text-xs font-mono whitespace-nowrap">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="text-slate-500">FPS:</span>
          <span className={getFpsColor()}>{fps}</span>
        </div>
        <div className="w-px h-3 sm:h-4 bg-slate-700" />
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-1">
            <span className="text-slate-500">X:</span>
            <span className="text-cyan-400">{cameraPosition.x.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-slate-500">Y:</span>
            <span className="text-cyan-400">{cameraPosition.y.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-slate-500">Z:</span>
            <span className="text-cyan-400">{cameraPosition.z.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
