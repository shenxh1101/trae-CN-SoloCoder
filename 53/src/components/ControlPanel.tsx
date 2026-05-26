import { Eye, EyeOff, RotateCw, Atom, Zap, Target, Ruler, X } from 'lucide-react';
import { DisplayOptions } from '../types';

interface ControlPanelProps {
  displayOptions: DisplayOptions;
  onDisplayOptionsChange: (options: Partial<DisplayOptions>) => void;
  isMeasuring: boolean;
  onStartMeasuring: () => void;
  onClearMeasurement: () => void;
}

interface ToggleOption {
  key: keyof DisplayOptions;
  label: string;
  icon: React.ReactNode;
  description: string;
}

export default function ControlPanel({
  displayOptions,
  onDisplayOptionsChange,
  isMeasuring,
  onStartMeasuring,
  onClearMeasurement,
}: ControlPanelProps) {
  const toggleOptions: ToggleOption[] = [
    {
      key: 'showLabels',
      label: '原子标签',
      icon: <Eye className="w-4 h-4" />,
      description: '显示原子名称标签',
    },
    {
      key: 'showVanDerWaals',
      label: '范德华半径',
      icon: <Atom className="w-4 h-4" />,
      description: '显示原子范德华半径范围',
    },
    {
      key: 'showElectronCloud',
      label: '电子云',
      icon: <Zap className="w-4 h-4" />,
      description: '显示分子轨道电子云效果',
    },
    {
      key: 'showDipoleMoment',
      label: '偶极矩',
      icon: <Target className="w-4 h-4" />,
      description: '显示分子偶极矩方向',
    },
    {
      key: 'autoRotate',
      label: '自动旋转',
      icon: <RotateCw className="w-4 h-4" />,
      description: '场景自动缓慢旋转',
    },
  ];

  return (
    <div className="absolute right-4 top-24 z-10 w-64 bg-black/40 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden">
      <div className="p-4 border-b border-white/10">
        <h2 className="text-white font-bold text-sm flex items-center gap-2">
          <Eye className="w-4 h-4" />
          显示选项
        </h2>
      </div>

      <div className="p-3 space-y-2">
        {toggleOptions.map((option) => (
          <button
            key={option.key}
            onClick={() =>
              onDisplayOptionsChange({
                [option.key]: !displayOptions[option.key],
              })
            }
            className={`w-full flex items-center justify-between p-2.5 rounded-lg transition-all ${
              displayOptions[option.key]
                ? 'bg-blue-500/30 border border-blue-400/50'
                : 'bg-white/5 border border-transparent hover:bg-white/10'
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`${
                  displayOptions[option.key] ? 'text-blue-400' : 'text-white/60'
                }`}
              >
                {option.icon}
              </span>
              <div className="text-left">
                <p
                  className={`text-sm font-medium ${
                    displayOptions[option.key] ? 'text-white' : 'text-white/80'
                  }`}
                >
                  {option.label}
                </p>
                <p className="text-xs text-white/50">{option.description}</p>
              </div>
            </div>
            <div
              className={`w-10 h-5 rounded-full transition-colors relative ${
                displayOptions[option.key] ? 'bg-blue-500' : 'bg-white/20'
              }`}
            >
              <div
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                  displayOptions[option.key] ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </div>
          </button>
        ))}
      </div>

      <div className="p-4 border-t border-white/10">
        <h2 className="text-white font-bold text-sm flex items-center gap-2 mb-3">
          <Ruler className="w-4 h-4" />
          键长测量
        </h2>
        <div className="flex gap-2">
          <button
            onClick={onStartMeasuring}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg transition-colors text-sm ${
              isMeasuring
                ? 'bg-yellow-500 text-black font-medium'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <Ruler className="w-4 h-4" />
            {isMeasuring ? '测量中...' : '开始测量'}
          </button>
          <button
            onClick={onClearMeasurement}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-colors text-sm"
            title="清除测量"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {isMeasuring && (
          <p className="text-xs text-yellow-400 mt-2 text-center">
            点击两个原子测量键长
          </p>
        )}
      </div>
    </div>
  );
}
