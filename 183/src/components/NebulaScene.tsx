import { useRef, useEffect } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { Lensflare, LensflareElement } from 'three/examples/jsm/objects/Lensflare.js';
import { NebulaParticles } from './NebulaParticles';
import { CoreGlow } from './CoreGlow';
import { StarBackground } from './StarBackground';
import { useNebulaStore } from '@/store/useNebulaStore';
import { takeScreenshot } from '@/utils/helpers';

interface SceneContentProps {
  onGlReady?: (gl: THREE.WebGLRenderer) => void;
}

function SceneContent({ onGlReady }: SceneContentProps) {
  const { gl, scene } = useThree();
  const {
    bloomEnabled,
    lensFlareEnabled,
    autoRotate,
    backgroundType,
    setFps,
    coreColor,
  } = useNebulaStore();

  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(Date.now());
  const controlsRef = useRef<any>(null);
  const lensFlareCreatedRef = useRef(false);

  useEffect(() => {
    if (onGlReady) {
      onGlReady(gl);
    }
  }, [gl, onGlReady]);

  useEffect(() => {
    if (lensFlareEnabled && !lensFlareCreatedRef.current) {
      lensFlareCreatedRef.current = true;
      const flareTexture = createFlareTexture();
      const lensFlare = new Lensflare();
      
      lensFlare.addElement(
        new LensflareElement(flareTexture, 300, 0, new THREE.Color(coreColor))
      );
      lensFlare.addElement(
        new LensflareElement(flareTexture, 120, 1.5, new THREE.Color(0xffffff))
      );
      lensFlare.addElement(
        new LensflareElement(flareTexture, 80, 2.5, new THREE.Color(coreColor))
      );
      
      lensFlare.name = 'lensFlare';
      scene.add(lensFlare);
    } else if (!lensFlareEnabled && lensFlareCreatedRef.current) {
      const flare = scene.getObjectByName('lensFlare');
      if (flare) {
        scene.remove(flare);
      }
      lensFlareCreatedRef.current = false;
    }

    return () => {
      const flare = scene.getObjectByName('lensFlare');
      if (flare) {
        scene.remove(flare);
      }
    };
  }, [lensFlareEnabled, coreColor, scene]);

  useFrame(() => {
    frameCountRef.current++;
    const now = Date.now();
    if (now - lastTimeRef.current >= 1000) {
      setFps(frameCountRef.current);
      frameCountRef.current = 0;
      lastTimeRef.current = now;
    }

    if (controlsRef.current && autoRotate) {
      controlsRef.current.update();
    }
  });

  const bgColor = backgroundType === 'black' ? '#000000' : '#050510';

  return (
    <>
      <color attach="background" args={[bgColor]} />
      <fog attach="fog" args={[bgColor, 20, 80]} />
      <ambientLight intensity={0.1} />

      <StarBackground />
      <CoreGlow />
      <NebulaParticles key={useNebulaStore.getState().particleCount + '-' + useNebulaStore.getState().armCount} />

      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={30}
        autoRotate={autoRotate}
        autoRotateSpeed={0.5}
      />

      {bloomEnabled && (
        <EffectComposer>
          <Bloom
            luminanceThreshold={0.2}
            luminanceSmoothing={0.9}
            height={300}
            intensity={1.5}
          />
        </EffectComposer>
      )}
    </>
  );
}

function createFlareTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  
  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)');
  gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.3)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

interface NebulaSceneProps {
  onReady?: (gl: THREE.WebGLRenderer) => void;
}

export function NebulaScene({ onReady }: NebulaSceneProps) {
  const { backgroundType } = useNebulaStore();
  const bgColor = backgroundType === 'black' ? '#000000' : '#050510';

  return (
    <Canvas
      camera={{ position: [0, 0, 15], fov: 60, near: 0.1, far: 1000 }}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: true,
      }}
      dpr={[1, 2]}
      style={{ background: bgColor }}
    >
      <SceneContent onGlReady={onReady} />
    </Canvas>
  );
}

export { takeScreenshot };
