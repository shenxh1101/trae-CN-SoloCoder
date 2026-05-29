let audioContext: AudioContext | null = null

const getAudioContext = (): AudioContext => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
  return audioContext
}

export const playJumpSound = (enabled: boolean, power: number = 0.5) => {
  if (!enabled) return
  try {
    const ctx = getAudioContext()
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.frequency.setValueAtTime(300 + power * 300, ctx.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(600 + power * 400, ctx.currentTime + 0.1)

    gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.2)
  } catch (e) {
    console.log('Audio not supported')
  }
}

export const playStarSound = (enabled: boolean) => {
  if (!enabled) return
  try {
    const ctx = getAudioContext()
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(800, ctx.currentTime)
    oscillator.frequency.setValueAtTime(1000, ctx.currentTime + 0.1)
    oscillator.frequency.setValueAtTime(1200, ctx.currentTime + 0.2)

    gainNode.gain.setValueAtTime(0.2, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.4)
  } catch (e) {
    console.log('Audio not supported')
  }
}

export const playTargetSound = (enabled: boolean) => {
  if (!enabled) return
  try {
    const ctx = getAudioContext()
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.type = 'triangle'
    oscillator.frequency.setValueAtTime(523, ctx.currentTime)
    oscillator.frequency.setValueAtTime(659, ctx.currentTime + 0.1)
    oscillator.frequency.setValueAtTime(784, ctx.currentTime + 0.2)

    gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.5)
  } catch (e) {
    console.log('Audio not supported')
  }
}

export const playWinSound = (enabled: boolean) => {
  if (!enabled) return
  try {
    const ctx = getAudioContext()
    const notes = [523, 659, 784, 1047]

    notes.forEach((freq, i) => {
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)

      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.15)

      gainNode.gain.setValueAtTime(0, ctx.currentTime + i * 0.15)
      gainNode.gain.linearRampToValueAtTime(0.2, ctx.currentTime + i * 0.15 + 0.05)
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.15 + 0.4)

      oscillator.start(ctx.currentTime + i * 0.15)
      oscillator.stop(ctx.currentTime + i * 0.15 + 0.4)
    })
  } catch (e) {
    console.log('Audio not supported')
  }
}

export const playFallSound = (enabled: boolean) => {
  if (!enabled) return
  try {
    const ctx = getAudioContext()
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.type = 'sawtooth'
    oscillator.frequency.setValueAtTime(400, ctx.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.5)

    gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.5)
  } catch (e) {
    console.log('Audio not supported')
  }
}
