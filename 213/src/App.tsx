import TerrainScene from '@/components/TerrainScene'
import ControlPanel from '@/components/ControlPanel'
import Toolbar from '@/components/Toolbar'

export default function App() {
  return (
    <div className="w-screen h-screen overflow-hidden bg-[#0a0e17] relative">
      <div className="absolute inset-0 right-80">
        <TerrainScene />
      </div>
      <ControlPanel />
      <Toolbar />
    </div>
  )
}
