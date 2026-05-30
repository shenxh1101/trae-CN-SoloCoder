import {
  Save,
  FolderOpen,
  Camera,
  Box,
  Play,
  Pause,
} from 'lucide-react';
import { useCreatureStore } from '../../store/useCreatureStore';
import { exportAsJSON } from '../../utils/exportUtils';

interface ToolbarProps {
  onScreenshot: () => void;
  onExportOBJ: () => void;
  onLoadFossil: () => void;
}

export function Toolbar({ onScreenshot, onExportOBJ, onLoadFossil }: ToolbarProps) {
  const {
    saveCreature,
    autoRotate,
    animationEnabled,
    toggleAutoRotate,
    toggleAnimation,
    currentCreature,
  } = useCreatureStore();

  const handleSave = () => {
    if (currentCreature) {
      exportAsJSON(currentCreature);
    }
  };

  const toolButtons = [
    {
      icon: Save,
      label: '保存化石',
      desc: 'JSON',
      onClick: handleSave,
      color: 'text-cyan-400 hover:bg-cyan-500/20 hover:border-cyan-500/50',
    },
    {
      icon: FolderOpen,
      label: '加载化石',
      desc: 'JSON',
      onClick: onLoadFossil,
      color: 'text-purple-400 hover:bg-purple-500/20 hover:border-purple-500/50',
    },
    {
      icon: Camera,
      label: '截图保存',
      desc: 'PNG',
      onClick: onScreenshot,
      color: 'text-pink-400 hover:bg-pink-500/20 hover:border-pink-500/50',
    },
    {
      icon: Box,
      label: '导出模型',
      desc: 'OBJ',
      onClick: onExportOBJ,
      color: 'text-orange-400 hover:bg-orange-500/20 hover:border-orange-500/50',
    },
  ];

  const toggleButtons = [
    {
      icon: autoRotate ? Pause : Play,
      label: autoRotate ? '停止环绕' : '自动环绕',
      active: autoRotate,
      onClick: toggleAutoRotate,
      activeColor: 'bg-cyan-500/30 border-cyan-400 text-cyan-300',
    },
    {
      icon: animationEnabled ? Play : Pause,
      label: animationEnabled ? '停止动画' : '关节动画',
      active: animationEnabled,
      onClick: toggleAnimation,
      activeColor: 'bg-emerald-500/30 border-emerald-400 text-emerald-300',
    },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white/90 flex items-center gap-2">
        <Box className="w-5 h-5 text-purple-400" />
        工具箱
      </h3>

      <div className="grid grid-cols-2 gap-2">
        {toolButtons.map((tool, idx) => (
          <button
            key={idx}
            onClick={tool.onClick}
            className={`p-3 rounded-lg border border-white/10 bg-white/5
              transition-all duration-200 flex flex-col items-center gap-1
              hover:scale-[1.02] active:scale-[0.98]
              ${tool.color}`}
          >
            <tool.icon className="w-5 h-5" />
            <span className="text-xs font-medium">{tool.label}</span>
            <span className="text-[10px] opacity-60">{tool.desc}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {toggleButtons.map((btn, idx) => (
          <button
            key={idx}
            onClick={btn.onClick}
            className={`p-2.5 rounded-lg border transition-all duration-200
              flex items-center justify-center gap-2 text-sm font-medium
              hover:scale-[1.02] active:scale-[0.98]
              ${
                btn.active
                  ? btn.activeColor
                  : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
              }`}
          >
            <btn.icon className="w-4 h-4" />
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  );
}
