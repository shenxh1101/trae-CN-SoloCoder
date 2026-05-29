import { Timer, Target, Star, Zap, Volume2, VolumeX, RotateCcw, Pause, Play } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { defaultLevels } from '@/data/levels'
import { formatTime } from '@/utils/physics'

export default function HUD() {
  const {
    currentLevel,
    customLevels,
    currentTime,
    jumpCount,
    bestTimes,
    bestJumps,
    soundEnabled,
    isPlaying,
    isPaused,
    toggleSound,
    resetLevel,
    pauseGame,
    resumeGame,
    isCharging,
    chargePower,
  } = useStore()

  const allLevels = [...defaultLevels, ...customLevels]
  const level = allLevels[currentLevel]
  const remainingTargets = level?.targets.filter((t) => !t.reached).length || 0
  const totalTargets = level?.targets.length || 0
  const collectedStars = level?.stars.filter((s) => s.collected).length || 0
  const totalStars = level?.stars.length || 0

  const bestTime = bestTimes[currentLevel]
  const bestJump = bestJumps[currentLevel]

  return (
    <div className="fixed top-0 left-0 right-0 z-10 p-4 pointer-events-none">
      <div className="flex justify-between items-start gap-4">
        <div className="glass-panel p-4 pointer-events-auto neon-border">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-game-primary font-bold text-lg">
              关卡 {currentLevel + 1}/{allLevels.length}
            </span>
            <span className="text-gray-400 text-sm">- {level?.name}</span>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4 text-game-accent" />
              <span className="text-white font-mono">{formatTime(currentTime)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-game-secondary" />
              <span className="text-white">{jumpCount} 次跳跃</span>
            </div>
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-game-secondary" />
              <span className="text-white">
                剩余目标: <span className="text-game-secondary font-bold">{remainingTargets}</span>/{totalTargets}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-game-accent" />
              <span className="text-white">
                星星: <span className="text-game-accent font-bold">{collectedStars}</span>/{totalStars}
              </span>
            </div>
          </div>

          {(bestTime || bestJump) && (
            <div className="mt-3 pt-3 border-t border-gray-700 text-xs text-gray-400">
              <div>最佳时间: {bestTime ? formatTime(bestTime) : '--:--.--'}</div>
              <div>最少跳跃: {bestJump || '--'} 次</div>
            </div>
          )}
        </div>

        <div className="glass-panel p-3 pointer-events-auto neon-border">
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

      {isCharging && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="glass-panel p-4 neon-border text-center">
            <div className="text-game-primary font-bold mb-2">蓄力中...</div>
            <div className="w-48 h-3 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-75"
                style={{
                  width: `${chargePower * 100}%`,
                  backgroundColor: `hsl(${120 - chargePower * 120}, 100%, 50%)`,
                  boxShadow: `0 0 10px hsl(${120 - chargePower * 120}, 100%, 50%)`,
                }}
              />
            </div>
            <div className="text-sm text-gray-400 mt-1">
              力度: {Math.round(chargePower * 100)}%
            </div>
          </div>
        </div>
      )}

      {isPaused && isPlaying && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-20 pointer-events-auto">
          <div className="glass-panel p-8 text-center neon-border fade-in">
            <h2 className="text-3xl font-bold text-game-primary mb-4 neon-text">游戏暂停</h2>
            <button onClick={resumeGame} className="btn-game text-lg px-8 py-3">
              继续游戏
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
