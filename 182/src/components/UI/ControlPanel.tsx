import { useRef } from 'react';
import { useAppStore } from '../../store/appStore';

export default function ControlPanel() {
  const { 
    shuffle, 
    autoSolve, 
    reset, 
    saveState, 
    loadState,
    manualSolveCheck,
    stopTimer,
    isAutoSolving,
    isShuffled,
    timerRunning,
  } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    const state = saveState();
    const blob = new Blob([state], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pyraminx-state-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLoadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        loadState(content);
      };
      reader.readAsText(file);
    }
    if (e.target) e.target.value = '';
  };

  const handleScreenshot = () => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const link = document.createElement('a');
      link.download = `pyraminx-screenshot-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  };

  const buttons = [
    { label: '🎲 打乱', onClick: shuffle, disabled: isAutoSolving, color: 'hover:bg-purple-500/30' },
    { label: '🔄 自动复原', onClick: autoSolve, disabled: isAutoSolving, color: 'hover:bg-green-500/30' },
    { label: '✅ 检查完成', onClick: manualSolveCheck, disabled: isAutoSolving || !isShuffled, color: 'hover:bg-emerald-500/30' },
    { label: '⏸️ 停止计时', onClick: stopTimer, disabled: isAutoSolving || !timerRunning, color: 'hover:bg-amber-500/30' },
    { label: '↺ 重置', onClick: reset, disabled: isAutoSolving, color: 'hover:bg-red-500/30' },
    { label: '📷 截图', onClick: handleScreenshot, disabled: false, color: 'hover:bg-blue-500/30' },
    { label: '💾 保存', onClick: handleSave, disabled: false, color: 'hover:bg-yellow-500/30' },
    { label: '📂 加载', onClick: handleLoadClick, disabled: false, color: 'hover:bg-orange-500/30' },
  ];

  return (
    <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10">
      <div className="glass-panel rounded-xl p-4 flex flex-col gap-3">
        <h3 className="text-neon-cyan font-bold text-center mb-2 text-sm">控制面板</h3>
        {buttons.map((btn, index) => (
          <button
            key={index}
            onClick={btn.onClick}
            disabled={btn.disabled}
            className={`glass-button ${btn.color} px-4 py-2 rounded-lg font-mono text-sm transition-all ${btn.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {btn.label}
          </button>
        ))}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
