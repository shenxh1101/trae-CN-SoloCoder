import { useFractalStore } from '@/store/fractalStore'
import type { ColorMode } from '@/types'

const colorModes: { value: ColorMode; label: string; desc: string }[] = [
  { value: 'gradient', label: '深度渐变', desc: '随深度变化' },
  { value: 'random', label: '随机鲜艳', desc: '随机彩虹色' },
  { value: 'monochrome', label: '单色系', desc: '青蓝色调' },
]

export default function ColorModeSelector() {
  const colorMode = useFractalStore((s) => s.colorMode)
  const setColorMode = useFractalStore((s) => s.setColorMode)

  return (
    <div className="mb-5">
      <label className="block text-sm font-medium text-gray-200 font-display mb-2">
        颜色模式
      </label>
      <div className="space-y-1">
        {colorModes.map((mode) => (
          <button
            key={mode.value}
            onClick={() => setColorMode(mode.value)}
            className={`w-full py-2 px-3 rounded-lg text-left transition-all duration-200 flex justify-between items-center
              ${colorMode === mode.value
                ? 'bg-cyber-pink/20 border border-cyber-pink/50 text-white'
                : 'bg-gray-700/30 border border-transparent text-gray-400 hover:bg-gray-700/50'
              }`}
          >
            <span className="text-sm font-medium">{mode.label}</span>
            <span className="text-xs opacity-70">{mode.desc}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
