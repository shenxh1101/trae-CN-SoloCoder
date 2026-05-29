import { BackgroundColor, BACKGROUND_LABELS } from '../../types';

interface BackgroundSwitchProps {
  value: BackgroundColor;
  onChange: (value: BackgroundColor) => void;
}

const bgColors: Record<BackgroundColor, string> = {
  black: 'bg-gray-950',
  darkblue: 'bg-blue-950',
  purple: 'bg-purple-950',
};

const bgBorders: Record<BackgroundColor, string> = {
  black: 'border-gray-600',
  darkblue: 'border-blue-500',
  purple: 'border-purple-500',
};

export function BackgroundSwitch({ value, onChange }: BackgroundSwitchProps) {
  const modes: BackgroundColor[] = ['black', 'darkblue', 'purple'];

  return (
    <div className="mb-5">
      <span className="text-sm text-gray-300 font-medium mb-2 block">背景颜色</span>
      <div className="grid grid-cols-3 gap-2">
        {modes.map((mode) => (
          <button
            key={mode}
            onClick={() => onChange(mode)}
            className={`relative py-2 px-3 rounded-lg text-xs font-medium transition-all duration-200 ${
              bgColors[mode]
            } ${
              value === mode
                ? `border-2 ${bgBorders[mode]} scale-105 shadow-lg`
                : 'border border-gray-700 hover:border-gray-500'
            }`}
          >
            <span className={value === mode ? 'text-white' : 'text-gray-400'}>
              {BACKGROUND_LABELS[mode]}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
