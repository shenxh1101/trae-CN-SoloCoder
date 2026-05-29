import { useMemo } from 'react'
import { Camera, Download, Upload } from 'lucide-react'
import { useFractalStore } from '@/store/fractalStore'
import { exportParams, importParams } from '@/utils/jsonIO'

interface ToolbarProps {
  onScreenshot: () => void
}

export default function Toolbar({ onScreenshot }: ToolbarProps) {
  const setParams = useFractalStore((s) => s.setParams)
  const depth = useFractalStore((s) => s.depth)
  const shapeType = useFractalStore((s) => s.shapeType)
  const rotationSpeed = useFractalStore((s) => s.rotationSpeed)
  const scaleSpeed = useFractalStore((s) => s.scaleSpeed)
  const backgroundMode = useFractalStore((s) => s.backgroundMode)
  const colorMode = useFractalStore((s) => s.colorMode)
  const wireframe = useFractalStore((s) => s.wireframe)
  const autoOrbit = useFractalStore((s) => s.autoOrbit)

  const params = useMemo(() => ({
    depth,
    shapeType,
    rotationSpeed,
    scaleSpeed,
    backgroundMode,
    colorMode,
    wireframe,
    autoOrbit,
  }), [depth, shapeType, rotationSpeed, scaleSpeed, backgroundMode, colorMode, wireframe, autoOrbit])

  const handleImport = async () => {
    try {
      const imported = await importParams()
      setParams(imported)
    } catch (err) {
      console.error('导入失败:', err)
    }
  }

  return (
    <div className="flex gap-2 mb-5 pb-4 border-b border-gray-700/50">
      <button
        onClick={onScreenshot}
        className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-cyber-pink hover:bg-cyber-pink/80 text-white rounded-lg transition-all duration-200 shadow-lg shadow-cyber-pink/30"
        title="截图保存PNG"
      >
        <Camera size={16} />
        <span className="text-sm font-medium">截图</span>
      </button>

      <button
        onClick={() => exportParams(params)}
        className="flex items-center justify-center gap-1 py-2 px-3 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-all duration-200"
        title="导出JSON"
      >
        <Download size={16} />
      </button>

      <button
        onClick={handleImport}
        className="flex items-center justify-center gap-1 py-2 px-3 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-all duration-200"
        title="导入JSON"
      >
        <Upload size={16} />
      </button>
    </div>
  )
}
