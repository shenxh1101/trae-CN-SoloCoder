import { useNebulaStore } from '@/store/useNebulaStore';
import { ArmCount } from '@/types/nebula';

export function ControlPanel() {
  const {
    particleCount,
    armCount,
    rotationSpeed,
    particleSpeed,
    updateParameter,
  } = useNebulaStore();

  return (
    <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-64">
      <div className="bg-[rgba(15,15,35,0.8)] backdrop-blur-md rounded-xl border border-[rgba(139,92,246,0.3)] p-5 shadow-2xl">
        <h2 className="text-lg font-bold text-white mb-4 tracking-wider" style={{ fontFamily: "'Orbitron', sans-serif" }}>
          参数控制
        </h2>

        <div className="space-y-5">
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm text-gray-300">螺旋臂数量</label>
              <span className="text-sm text-purple-400 font-mono">{armCount}</span>
            </div>
            <div className="flex gap-2">
              {([2, 3, 4] as ArmCount[]).map((count) => (
                <button
                  key={count}
                  onClick={() => updateParameter('armCount', count)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                    armCount === count
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                      : 'bg-[rgba(255,255,255,0.1)] text-gray-300 hover:bg-[rgba(255,255,255,0.2)]'
                  }`}
                >
                  {count}条
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm text-gray-300">粒子数量</label>
              <span className="text-sm text-purple-400 font-mono">{particleCount.toLocaleString()}</span>
            </div>
            <input
              type="range"
              min="500"
              max="10000"
              step="500"
              value={particleCount}
              onChange={(e) => updateParameter('particleCount', parseInt(e.target.value))}
              className="w-full h-2 bg-[rgba(255,255,255,0.1)] rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>500</span>
              <span>10000</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm text-gray-300">旋转速度</label>
              <span className="text-sm text-purple-400 font-mono">{rotationSpeed.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="2"
              step="0.05"
              value={rotationSpeed}
              onChange={(e) => updateParameter('rotationSpeed', parseFloat(e.target.value))}
              className="w-full h-2 bg-[rgba(255,255,255,0.1)] rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>静止</span>
              <span>快速</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm text-gray-300">粒子运动速度</label>
              <span className="text-sm text-purple-400 font-mono">{particleSpeed.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={particleSpeed}
              onChange={(e) => updateParameter('particleSpeed', parseFloat(e.target.value))}
              className="w-full h-2 bg-[rgba(255,255,255,0.1)] rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>静止</span>
              <span>快速</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
