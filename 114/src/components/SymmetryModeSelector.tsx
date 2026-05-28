import { useKaleidoscopeStore, type SymmetryMode, SYMMETRY_LABELS } from '@/store/useKaleidoscopeStore'
import { Triangle, Square, Hexagon, Octagon } from 'lucide-react'

const modes: { value: SymmetryMode; icon: typeof Triangle; label: string }[] = [
  { value: 'triangle', icon: Triangle, label: SYMMETRY_LABELS.triangle },
  { value: 'square', icon: Square, label: SYMMETRY_LABELS.square },
  { value: 'hexagon', icon: Hexagon, label: SYMMETRY_LABELS.hexagon },
  { value: 'octagon', icon: Octagon, label: SYMMETRY_LABELS.octagon }
]

export function SymmetryModeSelector() {
  const currentMode = useKaleidoscopeStore((state) => state.config.symmetryMode)
  const setSymmetryMode = useKaleidoscopeStore((state) => state.setSymmetryMode)

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-cyan-300 uppercase tracking-wider">
        对称模式
      </label>
      <div className="grid grid-cols-2 gap-2">
        {modes.map(({ value, icon: Icon, label }) => (
          <button
            key={value}
            onClick={() => setSymmetryMode(value)}
            className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-all duration-200 ${
              currentMode === value
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-lg shadow-cyan-500/20'
                : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:border-white/20'
            }`}
          >
            <Icon size={24} />
            <span className="text-xs">{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
