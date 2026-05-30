import { useEffect, useRef } from 'react'

export function useAudio(enabled: boolean) {
  const audioContextRef = useRef<AudioContext | null>(null)
  const oscillatorsRef = useRef<OscillatorNode[]>([])
  const gainNodesRef = useRef<GainNode[]>([])

  useEffect(() => {
    if (enabled) {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      }

      const ctx = audioContextRef.current
      
      if (ctx.state === 'suspended') {
        ctx.resume()
      }

      const frequencies = [55, 65.41, 82.41]
      const types: OscillatorType[] = ['sine', 'triangle', 'sawtooth']
      
      frequencies.forEach((freq, index) => {
        const oscillator = ctx.createOscillator()
        const gainNode = ctx.createGain()
        
        oscillator.type = types[index]
        oscillator.frequency.setValueAtTime(freq, ctx.currentTime)
        
        const lfo = ctx.createOscillator()
        const lfoGain = ctx.createGain()
        lfo.type = 'sine'
        lfo.frequency.setValueAtTime(0.3 + index * 0.1, ctx.currentTime)
        lfoGain.gain.setValueAtTime(2 + index, ctx.currentTime)
        
        lfo.connect(lfoGain)
        lfoGain.connect(oscillator.frequency)
        lfo.start()

        gainNode.gain.setValueAtTime(0.08 / (index + 1), ctx.currentTime)
        
        oscillator.connect(gainNode)
        gainNode.connect(ctx.destination)
        oscillator.start()

        oscillatorsRef.current.push(oscillator)
        gainNodesRef.current.push(gainNode)
      })

      const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
      const noiseData = noiseBuffer.getChannelData(0)
      for (let i = 0; i < noiseData.length; i++) {
        noiseData[i] = (Math.random() * 2 - 1) * 0.5
      }
      
      const noiseSource = ctx.createBufferSource()
      noiseSource.buffer = noiseBuffer
      noiseSource.loop = true
      
      const noiseFilter = ctx.createBiquadFilter()
      noiseFilter.type = 'lowpass'
      noiseFilter.frequency.setValueAtTime(150, ctx.currentTime)
      
      const noiseGain = ctx.createGain()
      noiseGain.gain.setValueAtTime(0.03, ctx.currentTime)
      
      noiseSource.connect(noiseFilter)
      noiseFilter.connect(noiseGain)
      noiseGain.connect(ctx.destination)
      noiseSource.start()

      oscillatorsRef.current.push(noiseSource as unknown as OscillatorNode)
      gainNodesRef.current.push(noiseGain)

      return () => {
        oscillatorsRef.current.forEach(osc => {
          try { osc.stop() } catch(e) {}
          osc.disconnect()
        })
        gainNodesRef.current.forEach(gain => gain.disconnect())
        oscillatorsRef.current = []
        gainNodesRef.current = []
      }
    } else {
      oscillatorsRef.current.forEach(osc => {
        try { osc.stop() } catch(e) {}
        osc.disconnect()
      })
      gainNodesRef.current.forEach(gain => gain.disconnect())
      oscillatorsRef.current = []
      gainNodesRef.current = []
    }
  }, [enabled])

  const playExplosionSound = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }

    const ctx = audioContextRef.current
    
    const osc1 = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    const gainNode = ctx.createGain()
    const filter = ctx.createBiquadFilter()

    osc1.type = 'sawtooth'
    osc1.frequency.setValueAtTime(150, ctx.currentTime)
    osc1.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.5)

    osc2.type = 'square'
    osc2.frequency.setValueAtTime(100, ctx.currentTime)
    osc2.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + 0.4)

    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(2000, ctx.currentTime)
    filter.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.5)

    gainNode.gain.setValueAtTime(0.4, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)

    osc1.connect(filter)
    osc2.connect(filter)
    filter.connect(gainNode)
    gainNode.connect(ctx.destination)

    osc1.start()
    osc2.start()
    osc1.stop(ctx.currentTime + 0.5)
    osc2.stop(ctx.currentTime + 0.5)
  }

  return { playExplosionSound }
}
