import { Eye, Moon, Orbit, Wind, Sparkles, RotateCw, Download } from 'lucide-react'
import { useSolarSystemStore } from '@/store/useSolarSystemStore'
import { SPEED_OPTIONS } from '@/utils/constants'

export default function ControlPanel() {
  const {
    cameraMode,
    setCameraMode,
    orbitSpeed,
    setOrbitSpeed,
    showOrbitLine,
    toggleOrbitLine,
    showAtmosphere,
    toggleAtmosphere,
    showStarField,
    toggleStarField,
    autoRotate,
    toggleAutoRotate,
  } = useSolarSystemStore()

  const handleScreenshot = () => {
    const canvas = document.querySelector('canvas')
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `earth-moon-${Date.now()}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  return (
    <div className="fixed right-4 top-1/2 -translate-y-1/2 z-10 glass-panel p-3 flex flex-col gap-2 w-52">
      <h3 className="font-orbitron text-xs text-star-blue tracking-widest mb-1 text-center uppercase">
        控制面板
      </h3>

      <button
        onClick={() => setCameraMode(cameraMode === 'global' ? 'lunar' : 'global')}
        className={`glass-btn flex items-center gap-2 px-3 py-2 text-xs font-noto ${
          cameraMode === 'lunar' ? 'active' : ''
        }`}
      >
        {cameraMode === 'global' ? <Eye size={14} /> : <Moon size={14} />}
        <span>{cameraMode === 'global' ? '全局视角' : '月球视角'}</span>
      </button>

      <button
        onClick={toggleOrbitLine}
        className={`glass-btn flex items-center gap-2 px-3 py-2 text-xs font-noto ${
          showOrbitLine ? 'active' : ''
        }`}
      >
        <Orbit size={14} />
        <span>轨道线</span>
      </button>

      <button
        onClick={toggleAtmosphere}
        className={`glass-btn flex items-center gap-2 px-3 py-2 text-xs font-noto ${
          showAtmosphere ? 'active' : ''
        }`}
      >
        <Wind size={14} />
        <span>大气层</span>
      </button>

      <button
        onClick={toggleStarField}
        className={`glass-btn flex items-center gap-2 px-3 py-2 text-xs font-noto ${
          showStarField ? 'active' : ''
        }`}
      >
        <Sparkles size={14} />
        <span>星空</span>
      </button>

      <button
        onClick={toggleAutoRotate}
        className={`glass-btn flex items-center gap-2 px-3 py-2 text-xs font-noto ${
          autoRotate ? 'active' : ''
        }`}
        disabled={cameraMode === 'lunar'}
        style={{ opacity: cameraMode === 'lunar' ? 0.3 : 1 }}
      >
        <RotateCw size={14} />
        <span>自动旋转</span>
      </button>

      <div className="border-t border-star-blue/20 pt-2 mt-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-moon-gray font-noto">公转速度</span>
          <span className="text-[10px] font-orbitron text-star-blue">{orbitSpeed}x</span>
        </div>
        <div className="flex gap-1">
          {SPEED_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setOrbitSpeed(s)}
              className={`flex-1 text-[10px] py-1 rounded font-orbitron transition-all ${
                orbitSpeed === s
                  ? 'bg-star-blue/30 text-star-blue border border-star-blue/50'
                  : 'bg-white/5 text-moon-gray border border-white/10 hover:bg-white/10'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleScreenshot}
        className="glass-btn flex items-center gap-2 px-3 py-2 text-xs font-noto mt-1"
      >
        <Download size={14} />
        <span>截图保存</span>
      </button>
    </div>
  )
}
