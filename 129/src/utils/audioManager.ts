let audioCtx: AudioContext | null = null
let masterGain: GainNode | null = null
let musicOscillators: OscillatorNode[] = []
let musicGains: GainNode[] = []
let musicPlaying = false

function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new AudioContext()
    masterGain = audioCtx.createGain()
    masterGain.gain.value = 0.3
    masterGain.connect(audioCtx.destination)
  }
  return { ctx: audioCtx, master: masterGain! }
}

function startSynthMusic() {
  const { ctx, master } = getAudioCtx()
  if (ctx.state === 'suspended') ctx.resume()

  const chords = [
    [110, 138.59, 164.81, 220],
    [130.81, 164.81, 196, 261.63],
    [146.83, 174.61, 220, 293.66],
    [123.47, 155.56, 185, 246.94],
  ]

  const chordGains: GainNode[] = []

  chords[0].forEach((freq, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    gain.gain.value = 0.04 / (i + 1)

    const lfo = ctx.createOscillator()
    const lfoGain = ctx.createGain()
    lfo.type = 'sine'
    lfo.frequency.value = 0.05 + i * 0.02
    lfoGain.gain.value = 1.5
    lfo.connect(lfoGain)
    lfoGain.connect(osc.frequency)
    lfo.start()

    const volLfo = ctx.createOscillator()
    const volLfoGain = ctx.createGain()
    volLfo.type = 'sine'
    volLfo.frequency.value = 0.03 + i * 0.01
    volLfoGain.gain.value = 0.015
    volLfo.connect(volLfoGain)
    volLfoGain.connect(gain.gain)
    volLfo.start()

    osc.connect(gain)
    gain.connect(master)
    osc.start()

    musicOscillators.push(osc, lfo, volLfo)
    musicGains.push(gain, lfoGain, volLfoGain)
    chordGains.push(gain)
  })

  let chordIndex = 0
  const chordInterval = setInterval(() => {
    if (!musicPlaying) {
      clearInterval(chordInterval)
      return
    }
    chordIndex = (chordIndex + 1) % chords.length
    const chord = chords[chordIndex]
    chordGains.forEach((gain, i) => {
      if (i < chord.length && musicOscillators[i * 3]) {
        musicOscillators[i * 3].frequency.linearRampToValueAtTime(
          chord[i],
          audioCtx!.currentTime + 4
        )
      }
    })
  }, 8000)

  const padOsc = ctx.createOscillator()
  const padGain = ctx.createGain()
  padOsc.type = 'triangle'
  padOsc.frequency.value = 55
  padGain.gain.value = 0.03
  padOsc.connect(padGain)
  padGain.connect(master)
  padOsc.start()
  musicOscillators.push(padOsc)
  musicGains.push(padGain)
}

export function startBackgroundMusic() {
  if (musicPlaying) return
  musicPlaying = true
  startSynthMusic()
}

export function stopBackgroundMusic() {
  if (!musicPlaying) return
  musicPlaying = false

  musicOscillators.forEach((osc) => {
    try { osc.stop() } catch (_e) { /* ignored */ }
  })
  musicOscillators = []
  musicGains = []
}

export function playMeteorSound(isFireball: boolean) {
  const { ctx, master } = getAudioCtx()
  if (ctx.state === 'suspended') ctx.resume()

  const duration = isFireball ? 0.8 : 0.4
  const bufferSize = Math.floor(ctx.sampleRate * duration)
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)

  for (let i = 0; i < bufferSize; i++) {
    const t = i / ctx.sampleRate
    const envelope = Math.exp(-t * (isFireball ? 3 : 6))
    const whistle = Math.sin(2 * Math.PI * (isFireball ? 800 : 1500) * t * (1 - t * 0.5))
    data[i] = ((Math.random() * 2 - 1) * 0.7 + whistle * 0.3) * envelope * 0.12
  }

  const source = ctx.createBufferSource()
  source.buffer = buffer

  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = isFireball ? 600 : 1200
  filter.Q.value = 0.5

  const gain = ctx.createGain()
  gain.gain.value = isFireball ? 0.25 : 0.1

  source.connect(filter)
  filter.connect(gain)
  gain.connect(master)
  source.start()
}
