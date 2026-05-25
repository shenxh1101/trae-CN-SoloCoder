import { useEffect } from 'react';
import Scene from './components/three/Scene';
import ControlPanel from './components/ui/ControlPanel';
import StatusBar from './components/ui/StatusBar';
import CityTooltip from './components/ui/CityTooltip';
import AnimationIndicator from './components/ui/AnimationIndicator';
import { useSceneStore } from './store/useSceneStore';

export default function App() {
  const setMousePosition = useSceneStore((state) => state.setMousePosition);
  const hoveredCity = useSceneStore((state) => state.hoveredCity);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (hoveredCity) {
        setMousePosition({ x: e.clientX, y: e.clientY });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [hoveredCity, setMousePosition]);

  return (
    <div className="w-screen h-screen overflow-hidden relative">
      <Scene />
      <ControlPanel />
      <StatusBar />
      <CityTooltip />
      <AnimationIndicator />
    </div>
  );
}
