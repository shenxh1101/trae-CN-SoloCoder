import { useSceneStore } from '../../store/useSceneStore';

export default function AnimationIndicator() {
  const isAnimating = useSceneStore((state) => state.isAnimating);
  const currentTargetCity = useSceneStore((state) => state.currentTargetCity);

  if (!isAnimating || !currentTargetCity) return null;

  return (
    <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none">
      <div className="bg-slate-900/90 backdrop-blur-md rounded-xl px-8 py-4 border border-amber-500/50 shadow-lg shadow-amber-500/30">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-amber-400 rounded-full animate-pulse" />
          <div>
            <div className="text-amber-400 font-bold text-lg">
              飞往 {currentTargetCity.name}
            </div>
            <div className="text-slate-400 text-sm">
              {currentTargetCity.country}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
