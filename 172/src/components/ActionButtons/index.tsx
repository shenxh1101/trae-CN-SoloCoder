import { Camera, RefreshCw } from 'lucide-react';
import { useScreenshot } from '../../hooks/useScreenshot';
import { useAtomStore } from '../../store/useAtomStore';

interface ActionButtonsProps {
  onResetView: () => void;
}

export default function ActionButtons({ onResetView }: ActionButtonsProps) {
  const takeScreenshot = useScreenshot();
  const { getCurrentElement } = useAtomStore();
  const element = getCurrentElement();

  const handleScreenshot = () => {
    takeScreenshot(`${element.name}-原子模型.png`);
  };

  return (
    <div className="flex gap-4">
      <button
        onClick={handleScreenshot}
        className="btn-glow glass-panel px-6 py-3 rounded-lg text-white flex items-center gap-2 hover:bg-space-blue/20 transition-all"
      >
        <Camera size={20} className="text-space-blue" />
        截图保存
      </button>
      
      <button
        onClick={onResetView}
        className="btn-glow glass-panel px-6 py-3 rounded-lg text-white flex items-center gap-2 hover:bg-space-blue/20 transition-all"
      >
        <RefreshCw size={20} className="text-space-blue" />
        重置视角
      </button>
    </div>
  );
}
