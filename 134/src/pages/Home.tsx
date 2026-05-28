import OceanWorld from '@/components/OceanWorld/OceanWorld';
import ControlPanel from '@/components/UI/ControlPanel';
import FishInfo from '@/components/UI/FishInfo';
import StatsBar from '@/components/UI/StatsBar';
import FishSelector from '@/components/UI/FishSelector';
import { useAudio } from '@/hooks/useAudio';

export default function Home() {
  useAudio();

  return (
    <div className="w-full h-full relative">
      <OceanWorld />
      <StatsBar />
      <ControlPanel />
      <FishInfo />
      <FishSelector />
      
      <div className="fixed bottom-4 left-4 z-40 glass rounded-lg px-4 py-2 text-sm text-gray-400">
        <p>🖱️ 拖拽旋转 | 🔍 滚轮缩放 | 🐠 点击鱼查看详情</p>
      </div>
    </div>
  );
}