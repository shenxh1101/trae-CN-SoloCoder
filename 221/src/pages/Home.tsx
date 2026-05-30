import { useEffect, useCallback, useRef, useState } from 'react';
import { Dna, Info } from 'lucide-react';
import { Scene, SceneApi } from '../components/Scene3D/Scene';
import { InfoCard } from '../components/ControlPanel/InfoCard';
import { EvolutionControls } from '../components/ControlPanel/EvolutionControls';
import { LockControls } from '../components/ControlPanel/LockControls';
import { Toolbar } from '../components/ControlPanel/Toolbar';
import { useCreatureStore, loadCreatureFromFile } from '../store/useCreatureStore';
import { takeScreenshot, exportCreatureAsOBJ } from '../utils/exportUtils';

export function Home() {
  const { initCreature, currentCreature } = useCreatureStore();
  const [showHelp, setShowHelp] = useState(false);

  const sceneApiRef = useRef<SceneApi>({
    gl: null,
    scene: null,
    camera: null,
    creatureGroup: null,
  });

  useEffect(() => {
    initCreature();
  }, [initCreature]);

  const handleScreenshot = useCallback(() => {
    const { gl } = sceneApiRef.current;
    if (gl) {
      takeScreenshot(gl);
    }
  }, []);

  const handleExportOBJ = useCallback(() => {
    const { creatureGroup } = sceneApiRef.current;
    if (creatureGroup) {
      exportCreatureAsOBJ(creatureGroup);
    }
  }, []);

  const handleLoadFossil = useCallback(async () => {
    try {
      await loadCreatureFromFile();
    } catch {
      // user cancelled or error, silently ignore
    }
  }, []);

  return (
    <div className="w-full h-screen bg-[#0a0e1a] overflow-hidden flex">
      <div className="flex-1 relative">
        <Scene sceneApiRef={sceneApiRef} />

        <div className="absolute top-6 left-6 z-10">
          <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md rounded-xl px-5 py-3 border border-white/10">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center">
              <Dna className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">无限进化</h1>
              <p className="text-xs text-white/50">Infinite Evolution Lab</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowHelp(!showHelp)}
          className="absolute top-6 right-[340px] z-10
            w-10 h-10 rounded-full bg-black/40 backdrop-blur-md
            flex items-center justify-center border border-white/10
            hover:bg-white/10 transition-colors"
        >
          <Info className="w-5 h-5 text-white/70" />
        </button>

        {showHelp && (
          <div
            className="absolute top-20 right-[340px] z-20
              bg-black/80 backdrop-blur-lg rounded-xl p-4 border border-white/10
              max-w-xs text-sm text-white/80 space-y-2"
          >
            <p className="font-semibold text-white">💡 使用提示</p>
            <ul className="space-y-1 text-xs">
              <li>• 点击「进化」让生物随机变异</li>
              <li>• 点赞让下一代微调，点踩让下一代剧变</li>
              <li>• 点击生物部位或开关可锁定部位</li>
              <li>• 拖拽场景旋转视角，滚轮缩放</li>
              <li>• 保存化石可导出JSON，随时加载</li>
            </ul>
          </div>
        )}

        {!currentCreature && (
          <div className="absolute inset-0 flex items-center justify-center z-20">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-white/70">正在生成初始生物...</p>
            </div>
          </div>
        )}
      </div>

      <div
        className="w-[320px] h-full bg-black/40 backdrop-blur-xl border-l border-white/10
          overflow-y-auto overflow-x-hidden flex flex-col"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        <div className="p-5 space-y-6">
          <style>{`
            div::-webkit-scrollbar {
              display: none;
            }
          `}</style>

          <InfoCard />

          <div className="h-px bg-white/10" />

          <EvolutionControls />

          <div className="h-px bg-white/10" />

          <LockControls />

          <div className="h-px bg-white/10" />

          <Toolbar
            onScreenshot={handleScreenshot}
            onExportOBJ={handleExportOBJ}
            onLoadFossil={handleLoadFossil}
          />

          <div className="text-center text-[10px] text-white/30 pt-2">
            拖拽3D场景旋转视角 · 滚轮缩放
          </div>
        </div>
      </div>
    </div>
  );
}
