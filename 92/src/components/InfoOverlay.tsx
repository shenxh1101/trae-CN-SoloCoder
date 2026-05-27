import { useEffect, useState, useRef } from 'react'
import { useParticleStore } from '@/store/useParticleStore'

export default function InfoOverlay() {
  const particleCount = useParticleStore((s) => s.particleCount)
  const [fps, setFps] = useState(0)
  const framesRef = useRef(0)
  const lastTimeRef = useRef(performance.now())

  useEffect(() => {
    let rafId: number
    const tick = () => {
      framesRef.current++
      const now = performance.now()
      if (now - lastTimeRef.current >= 1000) {
        setFps(framesRef.current)
        framesRef.current = 0
        lastTimeRef.current = now
      }
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [])

  return (
    <div className="absolute top-5 left-5 z-10 select-none">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(0,255,255,0.6)] animate-pulse" />
          <span className="text-[10px] font-orbitron text-cyan-400/70 tracking-[0.2em]">FPS</span>
          <span className="text-[13px] font-orbitron font-bold text-cyan-300">{fps}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_6px_rgba(100,100,255,0.6)] animate-pulse" />
          <span className="text-[10px] font-orbitron text-blue-400/70 tracking-[0.2em]">PARTICLES</span>
          <span className="text-[13px] font-orbitron font-bold text-blue-300">{particleCount.toLocaleString()}</span>
        </div>
      </div>
    </div>
  )
}
