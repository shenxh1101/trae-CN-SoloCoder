import { useEffect, useRef, useCallback } from 'react'
import { useCrystalBallStore } from '@/store/crystalBallStore'

export function useAmbientSound() {
  const isMuted = useCrystalBallStore((s) => s.isMuted)
  const audioContextRef = useRef<AudioContext | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)
  const oscillatorsRef = useRef<OscillatorNode[]>([])
  const initializedRef = useRef(false)

  const initAudio = useCallback(async () => {
    if (initializedRef.current) {
      if (audioContextRef.current?.state === 'suspended') {
        await audioContextRef.current.resume()
      }
      return
    }

    const ctx = new AudioContext()

    if (ctx.state === 'suspended') {
      await ctx.resume()
    }

    const gain = ctx.createGain()
    gain.gain.value = 0
    gain.connect(ctx.destination)

    const freqs = [110, 164.81, 220, 329.63, 440]
    const oscs: OscillatorNode[] = []

    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const oscGain = ctx.createGain()

      osc.type = i % 2 === 0 ? 'sine' : 'triangle'
      osc.frequency.value = freq
      oscGain.gain.value = 0.04 / (i + 1)

      const lfo = ctx.createOscillator()
      const lfoGain = ctx.createGain()
      lfo.frequency.value = 0.1 + Math.random() * 0.2
      lfoGain.gain.value = freq * 0.003
      lfo.connect(lfoGain)
      lfoGain.connect(osc.frequency)
      lfo.start()

      osc.connect(oscGain)
      oscGain.connect(gain)
      osc.start()
      oscs.push(osc)
    })

    audioContextRef.current = ctx
    gainNodeRef.current = gain
    oscillatorsRef.current = oscs
    initializedRef.current = true

    const state = useCrystalBallStore.getState()
    if (!state.isMuted) {
      const now = ctx.currentTime
      gain.gain.linearRampToValueAtTime(0.15, now + 0.5)
    }
  }, [])

  useEffect(() => {
    if (!initializedRef.current) return

    const gain = gainNodeRef.current
    if (!gain) return

    const now = audioContextRef.current!.currentTime
    if (isMuted) {
      gain.gain.linearRampToValueAtTime(0, now + 0.5)
    } else {
      gain.gain.linearRampToValueAtTime(0.15, now + 0.5)
    }
  }, [isMuted])

  useEffect(() => {
    return () => {
      oscillatorsRef.current.forEach((osc) => {
        try { osc.stop() } catch {}
      })
      audioContextRef.current?.close()
    }
  }, [])

  return { initAudio }
}
