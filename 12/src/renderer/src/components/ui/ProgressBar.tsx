import React from 'react';

type ProgressBarVariant = 'primary' | 'success' | 'warning' | 'danger';

interface ProgressBarProps {
  value: number;
  max?: number;
  variant?: ProgressBarVariant;
  showLabel?: boolean;
  label?: string;
  className?: string;
  height?: 'sm' | 'md' | 'lg';
}

const variantClasses: Record<ProgressBarVariant, string> = {
  primary: 'bg-primary-600',
  success: 'bg-green-600',
  warning: 'bg-yellow-500',
  danger: 'bg-red-600'
};

const heightClasses: Record<string, string> = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-4'
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  variant = 'primary',
  showLabel = false,
  label,
  className = '',
  height = 'md'
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div className={`w-full ${className}`}>
      {(showLabel || label) && (
        <div className="flex justify-between mb-1">
          {label && (
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {label}
            </span>
          )}
          {showLabel && (
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}
      <div className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden ${heightClasses[height]}`}>
        <div
          className={`h-full rounded-full transition-all duration-300 ${variantClasses[variant]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
