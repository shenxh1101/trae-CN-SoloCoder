import { useEffect, useRef, useCallback } from 'react'
import { useTreeStore } from '@/store'

export default function BreathButton() {
  const breathMode = useTreeStore((s) => s.breathMode)
  const setBreathValue = useTreeStore((s) => s.setBreathValue)
  const rafRef = useRef<number>(0)
  const pressingRef = useRef(false)

  const animate = useCallback(() => {
    if (pressingRef.current) {
      setBreathValue(useTreeStore.getState().breathValue + 0.03)
    } else {
      setBreathValue(useTreeStore.getState().breathValue - 0.03)
    }
    rafRef.current = requestAnimationFrame(animate)
  }, [setBreathValue])

  const handleStart = useCallback(() => {
    pressingRef.current = true
  }, [])

  const handleEnd = useCallback(() => {
    pressingRef.current = false
  }, [])

  useEffect(() => {
    if (breathMode === 'manual') {
      rafRef.current = requestAnimationFrame(animate)
      return () => cancelAnimationFrame(rafRef.current)
    }
  }, [breathMode, animate])

  if (breathMode !== 'manual') return null

  return (
    <div
      className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 select-none"
    >
      <button
        onMouseDown={handleStart}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleStart}
        onTouchEnd={handleEnd}
        className="
          w-[100px] h-[100px] rounded-full
          bg-black/30 backdrop-blur-xl
          border border-white/20
          text-white text-lg font-medium
          active:scale-110
          transition-transform duration-150
          shadow-[0_0_30px_rgba(255,255,255,0.15)]
          active:shadow-[0_0_50px_rgba(255,255,255,0.3)]
          cursor-pointer
          flex items-center justify-center
        "
      >
        呼吸
      </button>
    </div>
  )
}
