export const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const parseDate = (dateStr: string): Date => {
  return new Date(dateStr);
};

export const getMonthStart = (year: number, month: number): Date => {
  return new Date(year, month - 1, 1);
};

export const getMonthEnd = (year: number, month: number): Date => {
  return new Date(year, month, 0);
};

export const isInMonth = (dateStr: string, year: number, month: number): boolean => {
  const date = parseDate(dateStr);
  return date.getFullYear() === year && date.getMonth() + 1 === month;
};

export const getLast7Days = (): string[] => {
  const days: string[] = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    days.push(formatDate(date));
  }
  return days;
};

export const formatDisplayDate = (dateStr: string): string => {
  const date = parseDate(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const weekday = weekdays[date.getDay()];
  return `${month}月${day}日 ${weekday}`;
};

export const getCurrentMonth = (): { year: number; month: number } => {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
};

export const getMonthLabel = (year: number, month: number): string => {
  return `${year}年${month}月`;
};
