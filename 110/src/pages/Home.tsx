import { useState, useCallback } from 'react';
import ThreeScene from '@/components/ThreeScene';
import ControlPanel from '@/components/ControlPanel';
import { ColorMode } from '@/lib/ParticleSystem';

export default function Home() {
  const [particleCount, setParticleCount] = useState(5000);
  const [explosionForce, setExplosionForce] = useState(50);
  const [particleSize, setParticleSize] = useState(2);
  const [colorMode, setColorMode] = useState<ColorMode>('random');
  const [gravityEnabled, setGravityEnabled] = useState(false);
  const [slowMotionEnabled, setSlowMotionEnabled] = useState(false);
  const [autoRotateEnabled, setAutoRotateEnabled] = useState(false);
  const [starBackground, setStarBackground] = useState(false);
  const [currentParticleCount, setCurrentParticleCount] = useState(5000);

  const handleParticleCountChange = useCallback((count: number) => {
    setCurrentParticleCount(count);
  }, []);

  return (
    <div className="w-full h-screen overflow-hidden bg-gray-900">
      <ThreeScene
        particleCount={particleCount}
        explosionForce={explosionForce}
        particleSize={particleSize}
        colorMode={colorMode}
        gravityEnabled={gravityEnabled}
        slowMotionEnabled={slowMotionEnabled}
        autoRotateEnabled={autoRotateEnabled}
        starBackground={starBackground}
        onParticleCountChange={handleParticleCountChange}
      />
      <ControlPanel
        currentParticleCount={currentParticleCount}
        particleCount={particleCount}
        explosionForce={explosionForce}
        particleSize={particleSize}
        colorMode={colorMode}
        gravityEnabled={gravityEnabled}
        slowMotionEnabled={slowMotionEnabled}
        autoRotateEnabled={autoRotateEnabled}
        starBackground={starBackground}
        onParticleCountChange={setParticleCount}
        onExplosionForceChange={setExplosionForce}
        onParticleSizeChange={setParticleSize}
        onColorModeChange={setColorMode}
        onGravityToggle={setGravityEnabled}
        onSlowMotionToggle={setSlowMotionEnabled}
        onAutoRotateToggle={setAutoRotateEnabled}
        onBackgroundToggle={setStarBackground}
      />
    </div>
  );
}