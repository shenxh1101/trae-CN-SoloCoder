import { useAtomStore } from '../../store/useAtomStore';
import { elements } from '../../data/elements';
import { Atom, Zap, Maximize2, Sun, Moon, RotateCw, Layers, Circle } from 'lucide-react';

export default function ControlPanel() {
  const {
    selectedElement,
    electronSpeed,
    orbitRadiusScale,
    orbitEccentricity,
    nucleusSize,
    backgroundType,
    showOrbitHighlight,
    autoRotate,
    setSelectedElement,
    setElectronSpeed,
    setOrbitRadiusScale,
    setOrbitEccentricity,
    setNucleusSize,
    setBackgroundType,
    setShowOrbitHighlight,
    setAutoRotate,
  } = useAtomStore();

  return (
    <div className="glass-panel rounded-xl p-5 w-80 text-white">
      <h2 className="text-xl font-orbitron font-bold mb-5 text-space-blue glow-text flex items-center gap-2">
        <Atom size={24} />
        控制面板
      </h2>

      <div className="mb-5">
        <label className="block text-sm font-medium mb-2 text-gray-300">
          选择元素
        </label>
        <select
          value={selectedElement}
          onChange={(e) => setSelectedElement(e.target.value)}
          className="select-custom w-full"
        >
          {Object.entries(elements).map(([key, element]) => (
            <option key={key} value={key}>
              {element.name} ({element.symbol}) - {element.atomicNumber}号
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-4 mb-5">
        <div>
          <label className="flex items-center gap-2 text-sm font-medium mb-2 text-gray-300">
            <Zap size={16} className="text-electron-yellow" />
            电子速度: {electronSpeed.toFixed(1)}x
          </label>
          <input
            type="range"
            min="0.1"
            max="3"
            step="0.1"
            value={electronSpeed}
            onChange={(e) => setElectronSpeed(parseFloat(e.target.value))}
            className="slider-track w-full"
          />
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium mb-2 text-gray-300">
            <Maximize2 size={16} className="text-space-blue" />
            轨道半径: {orbitRadiusScale.toFixed(1)}x
          </label>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={orbitRadiusScale}
            onChange={(e) => setOrbitRadiusScale(parseFloat(e.target.value))}
            className="slider-track w-full"
          />
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium mb-2 text-gray-300">
            <Circle size={16} className="text-electron-green" />
            椭圆度: {orbitEccentricity.toFixed(2)}
          </label>
          <input
            type="range"
            min="0"
            max="0.7"
            step="0.05"
            value={orbitEccentricity}
            onChange={(e) => setOrbitEccentricity(parseFloat(e.target.value))}
            className="slider-track w-full"
          />
          <p className="text-xs text-gray-500 mt-1">
            0=正圆, 0.7=高度椭圆
          </p>
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium mb-2 text-gray-300">
            <Atom size={16} className="text-electron-red" />
            原子核大小: {nucleusSize.toFixed(1)}x
          </label>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={nucleusSize}
            onChange={(e) => setNucleusSize(parseFloat(e.target.value))}
            className="slider-track w-full"
          />
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-300 mb-3 border-b border-gray-700 pb-2">
          显示设置
        </h3>

        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm text-gray-300">
            {backgroundType === 'space' ? <Sun size={16} /> : <Moon size={16} />}
            深空背景
          </span>
          <div
            className={`toggle-switch ${backgroundType === 'space' ? 'active' : ''}`}
            onClick={() => setBackgroundType(backgroundType === 'space' ? 'black' : 'space')}
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm text-gray-300">
            <Layers size={16} />
            轨道高亮
          </span>
          <div
            className={`toggle-switch ${showOrbitHighlight ? 'active' : ''}`}
            onClick={() => setShowOrbitHighlight(!showOrbitHighlight)}
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm text-gray-300">
            <RotateCw size={16} />
            自动旋转
          </span>
          <div
            className={`toggle-switch ${autoRotate ? 'active' : ''}`}
            onClick={() => setAutoRotate(!autoRotate)}
          />
        </div>
      </div>
    </div>
  );
}
