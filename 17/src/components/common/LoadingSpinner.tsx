import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'primary' | 'purple' | 'cyan';
  className?: string;
  fullScreen?: boolean;
  text?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12',
};

const variantClasses = {
  default: 'text-gray-500 dark:text-gray-400',
  primary: 'text-deep-blue-600 dark:text-deep-blue-400',
  purple: 'text-electric-purple-600 dark:text-electric-purple-400',
  cyan: 'text-neon-cyan-600 dark:text-neon-cyan-400',
};

export default function LoadingSpinner({
  size = 'md',
  variant = 'primary',
  className,
  fullScreen = false,
  text,
}: LoadingSpinnerProps) {
  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm dark:bg-deep-blue-950/80">
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          <Loader2
            className={cn(
              'animate-spin',
              sizeClasses[size],
              variantClasses[variant],
              className
            )}
          />
          {text && (
            <p className="text-sm text-gray-600 dark:text-gray-300 animate-pulse">
              {text}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center">
      <Loader2
        className={cn(
          'animate-spin',
          sizeClasses[size],
          variantClasses[variant],
          className
        )}
      />
      {text && (
        <span className="ml-2 text-sm text-gray-600 dark:text-gray-300">
          {text}
        </span>
      )}
    </div>
  );
}

export function LoadingDots({
  size = 'md',
  variant = 'primary',
  className,
}: {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'primary' | 'purple' | 'cyan';
  className?: string;
}) {
  const dotSize = {
    sm: 'h-1.5 w-1.5',
    md: 'h-2 w-2',
    lg: 'h-3 w-3',
  };

  const dotColor = {
    default: 'bg-gray-500 dark:bg-gray-400',
    primary: 'bg-deep-blue-600 dark:bg-deep-blue-400',
    purple: 'bg-electric-purple-600 dark:bg-electric-purple-400',
    cyan: 'bg-neon-cyan-600 dark:bg-neon-cyan-400',
  };

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <div
        className={cn(
          dotSize[size],
          dotColor[variant],
          'rounded-full animate-bounce'
        )}
        style={{ animationDelay: '0ms' }}
      />
      <div
        className={cn(
          dotSize[size],
          dotColor[variant],
          'rounded-full animate-bounce'
        )}
        style={{ animationDelay: '150ms' }}
      />
      <div
        className={cn(
          dotSize[size],
          dotColor[variant],
          'rounded-full animate-bounce'
        )}
        style={{ animationDelay: '300ms' }}
      />
    </div>
  );
}

export function LoadingSkeleton({
  count = 1,
  height = 'h-4',
  className,
}: {
  count?: number;
  height?: string;
  className?: string;
}) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={cn(
            height,
            'rounded bg-gray-200 dark:bg-gray-700 animate-pulse'
          )}
          style={{
            width: `${Math.random() * 40 + 60}%`,
            animationDelay: `${index * 100}ms`,
          }}
        />
      ))}
    </div>
  );
}
