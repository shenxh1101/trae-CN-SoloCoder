import { useKaleidoscopeStore, SYMMETRY_LABELS } from '@/store/useKaleidoscopeStore'
import { Info } from 'lucide-react'

export function StatusBar() {
  const config = useKaleidoscopeStore((state) => state.config)
  const hue = useKaleidoscopeStore((state) => state.hue)

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-4 px-4 py-2 bg-black/60 backdrop-blur-md border border-white/10 rounded-xl">
      <div className="flex items-center gap-2">
        <Info size={14} className="text-cyan-400" />
        <span className="text-xs text-gray-400">对称模式:</span>
        <span className="text-xs font-medium text-cyan-300">
          {SYMMETRY_LABELS[config.symmetryMode]}
        </span>
      </div>

      <div className="w-px h-4 bg-white/10" />

      <div className="flex items-center gap-2">
        <div
          className="w-4 h-4 rounded-full border border-white/20"
          style={{ backgroundColor: `hsl(${hue}, 80%, 50%)` }}
        />
        <span className="text-xs text-gray-400">色相:</span>
        <span className="text-xs font-medium font-mono text-fuchsia-300">
          {Math.round(hue)}°
        </span>
      </div>

      <div className="w-px h-4 bg-white/10" />

      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400">复杂度:</span>
        <span className="text-xs font-medium text-yellow-300">
          {config.complexity}
        </span>
      </div>

      {config.mirrorEffect && (
        <>
          <div className="w-px h-4 bg-white/10" />
          <span className="text-xs text-fuchsia-400">● 镜面</span>
        </>
      )}

      {config.particleMode && (
        <>
          <div className="w-px h-4 bg-white/10" />
          <span className="text-xs text-cyan-400">● 粒子</span>
        </>
      )}
    </div>
  )
}
