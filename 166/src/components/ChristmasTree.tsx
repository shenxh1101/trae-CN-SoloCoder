import { useRef, useMemo } from 'react';
import * as THREE from 'three';

interface ChristmasTreeProps {
  position: [number, number, number];
}

const CONE_LAYERS = [
  { radius: 1.6, height: 1.8, y: 1.8 },
  { radius: 1.2, height: 1.6, y: 3.2 },
  { radius: 0.8, height: 1.4, y: 4.4 },
];

const ORNAMENT_COLORS = ['#e63946', '#ffd700', '#457b9d'];

function generateOrnaments() {
  const ornaments: { position: [number, number, number]; color: string }[] = [];
  CONE_LAYERS.forEach((layer, layerIndex) => {
    const count = 5 - layerIndex;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + layerIndex * 0.5;
      const heightFraction = 0.3 + Math.random() * 0.5;
      const radiusAtHeight = layer.radius * (1 - heightFraction) * 0.85;
      const x = Math.cos(angle) * radiusAtHeight;
      const z = Math.sin(angle) * radiusAtHeight;
      const y = layer.y - layer.height / 2 + heightFraction * layer.height;
      ornaments.push({
        position: [x, y, z],
        color: ORNAMENT_COLORS[(layerIndex + i) % ORNAMENT_COLORS.length],
      });
    }
  });
  return ornaments;
}

export default function ChristmasTree({ position }: ChristmasTreeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const ornaments = useMemo(() => generateOrnaments(), []);

  return (
    <group ref={groupRef} position={position}>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.2, 0.3, 1, 8]} />
        <meshStandardMaterial color="#5c3a1e" />
      </mesh>

      {CONE_LAYERS.map((layer, i) => (
        <mesh key={i} position={[0, layer.y, 0]}>
          <coneGeometry args={[layer.radius, layer.height, 16]} />
          <meshStandardMaterial color="#2d6a4f" />
        </mesh>
      ))}

      {ornaments.map((ornament, i) => (
        <mesh key={`o-${i}`} position={ornament.position}>
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshStandardMaterial
            color={ornament.color}
            emissive={ornament.color}
            emissiveIntensity={0.3}
          />
        </mesh>
      ))}

      <mesh position={[0, 5.4, 0]} rotation={[0, Math.PI / 4, 0]}>
        <octahedronGeometry args={[0.25, 0]} />
        <meshStandardMaterial
          color="#ffd700"
          emissive="#ffd700"
          emissiveIntensity={0.8}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
    </group>
  );
}
