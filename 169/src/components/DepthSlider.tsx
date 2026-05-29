import { useFractalStore } from '@/store/fractalStore'

export default function DepthSlider() {
  const depth = useFractalStore((s) => s.depth)
  const setDepth = useFractalStore((s) => s.setDepth)

  return (
    <div className="mb-5">
      <div className="flex justify-between items-center mb-2">
        <label className="text-sm font-medium text-gray-200 font-display">
          分形深度
        </label>
        <span className="text-sm font-bold text-cyber-cyan font-display">
          {depth} 级
        </span>
      </div>
      <input
        type="range"
        min="1"
        max="5"
        value={depth}
        onChange={(e) => setDepth(Number(e.target.value))}
        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyber-pink"
      />
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>简单</span>
        <span>复杂</span>
      </div>
    </div>
  )
}
