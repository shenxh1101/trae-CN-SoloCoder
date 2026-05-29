import { useFractalStore } from '@/store/fractalStore'

export default function CameraControls() {
  const autoOrbit = useFractalStore((s) => s.autoOrbit)
  const setAutoOrbit = useFractalStore((s) => s.setAutoOrbit)

  return (
    <div className="mb-5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-200 font-display">
          自动环绕
        </label>
        <button
          onClick={() => setAutoOrbit(!autoOrbit)}
          className={`relative w-12 h-6 rounded-full transition-all duration-200
            ${autoOrbit ? 'bg-cyber-pink' : 'bg-gray-600'}`}
        >
          <span
            className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-200 shadow-lg
              ${autoOrbit ? 'left-7' : 'left-1'}`}
          />
        </button>
      </div>
      <p className="text-xs text-gray-500 mt-1">
        {autoOrbit ? '相机自动旋转' : '可手动拖拽控制'}
      </p>
    </div>
  )
}
