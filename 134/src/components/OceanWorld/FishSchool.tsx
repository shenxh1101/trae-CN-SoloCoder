import { useEffect, useMemo } from 'react';
import Fish from './Fish';
import { FishData } from '@/types';
import { generateFishSchool, FISH_COUNT } from '@/data/fishData';
import { useOceanStore } from '@/store/useOceanStore';

interface FishSchoolProps {
  count?: number;
}

export default function FishSchool({ count = FISH_COUNT }: FishSchoolProps) {
  const setFishCount = useOceanStore((state) => state.setFishCount);
  const setSelectedFish = useOceanStore((state) => state.setSelectedFish);

  const fishes = useMemo(() => generateFishSchool(count), [count]);

  useEffect(() => {
    setFishCount(fishes.length);
  }, [fishes.length, setFishCount]);

  const handleFishClick = (fish: FishData) => {
    setSelectedFish(fish);
  };

  return (
    <group>
      {fishes.map((fish) => (
        <Fish key={fish.id} data={fish} onClick={handleFishClick} />
      ))}
    </group>
  );
}
