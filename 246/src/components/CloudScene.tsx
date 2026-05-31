import { Canvas } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { OrbitControls } from '@react-three/drei';
import CloudSea from './CloudSea';
import SceneLighting from './SceneLighting';
import CreatureParticles from './CreatureParticles';
import CameraController from './CameraController';
import { useCloudStore } from '@/store/useCloudStore';

function SceneContent() {
  const { analysis, cameraMode } = useCloudStore();
  const { lighting } = analysis;

  return (
    <>
      <fog attach="fog" color={lighting.fogColor} near={lighting.fogNear} far={lighting.fogFar} />
      <color attach="background" args={[lighting.fogColor]} />
      <SceneLighting />
      <CloudSea />
      <CreatureParticles />
      <CameraController />
      {cameraMode === 'orbit' && (
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          maxPolarAngle={Math.PI / 2.2}
          minDistance={10}
          maxDistance={150}
        />
      )}
      <EffectComposer>
        <Bloom
          intensity={0.4}
          luminanceThreshold={0.6}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
      </EffectComposer>
    </>
  );
}

export default function CloudScene() {
  return (
    <div className="w-full h-full absolute inset-0">
      <Canvas
        camera={{ position: [0, 20, 40], fov: 60, near: 0.1, far: 500 }}
        gl={{ preserveDrawingBuffer: true, antialias: true, alpha: false }}
        dpr={[1, 2]}
      >
        <SceneContent />
      </Canvas>
    </div>
  );
}
