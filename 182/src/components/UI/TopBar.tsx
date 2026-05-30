import { useEffect } from 'react';
import { useAppStore } from '../../store/appStore';
import { StyleType } from '../../types';

export default function TopBar() {
  const { 
    timer, 
    timerRunning, 
    setTimer, 
    style, 
    setStyle, 
    showEdges, 
    setShowEdges, 
    autoRotate, 
    setAutoRotate,
    isSolved 
  } = useAppStore();

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (timerRunning) {
      interval = setInterval(() => {
        setTimer(timer + 10);
      }, 10);
    }
    return () => clearInterval(interval);
  }, [timerRunning, timer, setTimer]);

  const formatTime = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const centiseconds = Math.floor((ms % 1000) / 10);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
  };

  const styleOptions: { value: StyleType; label: string }[] = [
    { value: 'standard', label: '标准颜色' },
    { value: 'neon', label: '荧光色' },
    { value: 'metallic', label: '金属质感' },
  ];

  return (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
      <div className="glass-panel rounded-xl px-6 py-3 flex items-center gap-6">
        <div className="text-center">
          <div className="text-xs text-white/50 mb-1">计时器</div>
          <div className={`font-mono text-2xl ${isSolved ? 'text-green-400' : 'text-neon-cyan'}`}>
            {formatTime(timer)}
          </div>
        </div>

        <div className="h-10 w-px bg-white/20" />

        <div className="flex flex-col gap-1">
          <div className="text-xs text-white/50">贴图样式</div>
          <select
            value={style}
            onChange={(e) => setStyle(e.target.value as StyleType)}
            className="glass-select rounded px-3 py-1 text-sm font-mono"
          >
            {styleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="h-10 w-px bg-white/20" />

        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showEdges}
              onChange={(e) => setShowEdges(e.target.checked)}
              className="w-4 h-4 accent-neon-cyan"
            />
            <span className="text-sm text-white/80">边缘轮廓</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRotate}
              onChange={(e) => setAutoRotate(e.target.checked)}
              className="w-4 h-4 accent-neon-cyan"
            />
            <span className="text-sm text-white/80">自动环绕</span>
          </label>
        </div>

        {isSolved && timer > 0 && (
          <>
            <div className="h-10 w-px bg-white/20" />
            <div className="text-green-400 font-bold animate-pulse">
              ✨ 已复原！
            </div>
          </>
        )}
      </div>
    </div>
  );
}
