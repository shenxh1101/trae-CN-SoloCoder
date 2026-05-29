import { useCallback, useState } from 'react'
import { useStore } from '@/store/useStore'
import GameScene from './components/GameScene'
import EditorScene from './components/EditorScene'
import HUD from './components/HUD'
import StartScreen from './components/StartScreen'
import GameOverScreen from './components/GameOverScreen'
import LevelCompleteScreen from './components/LevelCompleteScreen'
import LevelEditor from './components/LevelEditor'
import { Level, Vector3, Platform, TargetPoint, Star } from './types/game'
import { createEmptyLevel } from './data/levels'

function App() {
  const { isPlaying, isGameOver, isLevelComplete, showEditor, editorMode } = useStore()

  const [editingLevel, setEditingLevel] = useState<Level>(createEmptyLevel())

  const handleEditorAddElement = useCallback((type: 'platform' | 'target' | 'star', position: Vector3) => {
    console.log('[App] handleEditorAddElement called:', { type, position })
    setEditingLevel((prev) => {
      console.log('[App] prev state:', {
        platforms: prev.platforms.length,
        targets: prev.targets.length,
        stars: prev.stars.length,
      })

      if (type === 'platform') {
        const newPlatform: Platform = {
          position: { ...position, y: Math.max(0, position.y) },
          size: { x: 3, y: 0.5, z: 3 },
        }
        console.log('[App] adding platform:', newPlatform)
        const newState = { ...prev, platforms: [...prev.platforms, newPlatform] }
        console.log('[App] new state platforms count:', newState.platforms.length)
        return newState
      } else if (type === 'target') {
        const newTarget: TargetPoint = {
          id: Date.now(),
          position: { ...position, y: position.y + 1.5 },
          reached: false,
        }
        console.log('[App] adding target:', newTarget)
        const newState = { ...prev, targets: [...prev.targets, newTarget] }
        console.log('[App] new state targets count:', newState.targets.length)
        return newState
      } else if (type === 'star') {
        const newStar: Star = {
          id: Date.now(),
          position: { ...position, y: position.y + 3 },
          collected: false,
        }
        console.log('[App] adding star:', newStar)
        const newState = { ...prev, stars: [...prev.stars, newStar] }
        console.log('[App] new state stars count:', newState.stars.length)
        return newState
      }
      return prev
    })
  }, [])

  const handleUpdateLevel = useCallback((levelOrUpdater: Level | ((prev: Level) => Level)) => {
    console.log('[App] handleUpdateLevel called, type:', typeof levelOrUpdater)
    setEditingLevel((prev) => {
      const newLevel = typeof levelOrUpdater === 'function' ? levelOrUpdater(prev) : levelOrUpdater
      console.log('[App] handleUpdateLevel newLevel:', {
        platforms: newLevel.platforms.length,
        targets: newLevel.targets.length,
        stars: newLevel.stars.length,
      })
      return newLevel
    })
  }, [])

  const showStartScreen = !isPlaying && !isGameOver && !isLevelComplete && !showEditor

  return (
    <div className="w-full h-full relative overflow-hidden">
      {showEditor ? (
        <div className="w-full h-full flex">
          <div className="flex-1 relative">
            <EditorScene
              level={editingLevel}
              editorMode={editorMode}
              onAddElement={handleEditorAddElement}
            />
          </div>
          <LevelEditor
            editingLevel={editingLevel}
            onUpdateLevel={handleUpdateLevel}
          />
        </div>
      ) : (
        <GameScene />
      )}

      {isPlaying && !showEditor && <HUD />}

      {showStartScreen && <StartScreen />}

      {isGameOver && <GameOverScreen />}

      {isLevelComplete && <LevelCompleteScreen />}

      {isPlaying && !showEditor && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 text-gray-500 text-sm pointer-events-none">
          按住 空格/鼠标 蓄力 | 移动鼠标 控制方向 | 松开 跳跃
        </div>
      )}

      {showEditor && editorMode !== 'none' && (
        <div className="fixed bottom-4 left-1/4 -translate-x-1/2 text-game-accent text-sm pointer-events-none z-40 bg-black/70 px-4 py-2 rounded-lg">
          点击场景添加{editorMode === 'platform' ? '平台' : editorMode === 'target' ? '目标点' : '星星'}
        </div>
      )}
    </div>
  )
}

export default App
