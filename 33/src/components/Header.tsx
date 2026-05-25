import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Settings } from 'lucide-react';
import { useAppStore } from '../store';
import { getCurrencySymbol } from '../utils/currency';
import { getMonthLabel } from '../utils/date';

interface HeaderProps {
  onOpenSettings: () => void;
}

const AnimatedNumber = ({ value, prefix, color }: { value: number; prefix: string; color: string }) => {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const duration = 800;
    const start = 0;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setDisplay(start + (value - start) * easeOut);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value]);

  return (
    <span className={`font-mono text-2xl font-bold ${color}`}>
      {prefix}{display.toFixed(2)}
    </span>
  );
};

export const Header = ({ onOpenSettings }: HeaderProps) => {
  const { currentMonth, setCurrentMonth, getMonthlyStats, settings } = useAppStore();
  const stats = getMonthlyStats();
  const symbol = getCurrencySymbol(settings.currency);

  const prevMonth = () => {
    if (currentMonth.month === 1) {
      setCurrentMonth(currentMonth.year - 1, 12);
    } else {
      setCurrentMonth(currentMonth.year, currentMonth.month - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth.month === 12) {
      setCurrentMonth(currentMonth.year + 1, 1);
    } else {
      setCurrentMonth(currentMonth.year, currentMonth.month + 1);
    }
  };

  return (
    <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 rounded-2xl shadow-lg mb-6">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onOpenSettings}
          className="p-2 hover:bg-white/20 rounded-lg transition-colors"
        >
          <Settings size={24} />
        </button>
        <div className="flex items-center gap-4">
          <button
            onClick={prevMonth}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-xl font-semibold min-w-[140px] text-center">
            {getMonthLabel(currentMonth.year, currentMonth.month)}
          </h2>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
        <div className="w-10" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/15 backdrop-blur-sm rounded-xl p-4">
          <p className="text-sm text-blue-100 mb-1">总收入</p>
          <AnimatedNumber value={stats.income} prefix={symbol} color="text-emerald-300" />
        </div>
        <div className="bg-white/15 backdrop-blur-sm rounded-xl p-4">
          <p className="text-sm text-blue-100 mb-1">总支出</p>
          <AnimatedNumber value={stats.expense} prefix={symbol} color="text-rose-300" />
        </div>
        <div className="bg-white/15 backdrop-blur-sm rounded-xl p-4">
          <p className="text-sm text-blue-100 mb-1">结余</p>
          <AnimatedNumber
            value={stats.balance}
            prefix={symbol}
            color={stats.balance >= 0 ? 'text-emerald-300' : 'text-rose-300'}
          />
        </div>
      </div>
    </div>
  );
};
