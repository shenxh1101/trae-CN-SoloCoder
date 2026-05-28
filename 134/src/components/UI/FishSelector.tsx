import { useState } from 'react';
import { useOceanStore } from '@/store/useOceanStore';
import { FISH_TEMPLATES } from '@/data/fishData';
import { FishData } from '@/types';

export default function FishSelector() {
  const [selected, setSelected] = useState<string>('');
  const setSelectedFish = useOceanStore((state) => state.setSelectedFish);

  const handleSelect = (value: string) => {
    setSelected(value);
    if (value === '') {
      setSelectedFish(null);
      return;
    }
    const template = FISH_TEMPLATES.find(f => f.type === value);
    if (template) {
      const testFish: FishData = {
        ...template,
        id: 'test-fish',
        pathOffset: 0,
      };
      setSelectedFish(testFish);
    }
  };

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-40 glass rounded-lg px-4 py-3 flex items-center gap-3" data-testid="fish-selector">
      <label className="text-sm text-cyan-300 font-medium whitespace-nowrap">🐠 测试选鱼:</label>
      <select
        value={selected}
        onChange={(e) => handleSelect(e.target.value)}
        className="bg-slate-800/80 text-white text-sm px-3 py-2 rounded-lg border border-cyan-500/30 focus:outline-none focus:border-cyan-400 min-w-[180px]"
        data-testid="fish-select"
      >
        <option value="">-- 选择鱼 --</option>
        {FISH_TEMPLATES.map((fish) => (
          <option key={fish.type} value={fish.type}>
            {fish.name}
          </option>
        ))}
      </select>
      <button
        onClick={() => handleSelect('')}
        className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-slate-700/50"
      >
        关闭
      </button>
    </div>
  );
}
