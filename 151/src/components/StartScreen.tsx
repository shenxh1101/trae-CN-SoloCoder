import { useState } from 'react'
import { Play, Edit3, ChevronLeft, ChevronRight, Trash2, Trophy, Star } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { defaultLevels } from '@/data/levels'
import { formatTime } from '@/utils/physics'

export default function StartScreen() {
  const {
    currentLevel,
    customLevels,
    totalLevels,
    bestTimes,
    bestJumps,
    startGame,
    setCurrentLevel,
    toggleEditor,
    deleteCustomLevel,
  } = useStore()

  const [showLevelSelect, setShowLevelSelect] = useState(false)
  const allLevels = [...defaultLevels, ...customLevels]

  const handlePrevLevel = () => {
    if (currentLevel > 0) {
      setCurrentLevel(currentLevel - 1)
    }
  }

  const handleNextLevel = () => {
    if (currentLevel < allLevels.length - 1) {
      setCurrentLevel(currentLevel + 1)
    }
  }

  const currentLevelData = allLevels[currentLevel]
  const isCustomLevel = currentLevel >= defaultLevels.length

  return (
    <div className="fixed inset-0 flex items-center justify-center z-20 bg-gradient-to-b from-game-dark/90 to-game-dark">
      <div className="text-center fade-in">
        <h1 className="text-6xl font-bold text-game-primary mb-2 neon-text">
          3D 跳跃小球
        </h1>
        <p className="text-gray-400 mb-8 text-lg">
          控制小球跳跃到所有目标点，收集星星获得额外分数！
        </p>

        {!showLevelSelect ? (
          <div className="space-y-4">
            <div className="glass-panel p-6 mb-6 neon-border max-w-md mx-auto">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={handlePrevLevel}
                  disabled={currentLevel === 0}
                  className="btn-game !p-2"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div>
                  <div className="text-xl font-bold text-white">
                    关卡 {currentLevel + 1}/{allLevels.length}
                  </div>
                  <div className="text-game-primary">{currentLevelData?.name}</div>
                  {isCustomLevel && (
                    <span className="text-xs text-game-accent">自定义关卡</span>
                  )}
                </div>
                <button
                  onClick={handleNextLevel}
                  disabled={currentLevel === allLevels.length - 1}
                  className="btn-game !p-2"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-black/30 p-3 rounded-lg">
                  <div className="text-gray-400">目标点</div>
                  <div className="text-2xl font-bold text-game-secondary">
                    {currentLevelData?.targets.length || 0}
                  </div>
                </div>
                <div className="bg-black/30 p-3 rounded-lg">
                  <div className="text-gray-400">星星</div>
                  <div className="text-2xl font-bold text-game-accent">
                    {currentLevelData?.stars.length || 0}
                  </div>
                </div>
              </div>

              {currentLevelData?.wind.enabled && (
                <div className="mt-3 text-sm text-green-400 flex items-center justify-center gap-1">
                  <span className="animate-pulse">🌬️</span> 有风影响
                </div>
              )}

              {(bestTimes[currentLevel] || bestJumps[currentLevel]) && (
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <div className="flex items-center justify-center gap-1 text-game-accent mb-2">
                    <Trophy className="w-4 h-4" />
                    <span className="text-sm">最佳记录</span>
                  </div>
                  <div className="flex justify-center gap-6 text-sm">
                    <div>
                      <span className="text-gray-400">时间: </span>
                      <span className="text-white font-mono">
                        {bestTimes[currentLevel] ? formatTime(bestTimes[currentLevel]) : '--:--.--'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">跳跃: </span>
                      <span className="text-white">{bestJumps[currentLevel] || '--'} 次</span>
                    </div>
                  </div>
                </div>
              )}

              {isCustomLevel && (
                <button
                  onClick={() => deleteCustomLevel(currentLevelData.id)}
                  className="mt-4 text-red-400 hover:text-red-300 text-sm flex items-center gap-1 mx-auto"
                >
                  <Trash2 className="w-4 h-4" />
                  删除此关卡
                </button>
              )}
            </div>

            <div className="flex gap-4 justify-center">
              <button onClick={startGame} className="btn-game text-xl px-10 py-4 flex items-center gap-2">
                <Play className="w-6 h-6" />
                开始游戏
              </button>
              <button onClick={toggleEditor} className="btn-game text-xl px-8 py-4 flex items-center gap-2">
                <Edit3 className="w-6 h-6" />
                关卡编辑器
              </button>
            </div>
          </div>
        ) : (
          <div className="glass-panel p-6 neon-border max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-game-primary mb-4">选择关卡</h2>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {allLevels.map((level, index) => (
                <button
                  key={level.id}
                  onClick={() => {
                    setCurrentLevel(index)
                    setShowLevelSelect(false)
                  }}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    index === currentLevel
                      ? 'border-game-primary bg-game-primary/20'
                      : 'border-gray-600 hover:border-game-primary/50'
                  }`}
                >
                  <div className="font-bold">第 {index + 1} 关</div>
                  <div className="text-sm text-gray-400">{level.name}</div>
                  <div className="flex justify-center gap-2 mt-2 text-xs">
                    <span className="text-game-secondary">{level.targets.length}🎯</span>
                    <span className="text-game-accent">{level.stars.length}⭐</span>
                    {level.wind.enabled && <span className="text-green-400">🌬️</span>}
                  </div>
                  {level.isCustom && (
                    <div className="text-xs text-game-accent mt-1">自定义</div>
                  )}
                </button>
              ))}
            </div>
            <button onClick={() => setShowLevelSelect(false)} className="btn-game">
              返回
            </button>
          </div>
        )}

        <div className="mt-8 text-gray-500 text-sm">
          <p>操作说明: 按住空格键或鼠标蓄力，松开跳跃 | 移动鼠标控制方向</p>
          <p className="mt-1">掉落到深渊会重置关卡 | 依次到达所有目标点即可过关</p>
        </div>
      </div>
    </div>
  )
}
