import { AlertTriangle, AlertCircle, Info } from 'lucide-react';

interface UrgencyBadgeProps {
  level: 'low' | 'medium' | 'high';
  reason?: string;
  showReason?: boolean;
}

export default function UrgencyBadge({ level, reason, showReason = false }: UrgencyBadgeProps) {
  const config = {
    low: {
      icon: Info,
      bgClass: 'bg-blue-50',
      textClass: 'text-blue-700',
      borderClass: 'border-blue-200',
      iconClass: 'text-blue-500',
      label: '低紧急度',
      pulse: false,
    },
    medium: {
      icon: AlertCircle,
      bgClass: 'bg-amber-50',
      textClass: 'text-amber-700',
      borderClass: 'border-amber-200',
      iconClass: 'text-amber-500',
      label: '中紧急度',
      pulse: false,
    },
    high: {
      icon: AlertTriangle,
      bgClass: 'bg-red-50',
      textClass: 'text-red-700',
      borderClass: 'border-red-200',
      iconClass: 'text-red-500',
      label: '高紧急度',
      pulse: true,
    },
  };

  const { icon: Icon, bgClass, textClass, borderClass, iconClass, label, pulse } = config[level];

  return (
    <div className="inline-flex flex-col gap-1">
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${bgClass} ${textClass} border ${borderClass}`}>
        <Icon className={`w-3.5 h-3.5 ${iconClass} ${pulse ? 'animate-pulse-slow' : ''}`} />
        <span>{label}</span>
      </div>
      {showReason && reason && (
        <span className="text-xs text-gray-500 ml-1">{reason}</span>
      )}
    </div>
  );
}
