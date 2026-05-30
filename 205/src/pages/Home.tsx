import { useState, useCallback } from 'react';
import type { WebGLRenderer } from 'three';
import { GalaxyScene } from '../components/GalaxyScene';
import { ControlPanel } from '../components/ControlPanel';

export default function Home() {
  const [gl, setGl] = useState<WebGLRenderer | null>(null);

  const handleGlReady = useCallback((glInstance: WebGLRenderer) => {
    setGl(glInstance);
  }, []);

  return (
    <div className="w-screen h-screen overflow-hidden bg-[#0a0a1a] relative">
      <GalaxyScene onGlReady={handleGlReady} />
      <ControlPanel gl={gl} />
    </div>
  );
}
