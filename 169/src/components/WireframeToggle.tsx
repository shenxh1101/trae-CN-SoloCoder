import { useFractalStore } from '@/store/fractalStore'

export default function WireframeToggle() {
  const wireframe = useFractalStore((s) => s.wireframe)
  const setWireframe = useFractalStore((s) => s.setWireframe)

  return (
    <div className="mb-5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-200 font-display">
          线框模式
        </label>
        <button
          onClick={() => setWireframe(!wireframe)}
          className={`relative w-12 h-6 rounded-full transition-all duration-200
            ${wireframe ? 'bg-cyber-cyan' : 'bg-gray-600'}`}
        >
          <span
            className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-200 shadow-lg
              ${wireframe ? 'left-7' : 'left-1'}`}
          />
        </button>
      </div>
      <p className="text-xs text-gray-500 mt-1">
        {wireframe ? '显示线框结构' : '显示实体材质'}
      </p>
    </div>
  )
}
