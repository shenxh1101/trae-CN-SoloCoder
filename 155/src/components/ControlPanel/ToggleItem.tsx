import { LucideIcon } from 'lucide-react';

interface ToggleItemProps {
  label: string;
  icon?: LucideIcon;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function ToggleItem({ label, icon: Icon, checked, onChange }: ToggleItemProps) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        {Icon && <Icon size={16} className={checked ? 'text-cyan-400' : 'text-gray-500'} />}
        <span className={`text-sm ${checked ? 'text-white' : 'text-gray-400'}`}>{label}</span>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-12 h-6 rounded-full transition-all duration-300 ${
          checked
            ? 'bg-gradient-to-r from-cyan-500 to-purple-500 shadow-lg shadow-cyan-500/30'
            : 'bg-gray-700'
        }`}
      >
        <div
          className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all duration-300 ${
            checked ? 'left-6' : 'left-0.5'
          }`}
        />
      </button>
    </div>
  );
}
