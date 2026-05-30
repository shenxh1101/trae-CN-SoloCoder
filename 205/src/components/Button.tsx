import type { ReactNode } from 'react';

interface ButtonProps {
  children: ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  className?: string;
}

export function Button({ children, onClick, variant = 'primary', className = '' }: ButtonProps) {
  const baseStyles =
    'w-full py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 ' +
    'hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 ';

  const variants = {
    primary:
      'bg-gradient-to-r from-cyan-500 to-blue-500 text-white ' +
      'hover:from-cyan-400 hover:to-blue-400 ' +
      'focus:ring-cyan-500/50 shadow-lg shadow-cyan-500/20 ' +
      'hover:shadow-cyan-500/40',
    secondary:
      'bg-gray-800/50 text-cyan-300 border border-cyan-500/30 ' +
      'hover:bg-gray-700/50 hover:border-cyan-400/50 ' +
      'focus:ring-cyan-500/30',
  };

  return (
    <button type="button" onClick={onClick} className={baseStyles + variants[variant] + ' ' + className}>
      {children}
    </button>
  );
}
