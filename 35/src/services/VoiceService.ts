import { RepeatConfig, Priority } from '../types/models';

export interface ParsedVoiceInput {
  title: string;
  dueDate: number | null;
  priority: Priority;
  description: string;
  listId: string;
  completed: boolean;
  completedAt: null;
  order: number;
  repeatConfig: RepeatConfig;
}

const timeKeywords: Record<string, number> = {
  '今天': 0,
  '明天': 1,
  '后天': 2,
  '大后天': 3,
  '下周': 7,
};

const priorityKeywords: Record<string, Priority> = {
  '紧急': 'high',
  '重要': 'high',
  '高优先级': 'high',
  '高': 'high',
  '普通': 'medium',
  '一般': 'medium',
  '中': 'medium',
  '不急': 'low',
  '低优先级': 'low',
  '低': 'low',
};

export const VoiceService = {
  parseVoiceInput: (input: string, defaultListId: string): ParsedVoiceInput => {
    let title = input;
    let dueDate: number | null = null;
    let priority: Priority = 'medium';
    let description = '';

    for (const [keyword, days] of Object.entries(timeKeywords)) {
      if (title.includes(keyword)) {
        const date = new Date();
        date.setDate(date.getDate() + days);
        date.setHours(23, 59, 0, 0);
        dueDate = date.getTime();
        title = title.replace(keyword, '').trim();
        break;
      }
    }

    const timeMatch = title.match(/(\d{1,2})[点:：](\d{0,2})/);
    if (timeMatch) {
      const hours = parseInt(timeMatch[1]);
      const minutes = parseInt(timeMatch[2] || '0');
      if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
        const date = dueDate ? new Date(dueDate) : new Date();
        date.setHours(hours, minutes, 0, 0);
        if (date.getTime() < Date.now() && !dueDate) {
          date.setDate(date.getDate() + 1);
        }
        dueDate = date.getTime();
        title = title.replace(timeMatch[0], '').trim();
      }
    }

    for (const [keyword, pri] of Object.entries(priorityKeywords)) {
      if (title.includes(keyword)) {
        priority = pri;
        title = title.replace(keyword, '').trim();
        break;
      }
    }

    const descMatch = title.match(/[,，](.+)$/);
    if (descMatch) {
      description = descMatch[1].trim();
      title = title.replace(descMatch[0], '').trim();
    }

    return {
      title: title || '语音任务',
      dueDate,
      priority,
      description,
      listId: defaultListId,
      completed: false,
      completedAt: null,
      order: 0,
      repeatConfig: { rule: 'none' } as RepeatConfig,
    };
  },
};
