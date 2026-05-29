import { useMemo } from 'react';
import { Line, Text } from '@react-three/drei';
import * as THREE from 'three';

interface ElectronOrbitProps {
  radius: number;
  inclination: number;
  color: string;
  highlighted: boolean;
  orbitIndex: number;
  eccentricity: number;
}

export default function ElectronOrbit({ radius, inclination, color, highlighted, orbitIndex, eccentricity }: ElectronOrbitProps) {

  const points = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const segments = 128;
    const a = radius;
    const b = radius * (1 - eccentricity);

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const x = a * Math.cos(angle);
      const z = b * Math.sin(angle);
      pts.push(new THREE.Vector3(x, 0, z));
    }
    return pts;
  }, [radius]);

  const labelPosition = useMemo(() => {
    return new THREE.Vector3(radius + 0.3, 0, 0);
  }, [radius]);

  return (
    <group rotation={[inclination, 0, 0]}>
      <Line
        points={points}
        color={color}
        lineWidth={highlighted ? 2.5 : 1}
        opacity={highlighted ? 0.85 : 0.3}
        transparent
      />

      {highlighted && (
        <Line
          points={points}
          color={color}
          lineWidth={4}
          opacity={0.15}
          transparent
        />
      )}

      {highlighted && (
        <Text
          position={labelPosition}
          fontSize={0.35}
          color={color}
          anchorX="left"
          anchorY="middle"
          outlineWidth={0.04}
          outlineColor="#000000"
        >
          {`轨道 ${orbitIndex + 1}`}
        </Text>
      )}
    </group>
  );
}
