import { useMemo } from 'react';
import * as THREE from 'three';
import { useSceneStore } from '../../store/useSceneStore';

export default function GridHelper() {
  const showGrid = useSceneStore((state) => state.showGrid);

  const gridLines = useMemo(() => {
    const lines: { start: [number, number, number]; end: [number, number, number] }[] = [];
    const radius = 2.0;
    const latSegments = 9;
    const lngSegments = 12;

    for (let i = 1; i < latSegments; i++) {
      const lat = -90 + (180 / latSegments) * i;
      const phi = (90 - lat) * (Math.PI / 180);
      const points: [number, number, number][] = [];
      for (let j = 0; j <= 64; j++) {
        const theta = (j / 64) * Math.PI * 2;
        points.push([
          -radius * Math.sin(phi) * Math.cos(theta),
          radius * Math.cos(phi),
          radius * Math.sin(phi) * Math.sin(theta),
        ]);
      }
      for (let j = 0; j < points.length - 1; j++) {
        lines.push({ start: points[j], end: points[j + 1] });
      }
    }

    for (let i = 0; i < lngSegments; i++) {
      const lng = -180 + (360 / lngSegments) * i;
      const points: [number, number, number][] = [];
      for (let j = 0; j <= 64; j++) {
        const phi = (j / 64) * Math.PI;
        const theta = (lng + 180) * (Math.PI / 180);
        points.push([
          -radius * Math.sin(phi) * Math.cos(theta),
          radius * Math.cos(phi),
          radius * Math.sin(phi) * Math.sin(theta),
        ]);
      }
      for (let j = 0; j < points.length - 1; j++) {
        lines.push({ start: points[j], end: points[j + 1] });
      }
    }

    return lines;
  }, []);

  if (!showGrid) return null;

  return (
    <group>
      {gridLines.map((line, index) => (
        <line key={index}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[new Float32Array([...line.start, ...line.end]), 3]}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#4a90d9" transparent opacity={0.3} />
        </line>
      ))}
    </group>
  );
}
