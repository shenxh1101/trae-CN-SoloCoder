import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { SimplexNoise } from '@/utils/simplexNoise';
import { takeScreenshot, exportOBJ, GIFRecorder } from '@/utils/exportUtils';
import { useStore } from '@/store/useStore';

export interface Scene3DHandle {
  takeScreenshot: () => void;
  exportOBJ: () => void;
  startRecording: (onComplete?: () => void) => void;
  stopRecording: () => Promise<void>;
  getVertexCount: () => number;
  getFps: () => number;
}

export const Scene3D = forwardRef<Scene3DHandle>((_, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const timeRef = useRef(0);
  const noiseRef = useRef<SimplexNoise | null>(null);
  const originalPositionsRef = useRef<Float32Array | null>(null);
  const gifRecorderRef = useRef<GIFRecorder | null>(null);
  const fpsRef = useRef({ count: 0, lastTime: 0, value: 0 });
  const reflectorRef = useRef<Reflector | null>(null);

  const fluidParamsRef = useRef(useStore.getState().fluidParams);
  const envSettingsRef = useRef(useStore.getState().envSettings);
  const audioAmplitudeRef = useRef(useStore.getState().audioAmplitude);

  useEffect(() => {
    const unsub1 = useStore.subscribe((state) => {
      fluidParamsRef.current = state.fluidParams;
      envSettingsRef.current = state.envSettings;
      audioAmplitudeRef.current = state.audioAmplitude;
    });
    return unsub1;
  }, []);

  const { setRecordProgress } = useStore();
  const smoothness = useStore((s) => s.fluidParams.smoothness);

  useImperativeHandle(ref, () => ({
    takeScreenshot: () => {
      if (rendererRef.current) {
        takeScreenshot(rendererRef.current);
      }
    },
    exportOBJ: () => {
      if (meshRef.current) {
        exportOBJ(meshRef.current);
      }
    },
    startRecording: (onComplete?: () => void) => {
      if (rendererRef.current && !gifRecorderRef.current?.isActive()) {
        gifRecorderRef.current = new GIFRecorder(rendererRef.current, 10);
        gifRecorderRef.current.start(() => {
          setRecordProgress(0);
          onComplete?.();
        });
      }
    },
    stopRecording: async () => {
      if (gifRecorderRef.current) {
        await gifRecorderRef.current.save();
        gifRecorderRef.current = null;
      }
    },
    getVertexCount: () => {
      return meshRef.current?.geometry.attributes.position.count || 0;
    },
    getFps: () => {
      return fpsRef.current.value;
    },
  }));

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(envSettingsRef.current.backgroundColor);
    scene.fog = new THREE.FogExp2(0x0a0a0f, 0.02);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(3, 2, 5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = envSettingsRef.current.autoRotate;
    controls.autoRotateSpeed = 0.5;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    ambientLight.name = 'ambientLight';
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0x00ffff, 1, 100);
    pointLight1.position.set(5, 5, 5);
    pointLight1.name = 'pointLight1';
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xff00ff, 1, 100);
    pointLight2.position.set(-5, -5, 5);
    pointLight2.name = 'pointLight2';
    scene.add(pointLight2);

    const segments = Math.floor(32 + (fluidParamsRef.current.smoothness / 100) * 64);
    const geometry = new THREE.IcosahedronGeometry(1.5, segments);
    const material = new THREE.MeshStandardMaterial({
      color: 0x00ffff,
      metalness: 0.9,
      roughness: 0.15,
      envMapIntensity: 1,
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    meshRef.current = mesh;

    const positions = geometry.attributes.position.array as Float32Array;
    originalPositionsRef.current = new Float32Array(positions);

    noiseRef.current = new SimplexNoise(12345);

    const reflectorGeometry = new THREE.PlaneGeometry(30, 30);
    const reflector = new Reflector(reflectorGeometry, {
      clipBias: 0.003,
      textureWidth: 1024,
      textureHeight: 1024,
      color: 0x1a1a2e,
    });
    reflector.rotation.x = -Math.PI / 2;
    reflector.position.y = -3.5;
    reflector.name = 'reflectorGround';
    reflector.visible = envSettingsRef.current.background === 'mirror';
    reflector.matrixAutoUpdate = true;
    scene.add(reflector);
    reflectorRef.current = reflector;

    const animate = (currentTime: number) => {
      animationIdRef.current = requestAnimationFrame(animate);

      fpsRef.current.count++;
      if (currentTime - fpsRef.current.lastTime >= 1000) {
        fpsRef.current.value = fpsRef.current.count;
        fpsRef.current.count = 0;
        fpsRef.current.lastTime = currentTime;
      }

      const fp = fluidParamsRef.current;
      const audioAmp = audioAmplitudeRef.current;

      const deltaTime = 1 / 60;
      const speedMultiplier = fp.flowSpeed / 50;
      timeRef.current += deltaTime * speedMultiplier * 0.5;

      const audioMod = 1 + audioAmp * 3;

      if (meshRef.current && noiseRef.current && originalPositionsRef.current) {
        const positions = meshRef.current.geometry.attributes.position.array as Float32Array;
        const originalPositions = originalPositionsRef.current;
        const noise = noiseRef.current;
        const time = timeRef.current;
        const amplitude = fp.amplitude * audioMod;

        if (fp.mode === 'turbulence') {
          for (let i = 0; i < positions.length; i += 3) {
            const x = originalPositions[i];
            const y = originalPositions[i + 1];
            const z = originalPositions[i + 2];

            const noiseScale = 1.5;
            const noiseVal1 = noise.noise3D(x * noiseScale + time, y * noiseScale, z * noiseScale);
            const noiseVal2 = noise.noise3D(x * noiseScale * 2, y * noiseScale * 2 + time * 0.5, z * noiseScale * 2) * 0.5;
            const noiseVal3 = noise.noise3D(x * noiseScale * 4, y * noiseScale * 4, z * noiseScale * 4 + time * 0.25) * 0.25;

            const totalNoise = (noiseVal1 + noiseVal2 + noiseVal3) * amplitude * 0.4;

            const len = Math.sqrt(x * x + y * y + z * z);
            const safeLen = len < 0.001 ? 0.001 : len;
            const nx = x / safeLen;
            const ny = y / safeLen;
            const nz = z / safeLen;

            positions[i] = x + nx * totalNoise;
            positions[i + 1] = y + ny * totalNoise;
            positions[i + 2] = z + nz * totalNoise;
          }
        } else {
          const breathePhase = Math.sin(time * 0.8) * 0.3 + 0.7;

          for (let i = 0; i < positions.length; i += 3) {
            const x = originalPositions[i];
            const y = originalPositions[i + 1];
            const z = originalPositions[i + 2];

            const len = Math.sqrt(x * x + y * y + z * z);
            const safeLen = len < 0.001 ? 0.001 : len;
            const nx = x / safeLen;
            const ny = y / safeLen;
            const nz = z / safeLen;

            const detailNoise = noise.noise3D(x * 3 + time * 0.3, y * 3, z * 3) * 0.15;
            const displacement = breathePhase * amplitude * 0.5 + detailNoise * amplitude;

            positions[i] = x + nx * displacement;
            positions[i + 1] = y + ny * displacement;
            positions[i + 2] = z + nz * displacement;
          }
        }

        meshRef.current.geometry.attributes.position.needsUpdate = true;
        meshRef.current.geometry.computeVertexNormals();

        const hue = (time * fp.hueSpeed * 20) % 360;
        (meshRef.current.material as THREE.MeshStandardMaterial).color.setHSL(hue / 360, 0.9, 0.6);
      }

      if (gifRecorderRef.current && gifRecorderRef.current.isActive()) {
        gifRecorderRef.current.captureFrame();
        setRecordProgress(gifRecorderRef.current.getProgress());
        if (gifRecorderRef.current.isComplete()) {
          const recorder = gifRecorderRef.current;
          gifRecorderRef.current = null;
          recorder.save();
        }
      }

      const es = envSettingsRef.current;

      if (sceneRef.current) {
        const al = sceneRef.current.getObjectByName('ambientLight') as THREE.AmbientLight;
        if (al) al.intensity = es.ambientLight ? 0.4 : 0.05;

        const pl1 = sceneRef.current.getObjectByName('pointLight1') as THREE.PointLight;
        const pl2 = sceneRef.current.getObjectByName('pointLight2') as THREE.PointLight;
        if (pl1 && pl2) {
          pl1.intensity = es.pointLight ? 1 : 0;
          pl2.intensity = es.pointLight ? 1 : 0;
        }

        if (reflectorRef.current) {
          reflectorRef.current.visible = es.background === 'mirror';
        }

        sceneRef.current.background = new THREE.Color(es.backgroundColor);
      }

      controls.autoRotate = es.autoRotate;
      controls.update();
      renderer.render(scene, camera);
    };

    animate(0);

    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      geometry.dispose();
      material.dispose();
      reflectorGeometry.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  useEffect(() => {
    if (!meshRef.current || !originalPositionsRef.current) return;

    const fp = fluidParamsRef.current;
    const segments = Math.floor(32 + (fp.smoothness / 100) * 64);
    const geometry = new THREE.IcosahedronGeometry(1.5, segments);

    meshRef.current.geometry.dispose();
    meshRef.current.geometry = geometry;

    const positions = geometry.attributes.position.array as Float32Array;
    originalPositionsRef.current = new Float32Array(positions);
  }, [smoothness]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ position: 'absolute', inset: 0 }}
    />
  );
});

Scene3D.displayName = 'Scene3D';
