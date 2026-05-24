import type { Language } from '@/shared/types';
import {
  FileCode2,
  FileJson,
  FileText,
  Code2,
  type LucideIcon,
} from 'lucide-react';

export const formatDate = (date: Date | string | null | undefined): string => {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  if (hours < 24) return `${hours} 小时前`;
  if (days < 7) return `${days} 天前`;
  if (days < 30) return `${Math.floor(days / 7)} 周前`;
  if (days < 365) return `${Math.floor(days / 30)} 个月前`;
  return `${Math.floor(days / 365)} 年前`;
};

export const formatDateTime = (date: Date | string | null | undefined): string => {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const languageConfig: Record<Language, { name: string; icon: LucideIcon; color: string }> = {
  javascript: {
    name: 'JavaScript',
    icon: FileCode2,
    color: '#f7df1e',
  },
  python: {
    name: 'Python',
    icon: FileJson,
    color: '#3776ab',
  },
  go: {
    name: 'Go',
    icon: Code2,
    color: '#00add8',
  },
  rust: {
    name: 'Rust',
    icon: FileText,
    color: '#dea584',
  },
};

export const getLanguageIcon = (language: Language): LucideIcon => {
  return languageConfig[language]?.icon || FileCode2;
};

export const getLanguageName = (language: Language): string => {
  return languageConfig[language]?.name || language;
};

export const getLanguageColor = (language: Language): string => {
  return languageConfig[language]?.color || '#6b7280';
};

export const generateColor = (seed: string): string => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
    '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
    '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
    '#ec4899', '#f43f5e',
  ];
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

export const generateRandomColor = (): string => {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
};

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

export const formatNumber = (num: number): string => {
  if (num < 1000) return num.toString();
  if (num < 1000000) return (num / 1000).toFixed(1) + 'k';
  return (num / 1000000).toFixed(1) + 'M';
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      return true;
    } catch {
      return false;
    } finally {
      document.body.removeChild(textArea);
    }
  }
};
