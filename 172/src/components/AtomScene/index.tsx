import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import Nucleus from './Nucleus';
import ElectronOrbit from './ElectronOrbit';
import Electron from './Electron';
import { useAtomStore } from '../../store/useAtomStore';

export { default as ElectronOrbit } from './ElectronOrbit';
export { default as Electron } from './Electron';
export { default as Nucleus } from './Nucleus';

interface SceneContentProps {
  controlsRef: React.RefObject<any>;
}

const MAX_VISIBLE_ELECTRONS_PER_ORBIT = 16;

function SceneContent({ controlsRef }: SceneContentProps) {
  const {
    getCurrentElement,
    electronSpeed,
    orbitRadiusScale,
    orbitEccentricity,
    nucleusSize,
    backgroundType,
    showOrbitHighlight,
    autoRotate,
    selectedOrbitIndex,
    setSelectedOrbitIndex,
  } = useAtomStore();

  const element = getCurrentElement();

  const handleElectronClick = (orbitIndex: number) => {
    setSelectedOrbitIndex(selectedOrbitIndex === orbitIndex ? null : orbitIndex);
  };

  return (
    <>
      {backgroundType === 'space' && (
        <Stars
          radius={100}
          depth={50}
          count={3000}
          factor={4}
          saturation={0}
          fade
          speed={0.5}
        />
      )}

      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#ffffff" />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#4ecdc4" />

      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.05}
        minDistance={3}
        maxDistance={30}
        autoRotate={autoRotate}
        autoRotateSpeed={0.5}
      />

      <Nucleus
        color={element.nucleusColor}
        size={nucleusSize}
        nucleonCount={element.atomicNumber}
      />

      {element.orbits.map((orbit, orbitIndex) => {
        const visibleCount = Math.min(orbit.electronCount, MAX_VISIBLE_ELECTRONS_PER_ORBIT);
        const isHighlighted = showOrbitHighlight && (selectedOrbitIndex === orbitIndex || selectedOrbitIndex === null);

        return (
          <group key={`${element.symbol}-${orbitIndex}`}>
            <ElectronOrbit
              radius={orbit.radius * orbitRadiusScale}
              inclination={orbit.inclination}
              color={orbit.electronColor}
              highlighted={isHighlighted}
              orbitIndex={orbitIndex}
              eccentricity={orbitEccentricity}
            />

            {Array.from({ length: visibleCount }).map((_, electronIndex) => (
              <Electron
                key={electronIndex}
                orbitRadius={orbit.radius * orbitRadiusScale}
                orbitInclination={orbit.inclination}
                orbitIndex={orbitIndex}
                electronIndex={electronIndex}
                totalElectronsInOrbit={visibleCount}
                eccentricity={orbitEccentricity}
                color={orbit.electronColor}
                speed={electronSpeed * (1 - orbitIndex * 0.08)}
                onClick={handleElectronClick}
                selected={selectedOrbitIndex === orbitIndex}
              />
            ))}
          </group>
        );
      })}

      <EffectComposer>
        <Bloom
          intensity={1.5}
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
      </EffectComposer>
    </>
  );
}

interface AtomSceneProps {
  controlsRef: React.RefObject<any>;
}

export default function AtomScene({ controlsRef }: AtomSceneProps) {
  const { backgroundType } = useAtomStore();

  return (
    <Canvas
      camera={{ position: [8, 6, 8], fov: 60 }}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      style={{ background: backgroundType === 'black' ? '#000000' : '#0a1628' }}
    >
      <SceneContent controlsRef={controlsRef} />
    </Canvas>
  );
}
