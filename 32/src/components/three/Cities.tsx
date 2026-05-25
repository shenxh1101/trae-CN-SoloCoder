import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSceneStore, City } from '../../store/useSceneStore';
import { latLngToVector3 } from '../../utils/coords';
import { majorCities } from '../../data/cities';

function CityMarker({ city, onPointerOver, onPointerOut }: {
  city: City;
  onPointerOver: (e: THREE.Event) => void;
  onPointerOut: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const position = useMemo(() => latLngToVector3(city.lat, city.lng, 2.02), [city]);

  useFrame(({ clock }) => {
    if (glowRef.current) {
      const scale = 1 + Math.sin(clock.getElapsedTime() * 2 + parseInt(city.id)) * 0.2;
      glowRef.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
      >
        <sphereGeometry args={[0.03, 16, 16]} />
        <meshBasicMaterial color="#ffd700" />
      </mesh>
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshBasicMaterial
          color="#ffd700"
          transparent
          opacity={0.3}
        />
      </mesh>
    </group>
  );
}

export default function Cities() {
  const setHoveredCity = useSceneStore((state) => state.setHoveredCity);
  const setMousePosition = useSceneStore((state) => state.setMousePosition);

  const handlePointerOver = (city: City) => (e: any) => {
    e.stopPropagation();
    setHoveredCity(city);
    setMousePosition({ x: e.nativeEvent.clientX, y: e.nativeEvent.clientY });
  };

  const handlePointerOut = () => {
    setHoveredCity(null);
  };

  return (
    <group>
      {majorCities.map((city) => (
        <CityMarker
          key={city.id}
          city={city}
          onPointerOver={handlePointerOver(city)}
          onPointerOut={handlePointerOut}
        />
      ))}
    </group>
  );
}
