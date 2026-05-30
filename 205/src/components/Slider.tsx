interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  formatValue?: (value: number) => string;
}

export function Slider({ label, value, min, max, step, onChange, formatValue }: SliderProps) {
  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-1">
        <label className="text-xs text-cyan-300 font-medium tracking-wide">{label}</label>
        <span className="text-xs text-cyan-400 font-mono">
          {formatValue ? formatValue(value) : value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer 
                   accent-cyan-400 hover:accent-cyan-300 transition-all
                   [&::-webkit-slider-thumb]:appearance-none
                   [&::-webkit-slider-thumb]:w-4
                   [&::-webkit-slider-thumb]:h-4
                   [&::-webkit-slider-thumb]:rounded-full
                   [&::-webkit-slider-thumb]:bg-cyan-400
                   [&::-webkit-slider-thumb]:shadow-lg
                   [&::-webkit-slider-thumb]:shadow-cyan-400/50
                   [&::-webkit-slider-thumb]:hover:bg-cyan-300
                   [&::-webkit-slider-thumb]:hover:scale-110
                   [&::-webkit-slider-thumb]:transition-all"
      />
    </div>
  );
}
