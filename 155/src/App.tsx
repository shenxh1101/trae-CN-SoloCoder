import { Scene3D } from './components/Scene3D';
import { ControlPanel } from './components/ControlPanel';
import { BeamCountBadge } from './components/UI/BeamCountBadge';
import { useConfig } from './store/useSceneStore';

function App() {
  const config = useConfig();

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black">
      <div className="absolute inset-0">
        <Scene3D />
      </div>
      
      <BeamCountBadge count={config.beamCount} />
      
      <ControlPanel />
    </div>
  );
}

export default App;
