import {TimeRemaining, CountdownEvent, RepeatInterval} from '@types';
import {addYears, addMonths, addWeeks, addDays, differenceInSeconds, isAfter} from 'date-fns';

export const calculateTimeRemaining = (targetDate: number): TimeRemaining => {
  const now = Date.now();
  const diff = differenceInSeconds(targetDate, now);
  const isPast = diff < 0;
  const absDiff = Math.abs(diff);

  const days = Math.floor(absDiff / 86400);
  const hours = Math.floor((absDiff % 86400) / 3600);
  const minutes = Math.floor((absDiff % 3600) / 60);
  const seconds = absDiff % 60;

  return {
    days,
    hours,
    minutes,
    seconds,
    totalSeconds: diff,
    isPast,
  };
};

export const getCountdownStatus = (event: CountdownEvent): 'upcoming' | 'ongoing' | 'passed' => {
  const now = Date.now();
  if (event.targetDate > now) {
    return 'upcoming';
  }
  if (event.repeatInterval !== 'none') {
    return 'ongoing';
  }
  return 'passed';
};

export const calculateNextOccurrence = (
  currentDate: number,
  interval: RepeatInterval,
): number => {
  const date = new Date(currentDate);
  switch (interval) {
    case 'daily':
      return addDays(date, 1).getTime();
    case 'weekly':
      return addWeeks(date, 1).getTime();
    case 'monthly':
      return addMonths(date, 1).getTime();
    case 'yearly':
      return addYears(date, 1).getTime();
    default:
      return currentDate;
  }
};

export const shouldUpdateRepeatingEvent = (event: CountdownEvent): boolean => {
  if (event.repeatInterval === 'none') {
    return false;
  }
  return isAfter(Date.now(), event.targetDate);
};

export const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });
};

export const formatDateTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

export const padZero = (num: number): string => {
  return num.toString().padStart(2, '0');
};

export const formatCountdownDisplay = (
  timeRemaining: TimeRemaining,
  showSeconds: boolean = true,
): string => {
  const {days, hours, minutes, seconds, isPast} = timeRemaining;
  const prefix = isPast ? '已过 ' : '剩余 ';

  if (days > 0) {
    return `${prefix}${days}天 ${padZero(hours)}:${padZero(minutes)}${showSeconds ? ':' + padZero(seconds) : ''}`;
  }

  if (hours > 0) {
    return `${prefix}${padZero(hours)}:${padZero(minutes)}${showSeconds ? ':' + padZero(seconds) : ''}`;
  }

  return `${prefix}${padZero(minutes)}${showSeconds ? ':' + padZero(seconds) : ''}`;
};

export const generateId = (): string => {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const getContrastColor = (hexColor: string): string => {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? '#000000' : '#FFFFFF';
};

export const getDaysUntilNextBirthday = (birthday: number): number => {
  const now = new Date();
  const birthDate = new Date(birthday);
  let nextBirthday = new Date(
    now.getFullYear(),
    birthDate.getMonth(),
    birthDate.getDate(),
    birthDate.getHours(),
    birthDate.getMinutes(),
  );

  if (nextBirthday < now) {
    nextBirthday = new Date(
      now.getFullYear() + 1,
      birthDate.getMonth(),
      birthDate.getDate(),
      birthDate.getHours(),
      birthDate.getMinutes(),
    );
  }

  const diff = nextBirthday.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};
