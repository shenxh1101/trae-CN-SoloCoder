import type { EmailContact } from '@shared/types';

export const formatDate = (timestamp: number, format: 'short' | 'long' | 'relative' = 'short'): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (format === 'relative') {
    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}周前`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}个月前`;
    return `${Math.floor(diffDays / 365)}年前`;
  }

  if (format === 'short') {
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    }
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return '昨天';
    }
    if (diffDays < 7) {
      const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      return weekdays[date.getDay()];
    }
    if (date.getFullYear() === now.getFullYear()) {
      return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
    }
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

export const formatEmailAddress = (contact: EmailContact, showName = true): string => {
  if (!contact) return '';
  if (showName && contact.name && contact.name !== contact.email) {
    return `${contact.name} <${contact.email}>`;
  }
  return contact.email;
};

export const formatEmailList = (contacts: EmailContact[], max = 3): string => {
  if (!contacts || contacts.length === 0) return '';
  const visible = contacts.slice(0, max);
  const formatted = visible.map(c => formatEmailAddress(c, false));
  if (contacts.length > max) {
    formatted.push(`+${contacts.length - max}`);
  }
  return formatted.join(', ');
};

export const formatPreview = (text: string, maxLength = 150): string => {
  if (!text) return '';
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= maxLength) return cleaned;
  return cleaned.slice(0, maxLength) + '...';
};

export const formatInterval = (minutes: number): string => {
  if (minutes < 60) return `${minutes}分钟`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}小时`;
  return `${Math.floor(minutes / 1440)}天`;
};

export const getInitials = (name: string): string => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

export const getColorFromString = (str: string): string => {
  const colors = [
    '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
    '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
    '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
    '#ec4899', '#f43f5e'
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export const maskEmail = (email: string): string => {
  if (!email) return '';
  const [username, domain] = email.split('@');
  if (!domain) return email;
  
  const maskedUsername = username.length > 2
    ? username.charAt(0) + '*'.repeat(username.length - 2) + username.charAt(username.length - 1)
    : username.charAt(0) + '*';
  
  const domainParts = domain.split('.');
  const maskedDomain = domainParts.length > 1
    ? domainParts[0].charAt(0) + '*'.repeat(Math.max(0, domainParts[0].length - 2)) + (domainParts[0].length > 1 ? domainParts[0].charAt(domainParts[0].length - 1) : '') + '.' + domainParts.slice(1).join('.')
    : domain;
  
  return `${maskedUsername}@${maskedDomain}`;
};
