import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useCloudStore } from '@/store/useCloudStore';

interface BirdProps {
  count: number;
  color: string;
  speed: number;
}

function Birds({ count, color, speed }: BirdProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const materialRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const targetColor = useRef(new THREE.Color(color));

  const birdData = useMemo(() => {
    const data = [];
    for (let i = 0; i < count; i++) {
      data.push({
        position: new THREE.Vector3(
          (Math.random() - 0.5) * 120,
          Math.random() * 15 + 8,
          (Math.random() - 0.5) * 120
        ),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * speed,
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * speed
        ),
        phase: Math.random() * Math.PI * 2,
        wingPhase: Math.random() * Math.PI * 2,
      });
    }
    return data;
  }, [count, speed]);

  useFrame((state) => {
    if (!meshRef.current || !materialRef.current) return;
    const time = state.clock.elapsedTime;

    for (let i = 0; i < count; i++) {
      const bird = birdData[i];
      bird.position.x += bird.velocity.x * 0.016;
      bird.position.y += Math.sin(time * 2 + bird.phase) * 0.01;
      bird.position.z += bird.velocity.z * 0.016;

      if (bird.position.x > 80) bird.position.x = -80;
      if (bird.position.x < -80) bird.position.x = 80;
      if (bird.position.z > 80) bird.position.z = -80;
      if (bird.position.z < -80) bird.position.z = 80;

      const wingAngle = Math.sin(time * 8 + bird.wingPhase) * 0.3;

      dummy.position.copy(bird.position);
      dummy.rotation.y = Math.atan2(bird.velocity.x, bird.velocity.z);
      dummy.rotation.z = wingAngle;
      dummy.scale.set(0.3, 0.3, 0.3);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    materialRef.current.color.lerp(targetColor.current, 0.05);
  });

  const birdGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.quadraticCurveTo(0.5, 0.5, 2, 0);
    shape.quadraticCurveTo(0.5, -0.5, 0, 0);
    return new THREE.ShapeGeometry(shape);
  }, []);

  return (
    <instancedMesh ref={meshRef} args={[birdGeometry, undefined, count]}>
      <meshBasicMaterial
        ref={materialRef}
        color={color}
        side={THREE.DoubleSide}
        transparent
        opacity={0.8}
      />
    </instancedMesh>
  );
}

interface ButterflyProps {
  count: number;
  color: string;
  speed: number;
}

function Butterflies({ count, color, speed }: ButterflyProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const materialRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const targetColor = useRef(new THREE.Color(color));

  const butterflyData = useMemo(() => {
    const data = [];
    for (let i = 0; i < count; i++) {
      data.push({
        position: new THREE.Vector3(
          (Math.random() - 0.5) * 80,
          Math.random() * 10 + 3,
          (Math.random() - 0.5) * 80
        ),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * speed,
          (Math.random() - 0.5) * 0.2,
          (Math.random() - 0.5) * speed
        ),
        phase: Math.random() * Math.PI * 2,
        wingPhase: Math.random() * Math.PI * 2,
      });
    }
    return data;
  }, [count, speed]);

  useFrame((state) => {
    if (!meshRef.current || !materialRef.current) return;
    const time = state.clock.elapsedTime;

    for (let i = 0; i < count; i++) {
      const b = butterflyData[i];
      b.position.x += Math.sin(time * 0.5 + b.phase) * b.velocity.x * 0.03;
      b.position.y += Math.sin(time * 1.5 + b.phase) * 0.01;
      b.position.z += Math.cos(time * 0.3 + b.phase) * b.velocity.z * 0.03;

      const wingAngle = Math.sin(time * 10 + b.wingPhase) * 0.8;

      dummy.position.copy(b.position);
      dummy.rotation.y = Math.atan2(b.velocity.x, b.velocity.z);
      dummy.rotation.x = wingAngle * 0.2;
      dummy.scale.set(0.15, 0.15, 0.15);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    materialRef.current.color.lerp(targetColor.current, 0.05);
  });

  const butterflyGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.bezierCurveTo(0.3, 0.8, 1.2, 1.0, 1.5, 0.3);
    shape.bezierCurveTo(1.2, -0.3, 0.3, -0.2, 0, 0);
    return new THREE.ShapeGeometry(shape);
  }, []);

  return (
    <instancedMesh ref={meshRef} args={[butterflyGeometry, undefined, count]}>
      <meshBasicMaterial
        ref={materialRef}
        color={color}
        side={THREE.DoubleSide}
        transparent
        opacity={0.7}
      />
    </instancedMesh>
  );
}

export default function CreatureParticles() {
  const { analysis, showBirds, showButterflies } = useCloudStore();
  const { particles, keywords } = analysis;

  const hasBirdKeyword = keywords.some(k => k.particleType === 'bird');
  const hasButterflyKeyword = keywords.some(k => k.particleType === 'butterfly');

  const displayBirds = hasBirdKeyword && showBirds;
  const displayButterflies = hasButterflyKeyword && showButterflies;

  return (
    <group>
      {displayBirds && (
        <Birds
          count={particles.type === 'bird' ? particles.count : 30}
          color={particles.type === 'bird' ? particles.color : '#1a1a2e'}
          speed={particles.type === 'bird' ? particles.speed : 1.5}
        />
      )}
      {displayButterflies && (
        <Butterflies
          count={particles.type === 'butterfly' ? particles.count : 50}
          color={particles.type === 'butterfly' ? particles.color : '#FFB6C1'}
          speed={particles.type === 'butterfly' ? particles.speed : 0.5}
        />
      )}
    </group>
  );
}
