import { useFractalStore } from '@/store/fractalStore'
import type { BackgroundMode } from '@/types'

const backgrounds: { value: BackgroundMode; label: string; color: string }[] = [
  { value: 'black', label: '纯黑', color: 'bg-black' },
  { value: 'darkBlue', label: '深蓝', color: 'bg-blue-950' },
  { value: 'gradient', label: '渐变', color: 'bg-gradient-to-r from-purple-950 via-blue-950 to-pink-950' },
]

export default function BackgroundSelector() {
  const backgroundMode = useFractalStore((s) => s.backgroundMode)
  const setBackgroundMode = useFractalStore((s) => s.setBackgroundMode)

  return (
    <div className="mb-5">
      <label className="block text-sm font-medium text-gray-200 font-display mb-2">
        背景风格
      </label>
      <div className="flex gap-2">
        {backgrounds.map((bg) => (
          <button
            key={bg.value}
            onClick={() => setBackgroundMode(bg.value)}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all duration-200 border-2
              ${backgroundMode === bg.value
                ? 'border-cyber-pink shadow-lg shadow-cyber-pink/20'
                : 'border-transparent hover:border-gray-600'
              }`}
          >
            <div className={`w-full h-6 rounded ${bg.color} mb-1`} />
            <span className="text-gray-300">{bg.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
