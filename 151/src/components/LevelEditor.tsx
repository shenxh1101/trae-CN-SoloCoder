import { useState } from 'react'
import { X, Save, Plus, Trash2, Box, Target, Star as StarIcon, Wind } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Level, Platform, TargetPoint, Star } from '@/types/game'

interface LevelEditorProps {
  editingLevel: Level
  onUpdateLevel: (levelOrUpdater: Level | ((prev: Level) => Level)) => void
}

export default function LevelEditor({ editingLevel, onUpdateLevel }: LevelEditorProps) {
  const { showEditor, editorMode, setEditorMode, toggleEditor, saveCustomLevel } = useStore()

  const [levelName, setLevelName] = useState(editingLevel.name)
  const [windEnabled, setWindEnabled] = useState(editingLevel.wind.enabled)
  const [windStrength, setWindStrength] = useState(editingLevel.wind.strength)
  const [selectedIndex, setSelectedIndex] = useState<{ type: string; index: number } | null>(null)

  console.log('[LevelEditor] render, editingLevel:', {
    platforms: editingLevel.platforms.length,
    targets: editingLevel.targets.length,
    stars: editingLevel.stars.length,
    platformPositions: editingLevel.platforms.map(p => p.position),
  })

  if (!showEditor) return null

  const handleAddPlatform = () => {
    console.log('[LevelEditor] handleAddPlatform called')
    onUpdateLevel((prev: Level) => {
      const newPlatform: Platform = {
        position: { x: 0, y: 0, z: 0 },
        size: { x: 3, y: 0.5, z: 3 },
      }
      console.log('[LevelEditor] adding platform via functional update')
      return {
        ...prev,
        platforms: [...prev.platforms, newPlatform],
      }
    })
  }

  const handleAddTarget = () => {
    console.log('[LevelEditor] handleAddTarget called')
    onUpdateLevel((prev: Level) => {
      const newTarget: TargetPoint = {
        id: Date.now(),
        position: { x: 0, y: 1.5, z: 0 },
        reached: false,
      }
      console.log('[LevelEditor] adding target via functional update')
      return {
        ...prev,
        targets: [...prev.targets, newTarget],
      }
    })
  }

  const handleAddStar = () => {
    console.log('[LevelEditor] handleAddStar called')
    onUpdateLevel((prev: Level) => {
      const newStar: Star = {
        id: Date.now(),
        position: { x: 0, y: 3, z: 0 },
        collected: false,
      }
      console.log('[LevelEditor] adding star via functional update')
      return {
        ...prev,
        stars: [...prev.stars, newStar],
      }
    })
  }

  const handleRemoveItem = (type: string, index: number) => {
    console.log('[LevelEditor] handleRemoveItem:', { type, index })
    onUpdateLevel((prev: Level) => {
      if (type === 'platform' && prev.platforms.length <= 1) {
        alert('至少需要一个平台！')
        return prev
      }
      if (type === 'platform') {
        return {
          ...prev,
          platforms: prev.platforms.filter((_, i) => i !== index),
        }
      } else if (type === 'target') {
        return {
          ...prev,
          targets: prev.targets.filter((_, i) => i !== index),
        }
      } else if (type === 'star') {
        return {
          ...prev,
          stars: prev.stars.filter((_, i) => i !== index),
        }
      }
      return prev
    })
    setSelectedIndex(null)
  }

  const handlePositionChange = (type: string, index: number, axis: 'x' | 'y' | 'z', value: number) => {
    console.log('[LevelEditor] handlePositionChange:', { type, index, axis, value })
    onUpdateLevel((prev: Level) => {
      if (type === 'platform') {
        const newPlatforms = [...prev.platforms]
        newPlatforms[index] = {
          ...newPlatforms[index],
          position: { ...newPlatforms[index].position, [axis]: value },
        }
        return { ...prev, platforms: newPlatforms }
      } else if (type === 'target') {
        const newTargets = [...prev.targets]
        newTargets[index] = {
          ...newTargets[index],
          position: { ...newTargets[index].position, [axis]: value },
        }
        return { ...prev, targets: newTargets }
      } else if (type === 'star') {
        const newStars = [...prev.stars]
        newStars[index] = {
          ...newStars[index],
          position: { ...newStars[index].position, [axis]: value },
        }
        return { ...prev, stars: newStars }
      }
      return prev
    })
  }

  const handleSizeChange = (index: number, axis: 'x' | 'y' | 'z', value: number) => {
    console.log('[LevelEditor] handleSizeChange:', { index, axis, value })
    onUpdateLevel((prev: Level) => {
      const newPlatforms = [...prev.platforms]
      newPlatforms[index] = {
        ...newPlatforms[index],
        size: { ...newPlatforms[index].size, [axis]: value },
      }
      return { ...prev, platforms: newPlatforms }
    })
  }

  const handleSave = () => {
    console.log('[LevelEditor] handleSave called')
    if (editingLevel.targets.length === 0) {
      alert('至少需要一个目标点！')
      return
    }

    const levelToSave: Level = {
      ...editingLevel,
      name: levelName || '自定义关卡',
      wind: {
        enabled: windEnabled,
        direction: { x: 1, y: 0, z: 0 },
        strength: windStrength,
      },
      startPosition: editingLevel.platforms[0]
        ? {
            x: editingLevel.platforms[0].position.x,
            y: editingLevel.platforms[0].position.y + 2,
            z: editingLevel.platforms[0].position.z,
          }
        : { x: 0, y: 2, z: 0 },
      id: Date.now(),
      isCustom: true,
    }

    console.log('[LevelEditor] levelToSave:', JSON.stringify(levelToSave, null, 2))
    console.log('[LevelEditor] platforms count:', levelToSave.platforms.length)
    console.log('[LevelEditor] targets count:', levelToSave.targets.length)
    console.log('[LevelEditor] stars count:', levelToSave.stars.length)

    saveCustomLevel(levelToSave)
    toggleEditor()
    alert('关卡保存成功！')
  }

  const editorButtonClass = (mode: string) =>
    `btn-game flex items-center gap-2 ${
      editorMode === mode ? 'bg-game-primary/40 border-game-primary' : ''
    }`

  return (
    <div className="w-96 glass-panel h-full overflow-y-auto p-4 neon-border z-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-game-primary">关卡编辑器</h2>
        <button onClick={toggleEditor} className="btn-game !p-2">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="mb-4">
        <label className="block text-sm text-gray-400 mb-1">关卡名称</label>
        <input
          type="text"
          value={levelName}
          onChange={(e) => setLevelName(e.target.value)}
          className="w-full bg-black/30 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-game-primary outline-none"
          placeholder="输入关卡名称"
        />
      </div>

      <div className="mb-4 p-3 bg-black/30 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Wind className="w-4 h-4 text-green-400" />
            <span className="text-sm">风力效果</span>
          </div>
          <button
            onClick={() => setWindEnabled(!windEnabled)}
            className={`w-12 h-6 rounded-full transition-colors ${
              windEnabled ? 'bg-green-500' : 'bg-gray-600'
            }`}
          >
            <div
              className={`w-5 h-5 bg-white rounded-full transition-transform ${
                windEnabled ? 'translate-x-6' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
        {windEnabled && (
          <div>
            <label className="block text-xs text-gray-400 mb-1">风力强度</label>
            <input
              type="range"
              min="0.01"
              max="0.15"
              step="0.01"
              value={windStrength}
              onChange={(e) => setWindStrength(parseFloat(e.target.value))}
              className="slider-game"
            />
            <div className="text-xs text-gray-400 text-right">{windStrength.toFixed(2)}</div>
          </div>
        )}
      </div>

      <div className="mb-4">
        <label className="block text-sm text-gray-400 mb-2">点击场景添加</label>
        <div className="flex gap-2">
          <button
            onClick={() => setEditorMode(editorMode === 'platform' ? 'none' : 'platform')}
            className={editorButtonClass('platform')}
          >
            <Box className="w-4 h-4" />
            平台
          </button>
          <button
            onClick={() => setEditorMode(editorMode === 'target' ? 'none' : 'target')}
            className={editorButtonClass('target')}
          >
            <Target className="w-4 h-4" />
            目标
          </button>
          <button
            onClick={() => setEditorMode(editorMode === 'star' ? 'none' : 'star')}
            className={editorButtonClass('star')}
          >
            <StarIcon className="w-4 h-4" />
            星星
          </button>
        </div>
        {editorMode !== 'none' && (
          <p className="text-xs text-game-accent mt-2">点击3D场景中的地面添加元素</p>
        )}
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">手动添加</span>
        </div>
        <div className="flex gap-2">
          <button onClick={handleAddPlatform} className="btn-game flex-1 text-sm flex items-center justify-center gap-1">
            <Plus className="w-4 h-4" />
            平台
          </button>
          <button onClick={handleAddTarget} className="btn-game flex-1 text-sm flex items-center justify-center gap-1">
            <Plus className="w-4 h-4" />
            目标
          </button>
          <button onClick={handleAddStar} className="btn-game flex-1 text-sm flex items-center justify-center gap-1">
            <Plus className="w-4 h-4" />
            星星
          </button>
        </div>
      </div>

      <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
        {editingLevel.platforms.map((platform, index) => (
          <div
            key={`platform-${index}`}
            className="p-3 bg-black/30 rounded-lg border border-gray-700"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-game-primary">平台 #{index + 1}</span>
              <button
                onClick={() => handleRemoveItem('platform', index)}
                className="text-red-400 hover:text-red-300"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {(['x', 'y', 'z'] as const).map((axis) => (
                <div key={axis}>
                  <label className="text-gray-400">位置{axis.toUpperCase()}</label>
                  <input
                    type="number"
                    step="0.5"
                    value={platform.position[axis]}
                    onChange={(e) => handlePositionChange('platform', index, axis, parseFloat(e.target.value) || 0)}
                    className="w-full bg-black/30 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                  />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs mt-2">
              {(['x', 'y', 'z'] as const).map((axis) => (
                <div key={axis}>
                  <label className="text-gray-400">大小{axis.toUpperCase()}</label>
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    value={platform.size[axis]}
                    onChange={(e) => handleSizeChange(index, axis, parseFloat(e.target.value) || 1)}
                    className="w-full bg-black/30 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}

        {editingLevel.targets.map((target, index) => (
          <div
            key={`target-${target.id}`}
            className="p-3 bg-black/30 rounded-lg border border-gray-700"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-game-secondary">目标 #{index + 1}</span>
              <button
                onClick={() => handleRemoveItem('target', index)}
                className="text-red-400 hover:text-red-300"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {(['x', 'y', 'z'] as const).map((axis) => (
                <div key={axis}>
                  <label className="text-gray-400">位置{axis.toUpperCase()}</label>
                  <input
                    type="number"
                    step="0.5"
                    value={target.position[axis]}
                    onChange={(e) => handlePositionChange('target', index, axis, parseFloat(e.target.value) || 0)}
                    className="w-full bg-black/30 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}

        {editingLevel.stars.map((star, index) => (
          <div
            key={`star-${star.id}`}
            className="p-3 bg-black/30 rounded-lg border border-gray-700"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-game-accent">星星 #{index + 1}</span>
              <button
                onClick={() => handleRemoveItem('star', index)}
                className="text-red-400 hover:text-red-300"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {(['x', 'y', 'z'] as const).map((axis) => (
                <div key={axis}>
                  <label className="text-gray-400">位置{axis.toUpperCase()}</label>
                  <input
                    type="number"
                    step="0.5"
                    value={star.position[axis]}
                    onChange={(e) => handlePositionChange('star', index, axis, parseFloat(e.target.value) || 0)}
                    className="w-full bg-black/30 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-700">
        <div className="text-sm text-gray-400 mb-3">
          <div>平台: {editingLevel.platforms.length}</div>
          <div>目标: {editingLevel.targets.length}</div>
          <div>星星: {editingLevel.stars.length}</div>
        </div>
        <button onClick={handleSave} className="btn-game w-full flex items-center justify-center gap-2 py-3">
          <Save className="w-5 h-5" />
          保存关卡
        </button>
      </div>
    </div>
  )
}
