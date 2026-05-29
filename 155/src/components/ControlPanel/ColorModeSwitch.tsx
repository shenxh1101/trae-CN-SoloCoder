import { ColorMode, COLOR_MODE_LABELS } from '../../types';

interface ColorModeSwitchProps {
  value: ColorMode;
  onChange: (value: ColorMode) => void;
}

const colorGradients: Record<ColorMode, string> = {
  rainbow: 'from-red-500 via-yellow-500 to-blue-500',
  warm: 'from-red-500 to-orange-400',
  cool: 'from-blue-400 to-teal-400',
};

export function ColorModeSwitch({ value, onChange }: ColorModeSwitchProps) {
  const modes: ColorMode[] = ['rainbow', 'warm', 'cool'];

  return (
    <div className="mb-5">
      <span className="text-sm text-gray-300 font-medium mb-2 block">颜色模式</span>
      <div className="grid grid-cols-3 gap-2">
        {modes.map((mode) => (
          <button
            key={mode}
            onClick={() => onChange(mode)}
            className={`relative py-2 px-3 rounded-lg text-xs font-medium transition-all duration-200 overflow-hidden ${
              value === mode
                ? 'text-white shadow-lg scale-105'
                : 'text-gray-400 bg-gray-800/50 hover:bg-gray-700/50'
            }`}
          >
            {value === mode && (
              <div className={`absolute inset-0 bg-gradient-to-r ${colorGradients[mode]} opacity-80`} />
            )}
            <div
              className={`absolute inset-0 bg-gradient-to-r ${colorGradients[mode]} ${
                value === mode ? 'opacity-80' : 'opacity-20'
              }`}
            />
            <span className="relative z-10">{COLOR_MODE_LABELS[mode]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
