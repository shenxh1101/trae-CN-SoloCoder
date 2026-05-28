import { useRef } from 'react'
import { Camera, RefreshCw, Maximize, Minimize, Download, Upload } from 'lucide-react'
import { useKaleidoscopeStore, type KaleidoscopeConfig } from '@/store/useKaleidoscopeStore'

export function Toolbar() {
  const isFullscreen = useKaleidoscopeStore((state) => state.isFullscreen)
  const toggleFullscreen = useKaleidoscopeStore((state) => state.toggleFullscreen)
  const resetCamera = useKaleidoscopeStore((state) => state.resetCamera)
  const exportConfig = useKaleidoscopeStore((state) => state.exportConfig)
  const importConfig = useKaleidoscopeStore((state) => state.importConfig)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleScreenshot = () => {
    const canvas = document.querySelector('canvas')
    if (canvas) {
      const link = document.createElement('a')
      link.download = `kaleidoscope-${Date.now()}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    }
  }

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
    toggleFullscreen()
  }

  const handleExport = () => {
    const config = exportConfig()
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' })
    const link = document.createElement('a')
    link.download = `kaleidoscope-config-${Date.now()}.json`
    link.href = URL.createObjectURL(blob)
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const config = JSON.parse(e.target?.result as string) as KaleidoscopeConfig
          importConfig(config)
        } catch (error) {
          console.error('Failed to import config:', error)
        }
      }
      reader.readAsText(file)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 p-2 bg-black/60 backdrop-blur-md border border-white/10 rounded-xl">
      <button
        onClick={handleScreenshot}
        className="p-3 rounded-lg bg-white/5 hover:bg-white/10 text-cyan-400 hover:text-cyan-300 transition-all duration-200"
        title="截图保存"
      >
        <Camera size={20} />
      </button>

      <button
        onClick={resetCamera}
        className="p-3 rounded-lg bg-white/5 hover:bg-white/10 text-cyan-400 hover:text-cyan-300 transition-all duration-200"
        title="重置视角"
      >
        <RefreshCw size={20} />
      </button>

      <button
        onClick={handleFullscreen}
        className="p-3 rounded-lg bg-white/5 hover:bg-white/10 text-cyan-400 hover:text-cyan-300 transition-all duration-200"
        title="全屏模式"
      >
        {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
      </button>

      <div className="w-px h-8 bg-white/10" />

      <button
        onClick={handleExport}
        className="p-3 rounded-lg bg-white/5 hover:bg-white/10 text-fuchsia-400 hover:text-fuchsia-300 transition-all duration-200"
        title="导出配置"
      >
        <Download size={20} />
      </button>

      <button
        onClick={() => fileInputRef.current?.click()}
        className="p-3 rounded-lg bg-white/5 hover:bg-white/10 text-fuchsia-400 hover:text-fuchsia-300 transition-all duration-200"
        title="导入配置"
      >
        <Upload size={20} />
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleImport}
        className="hidden"
      />
    </div>
  )
}
