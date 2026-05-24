import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { FileCode } from 'lucide-react';

interface EmptyProps {
  title?: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export default function Empty({
  title,
  description,
  action,
  icon,
  className,
}: EmptyProps) {
  if (!title && !description && !action) {
    return (
      <div className={cn('flex h-full items-center justify-center', className)}>
        Empty
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
        {icon || <FileCode className="h-8 w-8 text-gray-300 dark:text-gray-600" />}
      </div>
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {title}
        </h3>
      )}
      {description && (
        <p className="mt-2 max-w-sm text-sm text-gray-500 dark:text-gray-400">
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
