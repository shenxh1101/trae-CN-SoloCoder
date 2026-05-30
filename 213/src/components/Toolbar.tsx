import { Camera, Box, Mountain, RotateCw, Waves, Cloud } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { exportScreenshot, exportOBJ, exportHeightMap } from '@/utils/exporters'
import { getTerrainMesh } from '@/utils/terrainMeshRef'

export default function Toolbar() {
  const autoRotate = useStore((s) => s.autoRotate)
  const showWater = useStore((s) => s.showWater)
  const showSky = useStore((s) => s.showSky)
  const toggleAutoRotate = useStore((s) => s.toggleAutoRotate)
  const toggleWater = useStore((s) => s.toggleWater)
  const toggleSky = useStore((s) => s.toggleSky)
  const heightData = useStore((s) => s.heightData)
  const segments = useStore((s) => s.segments)

  const handleScreenshot = () => {
    const canvas = document.querySelector('canvas')
    if (canvas) exportScreenshot(canvas)
  }

  const handleOBJ = () => {
    const mesh = getTerrainMesh()
    if (mesh) exportOBJ(mesh.geometry)
  }

  const handleHeightMap = () => {
    if (heightData) exportHeightMap(heightData, segments)
  }

  const btnClass =
    'flex items-center gap-1.5 px-4 py-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-all text-xs font-["Noto_Sans_SC"]'

  const activeClass =
    'bg-purple-500/30 text-purple-300 border border-purple-500/50'

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-md border border-white/10 rounded-full">
      <button className={btnClass} onClick={handleScreenshot}>
        <Camera size={14} />
        截图
      </button>
      <button className={btnClass} onClick={handleOBJ}>
        <Box size={14} />
        OBJ
      </button>
      <button className={btnClass} onClick={handleHeightMap}>
        <Mountain size={14} />
        灰度图
      </button>
      <div className="w-px h-6 bg-white/10 mx-1" />
      <button
        className={`${btnClass} ${autoRotate ? activeClass : ''}`}
        onClick={toggleAutoRotate}
      >
        <RotateCw size={14} />
        自动环绕
      </button>
      <button
        className={`${btnClass} ${showWater ? activeClass : ''}`}
        onClick={toggleWater}
      >
        <Waves size={14} />
        水面
      </button>
      <button
        className={`${btnClass} ${showSky ? activeClass : ''}`}
        onClick={toggleSky}
      >
        <Cloud size={14} />
        天空
      </button>
    </div>
  )
}
