import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useConfigStore } from '@/store/useConfigStore';
import { generateParticlePositions, interpolateColor } from '@/utils/textParser';
import { ParticleShape } from '@/types';

const TRAIL_LENGTH = 8;

export default function Scene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const particlesRef = useRef<THREE.InstancedMesh | null>(null);
  const trailParticlesRef = useRef<THREE.InstancedMesh[]>([]);
  const starsRef = useRef<THREE.Points | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const isScatteringRef = useRef(false);
  const scatterProgressRef = useRef(0);
  const originalPositionsRef = useRef<THREE.Vector3[]>([]);
  const scatterPositionsRef = useRef<THREE.Vector3[]>([]);
  const historyPositionsRef = useRef<THREE.Vector3[][]>([]);
  const dummyRef = useRef(new THREE.Object3D());
  const colorDataRef = useRef<Float32Array | null>(null);

  const text = useConfigStore((state) => state.text);
  const particleSize = useConfigStore((state) => state.particleSize);
  const particleShape = useConfigStore((state) => state.particleShape);
  const thickness = useConfigStore((state) => state.thickness);
  const fontWeight = useConfigStore((state) => state.fontWeight);
  const colorGradient = useConfigStore((state) => state.colorGradient);
  const background = useConfigStore((state) => state.background);
  const trailEffect = useConfigStore((state) => state.trailEffect);
  const autoRotate = useConfigStore((state) => state.autoRotate);
  const setParticleCount = useConfigStore((state) => state.setParticleCount);

  const getParticleGeometry = useCallback((shape: ParticleShape) => {
    switch (shape) {
      case 'sphere':
        return new THREE.SphereGeometry(0.5, 6, 6);
      case 'cube':
        return new THREE.BoxGeometry(0.8, 0.8, 0.8);
      case 'tetrahedron':
        return new THREE.TetrahedronGeometry(0.6);
      default:
        return new THREE.SphereGeometry(0.5, 6, 6);
    }
  }, []);

  const createStarfield = useCallback((scene: THREE.Scene) => {
    if (starsRef.current) {
      scene.remove(starsRef.current);
      starsRef.current.geometry.dispose();
      (starsRef.current.material as THREE.Material).dispose();
    }

    const starsGeometry = new THREE.BufferGeometry();
    const starCount = 2000;
    const positions = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 200;
      positions[i + 1] = (Math.random() - 0.5) * 200;
      positions[i + 2] = (Math.random() - 0.5) * 200;
    }

    starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const starsMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.5,
      transparent: true,
      opacity: 0.8,
    });

    const stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);
    starsRef.current = stars;
  }, []);

  const clearTrails = useCallback((scene: THREE.Scene) => {
    trailParticlesRef.current.forEach(trail => {
      scene.remove(trail);
      trail.geometry.dispose();
      (trail.material as THREE.Material).dispose();
    });
    trailParticlesRef.current = [];
  }, []);

  const createTrails = useCallback((scene: THREE.Scene, count: number, geometry: THREE.BufferGeometry) => {
    clearTrails(scene);

    for (let i = 0; i < TRAIL_LENGTH; i++) {
      const opacity = (1 - i / TRAIL_LENGTH) * 0.4;
      const trailMaterial = new THREE.MeshStandardMaterial({
        emissive: 0xffffff,
        emissiveIntensity: 0.3,
        roughness: 0.3,
        metalness: 0.7,
        transparent: true,
        opacity: opacity,
      });

      const trailMesh = new THREE.InstancedMesh(geometry, trailMaterial, count);
      trailMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      scene.add(trailMesh);
      trailParticlesRef.current.push(trailMesh);
    }
  }, [clearTrails]);

  const updateParticles = useCallback(() => {
    if (!sceneRef.current) return;

    const scene = sceneRef.current;

    if (particlesRef.current) {
      scene.remove(particlesRef.current);
      particlesRef.current.geometry.dispose();
      (particlesRef.current.material as THREE.Material).dispose();
    }

    const positions = generateParticlePositions(
      text,
      fontWeight,
      thickness,
      1
    );

    originalPositionsRef.current = positions.map(p => p.clone());
    scatterPositionsRef.current = positions.map(() => new THREE.Vector3(
      (Math.random() - 0.5) * 100,
      (Math.random() - 0.5) * 100,
      (Math.random() - 0.5) * 100
    ));

    historyPositionsRef.current = positions.map(p => {
      const history: THREE.Vector3[] = [];
      for (let i = 0; i < TRAIL_LENGTH; i++) {
        history.push(p.clone());
      }
      return history;
    });

    setParticleCount(positions.length);

    if (positions.length === 0) {
      clearTrails(scene);
      return;
    }

    const geometry = getParticleGeometry(particleShape);
    const material = new THREE.MeshStandardMaterial({
      emissive: 0xffffff,
      emissiveIntensity: 0.5,
      roughness: 0.3,
      metalness: 0.7,
    });

    const instancedMesh = new THREE.InstancedMesh(geometry, material, positions.length);
    instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    const colors = new Float32Array(positions.length * 3);
    const maxY = Math.max(...positions.map(p => p.y));
    const minY = Math.min(...positions.map(p => p.y));
    const yRange = maxY - minY || 1;

    positions.forEach((pos, i) => {
      const t = (pos.y - minY) / yRange;
      const color = interpolateColor(colorGradient.top, colorGradient.bottom, t);
      
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      dummyRef.current.position.copy(pos);
      dummyRef.current.scale.setScalar(particleSize);
      dummyRef.current.updateMatrix();
      instancedMesh.setMatrixAt(i, dummyRef.current.matrix);
    });

    colorDataRef.current = colors;
    instancedMesh.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
    instancedMesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    
    scene.add(instancedMesh);
    particlesRef.current = instancedMesh;

    if (trailEffect) {
      createTrails(scene, positions.length, geometry);
    } else {
      clearTrails(scene);
    }
  }, [text, fontWeight, thickness, particleShape, particleSize, colorGradient, trailEffect, setParticleCount, getParticleGeometry, createTrails, clearTrails]);

  const triggerScatterAnimation = useCallback(() => {
    if (isScatteringRef.current) return;
    isScatteringRef.current = true;
    scatterProgressRef.current = 0;
  }, []);

  const updateTrailPositions = useCallback((currentPositions: THREE.Vector3[]) => {
    if (!trailEffect || trailParticlesRef.current.length === 0) return;

    currentPositions.forEach((pos, i) => {
      const history = historyPositionsRef.current[i];
      if (history) {
        for (let h = TRAIL_LENGTH - 1; h > 0; h--) {
          history[h].copy(history[h - 1]);
        }
        history[0].copy(pos);
      }
    });

    trailParticlesRef.current.forEach((trailMesh, trailIndex) => {
      historyPositionsRef.current.forEach((history, i) => {
        const pos = history[trailIndex + 1] || history[history.length - 1];
        dummyRef.current.position.copy(pos);
        const scale = particleSize * (1 - (trailIndex + 1) / TRAIL_LENGTH) * 0.8;
        dummyRef.current.scale.setScalar(Math.max(scale, 0.05));
        dummyRef.current.updateMatrix();
        trailMesh.setMatrixAt(i, dummyRef.current.matrix);
      });
      trailMesh.instanceMatrix.needsUpdate = true;

      if (colorDataRef.current) {
        const trailColors = new Float32Array(colorDataRef.current);
        trailMesh.instanceColor = new THREE.InstancedBufferAttribute(trailColors, 3);
        trailMesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
      }
    });
  }, [trailEffect, particleSize]);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 30;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controlsRef.current = controls;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0xffffff, 1, 100);
    pointLight1.position.set(10, 10, 10);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x4facfe, 0.5, 100);
    pointLight2.position.set(-10, -10, 10);
    scene.add(pointLight2);

    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);

      if (particlesRef.current && autoRotate && !isScatteringRef.current) {
        particlesRef.current.rotation.y += 0.005;
        trailParticlesRef.current.forEach(trail => {
          trail.rotation.y = particlesRef.current!.rotation.y;
        });
      }

      if (isScatteringRef.current && particlesRef.current) {
        scatterProgressRef.current += 0.02;
        
        if (scatterProgressRef.current >= 1) {
          scatterProgressRef.current = 0;
          isScatteringRef.current = false;
        }

        const t = scatterProgressRef.current;
        const easeT = t < 0.5 
          ? 2 * t * t 
          : 1 - Math.pow(-2 * t + 2, 2) / 2;
        
        const scatterT = t < 0.5 ? easeT * 2 : (1 - easeT) * 2;

        const currentPositions: THREE.Vector3[] = [];
        originalPositionsRef.current.forEach((originalPos, i) => {
          const scatterPos = scatterPositionsRef.current[i];
          const currentPos = new THREE.Vector3().lerpVectors(
            originalPos,
            scatterPos,
            scatterT
          );
          currentPositions.push(currentPos);

          dummyRef.current.position.copy(currentPos);
          dummyRef.current.scale.setScalar(particleSize);
          dummyRef.current.updateMatrix();
          particlesRef.current!.setMatrixAt(i, dummyRef.current.matrix);
        });

        particlesRef.current.instanceMatrix.needsUpdate = true;
        updateTrailPositions(currentPositions);
      } else if (autoRotate && !isScatteringRef.current) {
        const currentPositions = originalPositionsRef.current;
        updateTrailPositions(currentPositions);
      }

      if (starsRef.current && background === 'stars') {
        starsRef.current.rotation.y += 0.0002;
      }

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  useEffect(() => {
    if (!sceneRef.current) return;

    const scene = sceneRef.current;

    switch (background) {
      case 'black':
        scene.background = new THREE.Color(0x000000);
        if (starsRef.current) {
          scene.remove(starsRef.current);
          starsRef.current = null;
        }
        break;
      case 'white':
        scene.background = new THREE.Color(0xf5f5f5);
        if (starsRef.current) {
          scene.remove(starsRef.current);
          starsRef.current = null;
        }
        break;
      case 'stars':
        scene.background = new THREE.Color(0x000011);
        createStarfield(scene);
        break;
    }
  }, [background, createStarfield]);

  useEffect(() => {
    updateParticles();
  }, [text, particleShape, thickness, fontWeight, colorGradient, trailEffect, updateParticles]);

  useEffect(() => {
    if (!particlesRef.current) return;

    const positions = originalPositionsRef.current;
    positions.forEach((pos, i) => {
      dummyRef.current.position.copy(pos);
      dummyRef.current.scale.setScalar(particleSize);
      dummyRef.current.updateMatrix();
      particlesRef.current!.setMatrixAt(i, dummyRef.current.matrix);
    });
    particlesRef.current.instanceMatrix.needsUpdate = true;
  }, [particleSize]);

  useEffect(() => {
    (window as any).triggerScatterAnimation = triggerScatterAnimation;
    return () => {
      delete (window as any).triggerScatterAnimation;
    };
  }, [triggerScatterAnimation]);

  useEffect(() => {
    (window as any).takeScreenshot = () => {
      if (!rendererRef.current) return;
      const link = document.createElement('a');
      link.download = `particle-text-${Date.now()}.png`;
      link.href = rendererRef.current.domElement.toDataURL('image/png');
      link.click();
    };
    return () => {
      delete (window as any).takeScreenshot;
    };
  }, []);

  return <div ref={containerRef} className="w-full h-full" />;
}
