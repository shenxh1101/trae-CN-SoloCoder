import { useEffect, useRef, useState } from 'react'
import { Mic, MicOff, Music } from 'lucide-react'
import { useKaleidoscopeStore } from '@/store/useKaleidoscopeStore'

export function AudioController() {
  const isMicConnected = useKaleidoscopeStore((state) => state.isMicConnected)
  const audioVisualization = useKaleidoscopeStore((state) => state.config.audioVisualization)
  const setMicConnected = useKaleidoscopeStore((state) => state.setMicConnected)
  const setAudioData = useKaleidoscopeStore((state) => state.setAudioData)
  const setAudioVisualization = useKaleidoscopeStore((state) => state.setAudioVisualization)

  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationRef = useRef<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const connectMic = async () => {
    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      analyserRef.current = audioContextRef.current.createAnalyser()
      analyserRef.current.fftSize = 64

      const source = audioContextRef.current.createMediaStreamSource(stream)
      source.connect(analyserRef.current)

      setMicConnected(true)
      setAudioVisualization(true)
    } catch (err) {
      setError('无法访问麦克风，请检查权限设置')
      console.error('Microphone access error:', err)
    }
  }

  const disconnectMic = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }
    if (audioContextRef.current) {
      audioContextRef.current.close()
    }
    setMicConnected(false)
    setAudioVisualization(false)
    setAudioData([])
  }

  useEffect(() => {
    if (!isMicConnected || !audioVisualization || !analyserRef.current) {
      return
    }

    const analyser = analyserRef.current
    const dataArray = new Uint8Array(analyser.frequencyBinCount)

    const updateAudioData = () => {
      analyser.getByteFrequencyData(dataArray)
      const normalizedData = Array.from(dataArray).map((v) => v / 255)
      setAudioData(normalizedData)
      animationRef.current = requestAnimationFrame(updateAudioData)
    }

    updateAudioData()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isMicConnected, audioVisualization, setAudioData])

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])

  return (
    <div className="fixed bottom-4 left-4 z-20 flex flex-col gap-2">
      <div className="flex items-center gap-2 p-3 bg-black/60 backdrop-blur-md border border-white/10 rounded-xl">
        <button
          onClick={isMicConnected ? disconnectMic : connectMic}
          className={`p-2 rounded-lg transition-all duration-200 ${
            isMicConnected
              ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
              : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
          }`}
          title={isMicConnected ? '断开麦克风' : '连接麦克风'}
        >
          {isMicConnected ? <Mic size={18} /> : <MicOff size={18} />}
        </button>

        {isMicConnected && (
          <button
            onClick={() => setAudioVisualization(!audioVisualization)}
            className={`p-2 rounded-lg transition-all duration-200 ${
              audioVisualization
                ? 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
            title="音乐可视化"
          >
            <Music size={18} />
          </button>
        )}
      </div>

      {isMicConnected && audioVisualization && (
        <div className="flex items-end gap-1 px-3 py-2 bg-black/60 backdrop-blur-md border border-white/10 rounded-xl h-12">
          {Array.from({ length: 16 }).map((_, i) => (
            <div
              key={i}
              className="w-1.5 bg-gradient-to-t from-cyan-500 to-fuchsia-500 rounded-full transition-all duration-75"
              style={{
                height: `${Math.max(4, Math.random() * 28)}px`
              }}
            />
          ))}
        </div>
      )}

      {error && (
        <div className="px-3 py-2 bg-red-500/20 border border-red-500/30 rounded-xl text-xs text-red-400 max-w-[200px]">
          {error}
        </div>
      )}
    </div>
  )
}
