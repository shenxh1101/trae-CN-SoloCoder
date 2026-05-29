import { Settings, Volume2, VolumeX, RotateCcw, Pause, Play } from 'lucide-react'
import { useStore } from '@/store/useStore'

export default function ControlPanel() {
  const {
    soundEnabled,
    toggleSound,
    resetLevel,
    isPlaying,
    isPaused,
    pauseGame,
    resumeGame,
  } = useStore()

  return (
    <div className="fixed top-4 right-4 z-10">
      <div className="glass-panel p-3 neon-border">
        <div className="flex gap-2">
          <button
            onClick={toggleSound}
            className="btn-game !p-2"
            title={soundEnabled ? '关闭音效' : '开启音效'}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
          <button
            onClick={resetLevel}
            className="btn-game !p-2"
            title="重置关卡"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
          {isPlaying && (
            <button
              onClick={isPaused ? resumeGame : pauseGame}
              className="btn-game !p-2"
              title={isPaused ? '继续' : '暂停'}
            >
              {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
