import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Task } from '../types/models';
import { formatDate } from '../utils/helpers';

export const ShareService = {
  shareTask: async (task: Task): Promise<void> => {
    const taskText = formatTaskAsText(task);

    if (!(await Sharing.isAvailableAsync())) {
      throw new Error('当前设备不支持分享功能');
    }

    const fileUri = `${FileSystem.cacheDirectory}task_${task.id}.txt`;
    await FileSystem.writeAsStringAsync(fileUri, taskText);

    await Sharing.shareAsync(fileUri, {
      mimeType: 'text/plain',
      dialogTitle: `分享任务: ${task.title}`,
      UTI: 'public.plain-text',
    });
  },

  shareTaskAsText: async (task: Task): Promise<string> => {
    return formatTaskAsText(task);
  },

  formatTaskAsText: (task: Task): string => {
    return formatTaskAsText(task);
  },
};

const formatTaskAsText = (task: Task): string => {
  let text = `📋 ${task.title}\n\n`;

  if (task.description) {
    text += `📝 ${task.description}\n\n`;
  }

  if (task.dueDate) {
    text += `⏰ 截止时间: ${formatDate(task.dueDate)}\n`;
  }

  const priorityText = task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低';
  text += `🚩 优先级: ${priorityText}\n`;

  if (task.repeatConfig.rule !== 'none') {
    const repeatText =
      task.repeatConfig.rule === 'daily' ? '每天' :
      task.repeatConfig.rule === 'weekly' ? '每周' :
      task.repeatConfig.rule === 'monthly' ? '每月' : '自定义';
    text += `🔄 重复: ${repeatText}\n`;
  }

  if (task.location) {
    text += `📍 地点: ${task.location.address}\n`;
  }

  text += `\n——来自 TodoApp`;

  return text;
};
