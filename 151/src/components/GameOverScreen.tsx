import { AlertTriangle, RotateCcw, Home } from 'lucide-react'
import { useStore } from '@/store/useStore'

export default function GameOverScreen() {
  const { resetLevel, setIsPlaying, setIsGameOver } = useStore()

  const handleRetry = () => {
    resetLevel()
  }

  const handleMainMenu = () => {
    setIsGameOver(false)
    setIsPlaying(false)
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-30">
      <div className="glass-panel p-8 text-center neon-border fade-in max-w-md">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
          <AlertTriangle className="w-12 h-12 text-red-500" />
        </div>
        <h2 className="text-3xl font-bold text-red-500 mb-2">掉落深渊！</h2>
        <p className="text-gray-400 mb-6">小球掉入了深渊，游戏结束</p>

        <div className="flex gap-4 justify-center">
          <button onClick={handleRetry} className="btn-game flex items-center gap-2">
            <RotateCcw className="w-5 h-5" />
            重新开始
          </button>
          <button onClick={handleMainMenu} className="btn-game flex items-center gap-2">
            <Home className="w-5 h-5" />
            返回主菜单
          </button>
        </div>
      </div>
    </div>
  )
}
