import React from 'react';

type LoadingSize = 'sm' | 'md' | 'lg' | 'xl';

interface LoadingProps {
  size?: LoadingSize;
  className?: string;
  text?: string;
}

const sizeClasses: Record<LoadingSize, string> = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-8 h-8 border-3',
  xl: 'w-12 h-12 border-4'
};

export const Loading: React.FC<LoadingProps> = ({
  size = 'md',
  className = '',
  text
}) => {
  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <div
        className={`
          animate-spin rounded-full
          border-primary-600 border-t-transparent
          ${sizeClasses[size]}
          ${className}
        `}
      />
      {text && (
        <p className="text-sm text-gray-500 dark:text-gray-400">{text}</p>
      )}
    </div>
  );
};

export const LoadingOverlay: React.FC<{ visible: boolean; text?: string }> = ({
  visible,
  text
}) => {
  if (!visible) return null;

  return (
    <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 flex items-center justify-center z-50">
      <Loading size="lg" text={text} />
    </div>
  );
};

export default Loading;
