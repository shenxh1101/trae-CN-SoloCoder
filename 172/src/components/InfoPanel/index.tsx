import { useAtomStore } from '../../store/useAtomStore';
import { Info, Atom } from 'lucide-react';

export default function InfoPanel() {
  const { getCurrentElement, selectedOrbitIndex } = useAtomStore();
  const element = getCurrentElement();

  return (
    <div className="glass-panel rounded-xl p-5 w-72 text-white">
      <h2 className="text-xl font-orbitron font-bold mb-4 text-space-blue glow-text flex items-center gap-2">
        <Info size={24} />
        原子信息
      </h2>

      <div className="space-y-3">
        <div className="flex items-center justify-between py-2 border-b border-gray-700">
          <span className="text-gray-400">元素名称</span>
          <span className="font-semibold" style={{ color: element.nucleusColor }}>
            {element.name} ({element.symbol})
          </span>
        </div>

        <div className="flex items-center justify-between py-2 border-b border-gray-700">
          <span className="text-gray-400">原子序数</span>
          <span className="font-semibold text-space-blue">
            {element.atomicNumber}
          </span>
        </div>

        <div className="flex items-center justify-between py-2 border-b border-gray-700">
          <span className="text-gray-400">原子量</span>
          <span className="font-semibold text-space-blue">
            {element.atomicMass} u
          </span>
        </div>

        <div className="py-2 border-b border-gray-700">
          <span className="text-gray-400 block mb-2">电子排布式</span>
          <span className="font-mono text-sm text-electron-yellow bg-black/30 px-3 py-1 rounded block">
            {element.electronConfiguration}
          </span>
        </div>

        <div className="py-2">
          <span className="text-gray-400 block mb-2">电子轨道</span>
          <div className="space-y-2">
            {element.orbits.map((orbit, index) => (
              <div
                key={index}
                className={`flex items-center justify-between text-sm px-3 py-2 rounded transition-all ${
                  selectedOrbitIndex === index
                    ? 'bg-space-blue/30 border border-space-blue/50'
                    : 'bg-black/20'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: orbit.electronColor }}
                  />
                  轨道 {index + 1}
                </span>
                <span className="text-gray-300">
                  {orbit.electronCount} 电子
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedOrbitIndex !== null && (
        <div className="mt-4 p-3 bg-space-blue/20 rounded-lg border border-space-blue/40">
          <p className="text-sm text-space-blue flex items-center gap-2">
            <Atom size={16} />
            已选中轨道 {selectedOrbitIndex + 1}
          </p>
        </div>
      )}
    </div>
  );
}
