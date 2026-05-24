import { useAppStore } from '../store/useAppStore';

export function ThresholdSlider() {
  const { threshold, setThreshold } = useAppStore();

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-dark-100">置信度阈值</h3>
        <span className="text-2xl font-bold font-mono gradient-text">
          {(threshold * 100).toFixed(0)}%
        </span>
      </div>
      <p className="text-sm text-dark-400 mb-4">
        低于此阈值的分类结果将被标记为"无法识别"
      </p>
      <div className="relative">
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={threshold}
          onChange={(e) => setThreshold(parseFloat(e.target.value))}
          className="w-full h-2 bg-dark-700 rounded-full appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-6
            [&::-webkit-slider-thumb]:h-6
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-gradient-to-r
            [&::-webkit-slider-thumb]:from-primary-400
            [&::-webkit-slider-thumb]:to-accent-400
            [&::-webkit-slider-thumb]:shadow-lg
            [&::-webkit-slider-thumb]:shadow-primary-500/50
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:transition-transform
            [&::-webkit-slider-thumb]:hover:scale-110"
        />
        <div className="flex justify-between mt-2 text-xs text-dark-500">
          <span>0%</span>
          <span>25%</span>
          <span>50%</span>
          <span>75%</span>
          <span>100%</span>
        </div>
      </div>
    </div>
  );
}
