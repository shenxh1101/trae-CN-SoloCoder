import { v4 as uuidv4 } from 'uuid';

export const generateId = (): string => {
  return uuidv4();
};

export const formatDate = (timestamp: number | null, format: string = 'yyyy-MM-dd HH:mm'): string => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return format
    .replace('yyyy', String(year))
    .replace('MM', month)
    .replace('dd', day)
    .replace('HH', hours)
    .replace('mm', minutes);
};

export const formatRelativeDate = (timestamp: number | null): string => {
  if (!timestamp) return '';
  const now = Date.now();
  const diff = timestamp - now;
  const absDiff = Math.abs(diff);

  const day = 24 * 60 * 60 * 1000;
  const hour = 60 * 60 * 1000;
  const minute = 60 * 1000;

  if (absDiff < minute) return '刚刚';
  if (absDiff < hour) return `${Math.floor(absDiff / minute)}分钟${diff > 0 ? '后' : '前'}`;
  if (absDiff < day) return `${Math.floor(absDiff / hour)}小时${diff > 0 ? '后' : '前'}`;
  if (absDiff < 7 * day) return `${Math.floor(absDiff / day)}天${diff > 0 ? '后' : '前'}`;

  const date = new Date(timestamp);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
};

export const getStartOfWeek = (date: Date = new Date()): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const getEndOfWeek = (date: Date = new Date()): Date => {
  const d = getStartOfWeek(date);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
};

export const getStartOfDay = (date: Date = new Date()): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const getEndOfDay = (date: Date = new Date()): Date => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

export const formatDurationInHours = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}小时${mins > 0 ? `${mins}分钟` : ''}`;
  }
  return `${mins}分钟`;
};

export const isOverdue = (dueDate: number | null): boolean => {
  if (!dueDate) return false;
  return dueDate < Date.now();
};

export const getWeekdayName = (day: number): string => {
  const names = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  return names[day] || '';
};

export const getRepeatRuleText = (rule: string, weekdays?: number[]): string => {
  switch (rule) {
    case 'daily':
      return '每天';
    case 'weekly':
      return '每周';
    case 'monthly':
      return '每月';
    case 'custom':
      if (weekdays && weekdays.length > 0) {
        return weekdays.map(getWeekdayName).join('、');
      }
      return '自定义';
    default:
      return '不重复';
  }
};

export const getPriorityColor = (priority: string, isDark: boolean): string => {
  const colors = isDark
    ? { high: '#CF6679', medium: '#FFB74D', low: '#81C784' }
    : { high: '#B00020', medium: '#FB8C00', low: '#4CAF50' };
  return colors[priority as keyof typeof colors] || colors.medium;
};

export const getPriorityText = (priority: string): string => {
  const texts: Record<string, string> = { high: '高', medium: '中', low: '低' };
  return texts[priority] || '中';
};
