import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { BackupData } from '../types/models';

const BACKUP_FILE_NAME = 'todo_backup.json';

export const BackupService = {
  exportToLocalFile: async (data: BackupData): Promise<string> => {
    const fileUri = `${FileSystem.documentDirectory}${BACKUP_FILE_NAME}`;
    await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(data, null, 2));
    return fileUri;
  },

  importFromLocalFile: async (fileUri: string): Promise<BackupData> => {
    const content = await FileSystem.readAsStringAsync(fileUri);
    return JSON.parse(content) as BackupData;
  },

  shareBackupFile: async (fileUri: string): Promise<void> => {
    if (!(await Sharing.isAvailableAsync())) {
      throw new Error('当前设备不支持文件分享');
    }
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/json',
      dialogTitle: '分享备份文件',
      UTI: 'public.json',
    });
  },

  uploadToCloud: async (data: BackupData, token: string): Promise<void> => {
    const response = await fetch('https://api.todoapp.example.com/backup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('上传到云端失败');
    }
  },

  downloadFromCloud: async (token: string): Promise<BackupData> => {
    const response = await fetch('https://api.todoapp.example.com/backup', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('从云端下载失败');
    }

    return await response.json() as BackupData;
  },

  getBackupInfo: async (token: string): Promise<{ lastBackup: number; size: number } | null> => {
    try {
      const response = await fetch('https://api.todoapp.example.com/backup/info', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  },
};
