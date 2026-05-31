import CloudScene from '@/components/CloudScene';
import ControlPanel from '@/components/ControlPanel';
import PoemDisplay from '@/components/PoemDisplay';
import Toolbar from '@/components/Toolbar';
import AudioManager from '@/components/AudioManager';

export default function Home() {
  return (
    <div className="relative w-full h-full overflow-hidden">
      <div className="w-full h-full absolute inset-0" data-canvas-container>
        <CloudScene />
      </div>
      <ControlPanel />
      <Toolbar />
      <PoemDisplay />
      <AudioManager />
    </div>
  );
}
