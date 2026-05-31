import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { CloudPreset } from '@/types';
import { useCloudStore } from '@/store/useCloudStore';

interface CloudClusterProps {
  position: [number, number, number];
  preset: CloudPreset;
  color: string;
  flowDir: number[];
}

function CloudCluster({ position, preset, color, flowDir }: CloudClusterProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshesRef = useRef<THREE.Mesh[]>([]);
  const speed = useRef(Math.random() * 0.3 + 0.1);
  const targetColor = useRef(new THREE.Color(color));

  useEffect(() => {
    targetColor.current.set(color);
  }, [color]);

  const spheres = useMemo(() => {
    const items: { pos: [number, number, number]; scale: number; opacity: number }[] = [];
    const count = preset === 'cumulus' ? 12 : preset === 'cirrus' ? 6 : 8;

    for (let i = 0; i < count; i++) {
      if (preset === 'cumulus') {
        items.push({
          pos: [
            (Math.random() - 0.5) * 8,
            (Math.random() - 0.5) * 2 + 1,
            (Math.random() - 0.5) * 6,
          ],
          scale: Math.random() * 3 + 2,
          opacity: Math.random() * 0.3 + 0.15,
        });
      } else if (preset === 'cirrus') {
        items.push({
          pos: [
            (Math.random() - 0.5) * 20,
            (Math.random() - 0.5) * 0.5,
            (Math.random() - 0.5) * 2,
          ],
          scale: Math.random() * 8 + 4,
          opacity: Math.random() * 0.15 + 0.05,
        });
      } else {
        items.push({
          pos: [
            (Math.random() - 0.5) * 15,
            (Math.random() - 0.5) * 1,
            (Math.random() - 0.5) * 12,
          ],
          scale: Math.random() * 6 + 3,
          opacity: Math.random() * 0.2 + 0.1,
        });
      }
    }
    return items;
  }, [preset]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    groupRef.current.position.x += flowDir[0] * speed.current * delta;
    groupRef.current.position.z += flowDir[2] * speed.current * delta;

    if (groupRef.current.position.x > 100) groupRef.current.position.x = -100;
    if (groupRef.current.position.x < -100) groupRef.current.position.x = 100;
    if (groupRef.current.position.z > 100) groupRef.current.position.z = -100;
    if (groupRef.current.position.z < -100) groupRef.current.position.z = 100;

    meshesRef.current.forEach((mesh) => {
      const material = mesh.material as THREE.MeshStandardMaterial;
      if (material.color) {
        material.color.lerp(targetColor.current, 0.02);
      }
    });
  });

  return (
    <group ref={groupRef} position={position}>
      {spheres.map((s, i) => (
        <mesh
          key={i}
          position={s.pos}
          ref={(el) => { if (el) meshesRef.current[i] = el; }}
        >
          <sphereGeometry args={[s.scale, 16, 16]} />
          <meshStandardMaterial
            color={color}
            transparent
            opacity={s.opacity}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

interface CloudMistProps {
  preset: CloudPreset;
  color: string;
  flowDir: number[];
}

function CloudMist({ preset, color, flowDir }: CloudMistProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const targetColor = useRef(new THREE.Color(color));
  const count = preset === 'cumulus' ? 3000 : preset === 'cirrus' ? 2000 : 2500;

  useEffect(() => {
    targetColor.current.set(color);
  }, [color]);

  const [positions, velocities] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 200;
      pos[i * 3 + 1] = Math.random() * 15 + (preset === 'cirrus' ? 8 : 2);
      pos[i * 3 + 2] = (Math.random() - 0.5) * 200;
      vel[i * 3] = (Math.random() - 0.5) * 0.2;
      vel[i * 3 + 1] = (Math.random() - 0.5) * 0.05;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.2;
    }
    return [pos, vel];
  }, [count, preset]);

  const sizes = useMemo(() => {
    const s = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      s[i] = preset === 'cumulus' ? Math.random() * 2 + 0.5 : preset === 'cirrus' ? Math.random() * 3 + 1 : Math.random() * 1.5 + 0.5;
    }
    return s;
  }, [count, preset]);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    const posArr = pointsRef.current.geometry.attributes.position.array as Float32Array;
    const material = pointsRef.current.material as THREE.PointsMaterial;

    for (let i = 0; i < count; i++) {
      posArr[i * 3] += (velocities[i * 3] + flowDir[0] * 0.5) * delta;
      posArr[i * 3 + 1] += velocities[i * 3 + 1] * delta;
      posArr[i * 3 + 2] += (velocities[i * 3 + 2] + flowDir[2] * 0.5) * delta;

      if (posArr[i * 3] > 100) posArr[i * 3] = -100;
      if (posArr[i * 3] < -100) posArr[i * 3] = 100;
      if (posArr[i * 3 + 1] > 25) posArr[i * 3 + 1] = 2;
      if (posArr[i * 3 + 1] < 0) posArr[i * 3 + 1] = 20;
      if (posArr[i * 3 + 2] > 100) posArr[i * 3 + 2] = -100;
      if (posArr[i * 3 + 2] < -100) posArr[i * 3 + 2] = 100;
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;

    if (material.color) {
      material.color.lerp(targetColor.current, 0.02);
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={count}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={1.5}
        transparent
        opacity={0.3}
        depthWrite={false}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function getFlowDirection(dir: string): number[] {
  switch (dir) {
    case 'left-to-right': return [1, 0, 0];
    case 'right-to-left': return [-1, 0, 0];
    case 'toward-camera': return [0, 0, 1];
    case 'away-from-camera': return [0, 0, -1];
    default: return [0.5, 0, 0.2];
  }
}

export default function CloudSea() {
  const { analysis, cloudPreset } = useCloudStore();
  const flowDir = getFlowDirection(analysis.flowDirection);
  const cloudColor = analysis.lighting.ambientColor;

  const clusters = useMemo(() => {
    const items: { pos: [number, number, number] }[] = [];
    const numClusters = cloudPreset === 'cumulus' ? 25 : cloudPreset === 'cirrus' ? 15 : 20;
    for (let i = 0; i < numClusters; i++) {
      items.push({
        pos: [
          (Math.random() - 0.5) * 180,
          Math.random() * 8 + (cloudPreset === 'cirrus' ? 10 : 3),
          (Math.random() - 0.5) * 180,
        ],
      });
    }
    return items;
  }, [cloudPreset]);

  return (
    <group>
      {clusters.map((c, i) => (
        <CloudCluster
          key={i}
          position={c.pos}
          preset={cloudPreset}
          color={cloudColor}
          flowDir={flowDir}
        />
      ))}
      <CloudMist preset={cloudPreset} color={cloudColor} flowDir={flowDir} />
    </group>
  );
}
