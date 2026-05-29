import { useRef } from 'react';
import AtomScene from './components/AtomScene';
import ControlPanel from './components/ControlPanel';
import InfoPanel from './components/InfoPanel';
import ActionButtons from './components/ActionButtons';
import { useAtomStore } from './store/useAtomStore';
import { Atom } from 'lucide-react';

function App() {
  const controlsRef = useRef<any>(null);
  const { getCurrentElement } = useAtomStore();
  const element = getCurrentElement();

  const handleResetView = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  };

  return (
    <div className="w-full h-full relative overflow-hidden">
      <div className="absolute inset-0">
        <AtomScene controlsRef={controlsRef} />
      </div>

      <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-10">
        <h1 className="text-3xl font-orbitron font-bold text-white glow-text flex items-center gap-3">
          <Atom size={36} className="text-space-blue" />
          <span>3D 原子模型可视化</span>
          <span 
            className="text-xl px-3 py-1 rounded-lg"
            style={{ 
              backgroundColor: `${element.nucleusColor}33`,
              color: element.nucleusColor,
              border: `1px solid ${element.nucleusColor}66`
            }}
          >
            {element.symbol}
          </span>
        </h1>
      </div>

      <div className="absolute top-6 left-6 z-10">
        <InfoPanel />
      </div>

      <div className="absolute top-6 right-6 z-10">
        <ControlPanel />
      </div>

      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10">
        <ActionButtons onResetView={handleResetView} />
      </div>

      <div className="absolute bottom-4 left-4 z-10 text-gray-400 text-sm">
        <p>🖱️ 拖拽旋转 | 滚轮缩放 | 点击电子查看轨道</p>
      </div>
    </div>
  );
}

export default App;
