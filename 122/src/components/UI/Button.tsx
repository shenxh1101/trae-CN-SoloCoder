import React from 'react';
import { cn } from '../../lib/utils';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  variant?: 'primary' | 'secondary' | 'toggle';
  className?: string;
}

export default function Button({
  children,
  onClick,
  active = false,
  variant = 'primary',
  className = '',
}: ButtonProps) {
  const baseStyles = 'px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2';
  
  const variants = {
    primary: 'bg-white/20 hover:bg-white/30 text-white border border-white/20 hover:border-white/40',
    secondary: 'bg-transparent hover:bg-white/10 text-white/80 hover:text-white',
    toggle: active
      ? 'bg-gradient-to-r from-purple-500/80 to-pink-500/80 text-white border border-transparent shadow-lg'
      : 'bg-white/10 hover:bg-white/20 text-white/70 border border-white/10 hover:border-white/30',
  };

  return (
    <button
      onClick={onClick}
      className={cn(baseStyles, variants[variant], className)}
    >
      {children}
    </button>
  );
}
