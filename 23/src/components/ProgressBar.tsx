import { useEffect, useState } from 'react';
import { formatConfidence } from '../utils/api';

interface ProgressBarProps {
  confidence: number;
  label: string;
  delay?: number;
  showLabel?: boolean;
  rank?: number;
}

const gradientColors = [
  'from-primary-400 to-accent-400',
  'from-primary-500 to-primary-300',
  'from-accent-500 to-accent-300',
  'from-cyan-500 to-blue-400',
  'from-purple-500 to-pink-400',
];

export function ProgressBar({
  confidence,
  label,
  delay = 0,
  showLabel = true,
  rank,
}: ProgressBarProps) {
  const [width, setWidth] = useState(0);
  const colorIndex = rank !== undefined ? rank % gradientColors.length : 0;
  const gradient = gradientColors[colorIndex];

  useEffect(() => {
    const timer = setTimeout(() => {
      setWidth(confidence * 100);
    }, delay);
    return () => clearTimeout(timer);
  }, [confidence, delay]);

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm text-dark-200 font-medium truncate max-w-[70%]">
            {rank !== undefined && (
              <span className="inline-flex items-center justify-center w-5 h-5 mr-2 text-xs font-bold rounded-full bg-dark-700 text-dark-300">
                {rank + 1}
              </span>
            )}
            {label}
          </span>
          <span className="text-sm font-mono font-semibold text-primary-300">
            {formatConfidence(confidence)}
          </span>
        </div>
      )}
      <div className="progress-bar-track">
        <div
          className={`progress-bar-fill bg-gradient-to-r ${gradient}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}
