import { Trophy, Star, Clock, Zap, ArrowRight, Home } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { defaultLevels } from '@/data/levels'
import { formatTime } from '@/utils/physics'

export default function LevelCompleteScreen() {
  const {
    currentLevel,
    customLevels,
    currentTime,
    jumpCount,
    bestTimes,
    bestJumps,
    nextLevel,
    setIsPlaying,
    setIsLevelComplete,
    resetLevel,
  } = useStore()

  const allLevels = [...defaultLevels, ...customLevels]
  const hasNextLevel = currentLevel < allLevels.length - 1
  const level = allLevels[currentLevel]

  const collectedStars = level?.stars.filter((s) => s.collected).length || 0
  const totalStars = level?.stars.length || 0
  const starBonus = collectedStars === totalStars && totalStars > 0 ? 500 : collectedStars * 100

  const isNewBestTime = bestTimes[currentLevel] === currentTime
  const isNewBestJump = bestJumps[currentLevel] === jumpCount

  const handleNextLevel = () => {
    if (hasNextLevel) {
      nextLevel()
    } else {
      setIsLevelComplete(false)
      setIsPlaying(false)
    }
  }

  const handleMainMenu = () => {
    setIsLevelComplete(false)
    setIsPlaying(false)
  }

  const handleReplay = () => {
    resetLevel()
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-30">
      <div className="glass-panel p-8 text-center neon-border fade-in max-w-lg">
        <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-game-accent/20 flex items-center justify-center">
          <Trophy className="w-14 h-14 text-game-accent" />
        </div>

        <h2 className="text-4xl font-bold text-game-primary mb-2 neon-text">
          关卡完成！
        </h2>
        <p className="text-gray-400 mb-6">恭喜你完成了 {level?.name}</p>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-black/30 p-4 rounded-lg">
            <div className="flex items-center justify-center gap-2 text-game-accent mb-1">
              <Clock className="w-5 h-5" />
              <span className="text-gray-400">用时</span>
            </div>
            <div className="text-2xl font-bold text-white font-mono">
              {formatTime(currentTime)}
            </div>
            {isNewBestTime && (
              <div className="text-xs text-game-accent mt-1 animate-pulse">🎉 新纪录！</div>
            )}
          </div>
          <div className="bg-black/30 p-4 rounded-lg">
            <div className="flex items-center justify-center gap-2 text-game-secondary mb-1">
              <Zap className="w-5 h-5" />
              <span className="text-gray-400">跳跃次数</span>
            </div>
            <div className="text-2xl font-bold text-white">{jumpCount}</div>
            {isNewBestJump && (
              <div className="text-xs text-game-accent mt-1 animate-pulse">🎉 新纪录！</div>
            )}
          </div>
        </div>

        <div className="bg-black/30 p-4 rounded-lg mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Star className="w-5 h-5 text-game-accent" />
            <span className="text-gray-400">收集星星</span>
          </div>
          <div className="flex justify-center gap-1 mb-2">
            {Array.from({ length: totalStars }).map((_, i) => (
              <Star
                key={i}
                className={`w-8 h-8 ${
                  i < collectedStars ? 'text-game-accent fill-game-accent' : 'text-gray-600'
                }`}
              />
            ))}
          </div>
          <div className="text-sm text-gray-400">
            {collectedStars}/{totalStars} 颗
            {starBonus > 0 && (
              <span className="text-game-accent ml-2">+{starBonus} 分</span>
            )}
          </div>
        </div>

        <div className="flex gap-3 justify-center">
          <button onClick={handleReplay} className="btn-game">
            重玩本关
          </button>
          <button onClick={handleMainMenu} className="btn-game flex items-center gap-2">
            <Home className="w-5 h-5" />
            主菜单
          </button>
          <button onClick={handleNextLevel} className="btn-game flex items-center gap-2 bg-game-primary/30">
            {hasNextLevel ? (
              <>
                下一关
                <ArrowRight className="w-5 h-5" />
              </>
            ) : (
              '完成全部'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
