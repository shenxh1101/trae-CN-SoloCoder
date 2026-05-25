import { useSceneStore } from '../../store/useSceneStore';
import { formatCoordinate } from '../../utils/coords';

export default function CityTooltip() {
  const hoveredCity = useSceneStore((state) => state.hoveredCity);
  const mousePosition = useSceneStore((state) => state.mousePosition);

  if (!hoveredCity) return null;

  return (
    <div
      className="fixed z-20 pointer-events-none transform -translate-x-1/2 -translate-y-full"
      style={{
        left: mousePosition.x,
        top: mousePosition.y - 20,
      }}
    >
      <div className="bg-slate-900/95 backdrop-blur-md rounded-lg p-3 border border-amber-500/50 shadow-lg shadow-amber-500/20 min-w-[160px]">
        <div className="absolute left-1/2 -bottom-2 transform -translate-x-1/2">
          <div className="w-3 h-3 bg-slate-900/95 border-r border-b border-amber-500/50 rotate-45" />
        </div>
        <div className="text-amber-400 font-bold text-sm mb-1">
          {hoveredCity.name}
        </div>
        <div className="text-slate-400 text-xs mb-2">
          {hoveredCity.country}
        </div>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-500">纬度:</span>
            <span className="text-cyan-400">
              {formatCoordinate(hoveredCity.lat, true)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">经度:</span>
            <span className="text-cyan-400">
              {formatCoordinate(hoveredCity.lng, false)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
