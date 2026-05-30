import { useRef, useCallback, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { WebGLRenderer } from 'three';
import { Galaxy } from './Galaxy';
import { BackgroundStars } from './BackgroundStars';
import { useGalaxyStore } from '../store/useGalaxyStore';

interface SceneContentProps {
  onGlReady: (gl: WebGLRenderer) => void;
}

function SceneContent({ onGlReady }: SceneContentProps) {
  const { gl, camera, scene } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const config = useGalaxyStore((state) => state.config);
  const galaxyRef = useGalaxyStore((state) => state.galaxyRef);
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());
  const autoRotateAngle = useRef(0);

  useEffect(() => {
    onGlReady(gl);
  }, [gl, onGlReady]);

  useEffect(() => {
    scene.background = new THREE.Color(0x0a0a1a);
    if (config.fogEnabled) {
      scene.fog = new THREE.FogExp2(0x0a0a1a, 0.008);
    } else {
      scene.fog = null;
    }
  }, [config.fogEnabled, scene]);

  useFrame((_, delta) => {
    if (config.autoRotate && controlsRef.current) {
      autoRotateAngle.current += delta * 0.2;
      const radius = 150;
      const height = 100;
      camera.position.x = Math.cos(autoRotateAngle.current) * radius;
      camera.position.z = Math.sin(autoRotateAngle.current) * radius;
      camera.position.y = height;
      camera.lookAt(0, 0, 0);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  });

  const handleClick = useCallback(
    (event: MouseEvent) => {
      const rect = gl.domElement.getBoundingClientRect();
      mouse.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.current.setFromCamera(mouse.current, camera);

      const galaxyObject = galaxyRef?.current;
      if (galaxyObject) {
        const intersects = raycaster.current.intersectObject(galaxyObject);
        if (intersects.length > 0) {
          const cameraAngle = {
            position: {
              x: camera.position.x.toFixed(2),
              y: camera.position.y.toFixed(2),
              z: camera.position.z.toFixed(2),
            },
            rotation: {
              x: ((camera.rotation.x * 180) / Math.PI).toFixed(2) + '°',
              y: ((camera.rotation.y * 180) / Math.PI).toFixed(2) + '°',
              z: ((camera.rotation.z * 180) / Math.PI).toFixed(2) + '°',
            },
          };

          console.log('=== 星系点击信息 ===');
          console.log('相机角度:', cameraAngle);
          console.log('星系参数:', config);
          console.log('==================');
        }
      }
    },
    [camera, galaxyRef, gl.domElement, config]
  );

  useEffect(() => {
    const canvas = gl.domElement;
    canvas.addEventListener('click', handleClick);
    return () => canvas.removeEventListener('click', handleClick);
  }, [gl.domElement, handleClick]);

  return (
    <>
      <ambientLight intensity={0.2} />
      <Galaxy />
      <BackgroundStars />
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.05}
        minDistance={20}
        maxDistance={500}
        enablePan={false}
        autoRotate={false}
      />
    </>
  );
}

interface GalaxySceneProps {
  onGlReady: (gl: WebGLRenderer) => void;
}

export function GalaxyScene({ onGlReady }: GalaxySceneProps) {
  const handleGlReady = useCallback(
    (gl: WebGLRenderer) => {
      onGlReady(gl);
    },
    [onGlReady]
  );

  return (
    <Canvas
      camera={{ position: [0, 100, 150], fov: 60, near: 0.1, far: 2000 }}
      gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }}
      style={{ width: '100vw', height: '100vh', background: '#0a0a1a' }}
    >
      <SceneContent onGlReady={handleGlReady} />
    </Canvas>
  );
}
