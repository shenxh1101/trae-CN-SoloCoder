import { useParticleStore } from '@/store/useParticleStore'
import { Activity, Layers } from 'lucide-react'

export default function StatusBar() {
  const particleCount = useParticleStore((s) => s.particleCount)
  const fps = useParticleStore((s) => s.fps)

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 px-4 py-2
      bg-zinc-950/70 backdrop-blur-xl border border-zinc-800/40 rounded-full">
      <div className="flex items-center gap-1.5 text-xs">
        <Layers size={12} className="text-violet-400" />
        <span className="text-zinc-500">粒子</span>
        <span className="text-violet-300 font-mono font-semibold">
          {particleCount.toLocaleString()}
        </span>
      </div>
      <div className="w-px h-3 bg-zinc-700/50" />
      <div className="flex items-center gap-1.5 text-xs">
        <Activity size={12} className={fps >= 50 ? 'text-emerald-400' : fps >= 30 ? 'text-amber-400' : 'text-rose-400'} />
        <span className="text-zinc-500">FPS</span>
        <span className={`font-mono font-semibold ${fps >= 50 ? 'text-emerald-300' : fps >= 30 ? 'text-amber-300' : 'text-rose-300'}`}>
          {fps}
        </span>
      </div>
    </div>
  )
}
