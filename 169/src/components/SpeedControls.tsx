import { useFractalStore } from '@/store/fractalStore'

export default function SpeedControls() {
  const rotationSpeed = useFractalStore((s) => s.rotationSpeed)
  const scaleSpeed = useFractalStore((s) => s.scaleSpeed)
  const setRotationSpeed = useFractalStore((s) => s.setRotationSpeed)
  const setScaleSpeed = useFractalStore((s) => s.setScaleSpeed)

  return (
    <div className="mb-5">
      <label className="block text-sm font-medium text-gray-200 font-display mb-3">
        动画速度
      </label>

      <div className="space-y-3">
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-gray-400">旋转</span>
            <span className="text-xs text-cyber-cyan font-mono">
              {rotationSpeed.toFixed(1)}x
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={rotationSpeed}
            onChange={(e) => setRotationSpeed(Number(e.target.value))}
            className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyber-cyan"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-gray-400">缩放</span>
            <span className="text-xs text-cyber-amber font-mono">
              {scaleSpeed.toFixed(1)}x
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={scaleSpeed}
            onChange={(e) => setScaleSpeed(Number(e.target.value))}
            className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyber-amber"
          />
        </div>
      </div>
    </div>
  )
}
