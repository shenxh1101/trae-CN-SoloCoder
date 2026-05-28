import { useKaleidoscopeStore, type BackgroundMode, BACKGROUND_LABELS } from '@/store/useKaleidoscopeStore'
import { Moon, Sun, Rainbow } from 'lucide-react'

const backgrounds: { value: BackgroundMode; icon: typeof Moon; label: string; color: string }[] = [
  { value: 'black', icon: Moon, label: BACKGROUND_LABELS.black, color: 'bg-gray-900' },
  { value: 'white', icon: Sun, label: BACKGROUND_LABELS.white, color: 'bg-gray-100' },
  { value: 'rainbow', icon: Rainbow, label: BACKGROUND_LABELS.rainbow, color: 'bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500' }
]

export function BackgroundSelector() {
  const currentMode = useKaleidoscopeStore((state) => state.config.backgroundMode)
  const setBackgroundMode = useKaleidoscopeStore((state) => state.setBackgroundMode)

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-yellow-300 uppercase tracking-wider">
        背景样式
      </label>
      <div className="flex gap-2">
        {backgrounds.map(({ value, icon: Icon, label, color }) => (
          <button
            key={value}
            onClick={() => setBackgroundMode(value)}
            className={`flex-1 flex flex-col items-center gap-1 p-2 rounded-lg border transition-all duration-200 ${
              currentMode === value
                ? 'bg-yellow-500/20 border-yellow-400 text-yellow-300 shadow-lg shadow-yellow-500/20'
                : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:border-white/20'
            }`}
            title={label}
          >
            <div className={`w-6 h-6 rounded-full ${color} border border-white/20`} />
            <Icon size={14} />
          </button>
        ))}
      </div>
    </div>
  )
}
