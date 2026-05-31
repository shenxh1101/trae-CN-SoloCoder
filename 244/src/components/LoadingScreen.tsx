import { useEffect, useState } from "react";
import { useGameStore } from "@/lib/gameStore";
import { COCO_LABEL_MAP } from "@/lib/constants";

export default function LoadingScreen() {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("正在初始化...");

  useEffect(() => {
    const timer1 = setTimeout(() => {
      setProgress(30);
      setStatusText("正在加载AI模型...");
    }, 300);

    const timer2 = setTimeout(() => {
      setProgress(60);
      setStatusText("正在启动摄像头...");
    }, 1200);

    const timer3 = setTimeout(() => {
      setProgress(90);
      setStatusText("准备就绪...");
    }, 2000);

    const timer4 = setTimeout(() => {
      setProgress(100);
    }, 2500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, []);

  const currentTarget = useGameStore((s) => s.currentTarget);
  const cat = currentTarget ? COCO_LABEL_MAP[currentTarget] : null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        <div className="mb-8">
          <div className="w-24 h-24 mx-auto mb-4 rounded-full border-2 border-cyber-cyan/30 flex items-center justify-center relative">
            <div
              className="absolute inset-0 rounded-full border-2 border-cyber-cyan border-t-transparent animate-spin"
              style={{ animationDuration: "1.5s" }}
            />
            <span className="text-4xl">{cat?.icon || "🔍"}</span>
          </div>
        </div>

        <div className="cyber-panel p-4 mb-6">
          <div className="font-rajdhani text-lg text-gray-400 mb-3">
            {statusText}
          </div>
          <div className="w-full bg-cyber-border rounded-full h-2">
            <div
              className="h-2 rounded-full bg-cyber-cyan transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="font-orbitron text-sm text-cyber-cyan mt-2">
            {progress}%
          </div>
        </div>

        {cat && (
          <div className="cyber-panel p-4 animate-fade-in">
            <div className="text-sm text-gray-500 mb-2">第一个目标</div>
            <div className="font-orbitron text-3xl text-cyber-cyan neon-text">
              {cat.label}
            </div>
            <div className="text-4xl mt-2">{cat.icon}</div>
          </div>
        )}
      </div>
    </div>
  );
}
