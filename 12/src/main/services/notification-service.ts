import { Notification, app } from 'electron';
import { DatabaseService } from '../database';
import type { Email, AppSettings } from '../../shared/types';

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  silent?: boolean;
  urgency?: 'normal' | 'critical' | 'low';
  timeoutType?: 'default' | 'never';
  data?: Record<string, any>;
}

export interface NewEmailNotificationOptions extends NotificationOptions {
  emailId: string;
  accountId: string;
  folderId: string;
}

export interface NotificationRecord {
  id: string;
  type: 'new-email' | 'system' | 'warning' | 'error' | 'info';
  title: string;
  body: string;
  read: boolean;
  createdAt: number;
  data?: Record<string, any>;
}

export type NotificationClickHandler = (notification: NotificationRecord) => void;

export class NotificationService {
  private dbService: DatabaseService;
  private enabled: boolean = true;
  private clickHandler?: NotificationClickHandler;
  private notifications: Map<string, NotificationRecord> = new Map();
  private maxNotifications: number = 100;

  constructor(dbService: DatabaseService) {
    this.dbService = dbService;
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      const settings = await this.dbService.getSettings();
      this.enabled = settings.notifications;
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
    }
  }

  setClickHandler(handler: NotificationClickHandler): void {
    this.clickHandler = handler;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async notifyNewEmail(email: Email, settings?: AppSettings): Promise<NotificationRecord | null> {
    try {
      if (!this.enabled || (settings && !settings.notifications)) {
        return null;
      }

      if (!Notification.isSupported()) {
        console.warn('Notifications are not supported on this platform');
        return null;
      }

      const notificationOptions: NotificationOptions = {
        title: `新邮件: ${email.from.name || email.from.email}`,
        body: this.truncateText(email.subject || '(无主题)', 100),
        silent: false,
        urgency: 'normal',
        data: {
          emailId: email.id,
          accountId: email.accountId,
          folderId: email.folderId
        }
      };

      const record = await this.createNotification('new-email', notificationOptions);

      const notification = new Notification({
        title: notificationOptions.title,
        body: notificationOptions.body,
        silent: notificationOptions.silent,
        urgency: notificationOptions.urgency
      });

      notification.on('click', () => {
        if (this.clickHandler) {
          this.clickHandler(record);
        }
      });

      notification.show();

      return record;
    } catch (error) {
      console.error('Failed to send new email notification:', error);
      return null;
    }
  }

  async notifyNewEmails(emails: Email[]): Promise<NotificationRecord[]> {
    const records: NotificationRecord[] = [];

    if (emails.length === 0) {
      return records;
    }

    if (emails.length === 1) {
      const record = await this.notifyNewEmail(emails[0]);
      if (record) {
        records.push(record);
      }
      return records;
    }

    try {
      if (!this.enabled) {
        return records;
      }

      if (!Notification.isSupported()) {
        console.warn('Notifications are not supported on this platform');
        return records;
      }

      const notificationOptions: NotificationOptions = {
        title: `${emails.length} 封新邮件`,
        body: `您有 ${emails.length} 封新邮件等待查看`,
        silent: false,
        urgency: 'normal'
      };

      const record = await this.createNotification('new-email', notificationOptions);

      const notification = new Notification({
        title: notificationOptions.title,
        body: notificationOptions.body,
        silent: notificationOptions.silent,
        urgency: notificationOptions.urgency
      });

      notification.on('click', () => {
        if (this.clickHandler) {
          this.clickHandler(record);
        }
      });

      notification.show();

      records.push(record);

      for (const email of emails.slice(0, 4)) {
        const emailRecord = await this.createNotification('new-email', {
          title: `新邮件: ${email.from.name || email.from.email}`,
          body: this.truncateText(email.subject || '(无主题)', 100),
          data: {
            emailId: email.id,
            accountId: email.accountId,
            folderId: email.folderId
          }
        });
        records.push(emailRecord);
      }

      return records;
    } catch (error) {
      console.error('Failed to send new emails notification:', error);
      return records;
    }
  }

  async notifySystem(title: string, message: string, urgency: 'normal' | 'critical' | 'low' = 'normal'): Promise<NotificationRecord | null> {
    try {
      if (!this.enabled) {
        return null;
      }

      if (!Notification.isSupported()) {
        console.warn('Notifications are not supported on this platform');
        return null;
      }

      const options: NotificationOptions = {
        title,
        body: message,
        urgency
      };

      const record = await this.createNotification('system', options);

      const notification = new Notification({
        title: options.title,
        body: options.body,
        urgency: options.urgency
      });

      notification.on('click', () => {
        if (this.clickHandler) {
          this.clickHandler(record);
        }
      });

      notification.show();

      return record;
    } catch (error) {
      console.error('Failed to send system notification:', error);
      return null;
    }
  }

  async notifyError(title: string, error: Error | string): Promise<NotificationRecord | null> {
    const message = error instanceof Error ? error.message : error;
    return this.notifySystem(`错误: ${title}`, message, 'critical');
  }

  async notifyWarning(title: string, message: string): Promise<NotificationRecord | null> {
    return this.notifySystem(`警告: ${title}`, message, 'normal');
  }

  async notifyInfo(title: string, message: string): Promise<NotificationRecord | null> {
    return this.notifySystem(title, message, 'low');
  }

  private async createNotification(
    type: NotificationRecord['type'],
    options: NotificationOptions
  ): Promise<NotificationRecord> {
    const id = this.generateNotificationId();
    const now = Date.now();

    const record: NotificationRecord = {
      id,
      type,
      title: options.title,
      body: options.body,
      read: false,
      createdAt: now,
      data: options.data
    };

    this.notifications.set(id, record);
    await this.cleanupOldNotifications();

    return record;
  }

  async getNotifications(includeRead: boolean = false, limit?: number): Promise<NotificationRecord[]> {
    let records = Array.from(this.notifications.values())
      .sort((a, b) => b.createdAt - a.createdAt);

    if (!includeRead) {
      records = records.filter(n => !n.read);
    }

    if (limit) {
      records = records.slice(0, limit);
    }

    return records;
  }

  async getUnreadCount(): Promise<number> {
    return Array.from(this.notifications.values()).filter(n => !n.read).length;
  }

  async markAsRead(notificationId: string): Promise<boolean> {
    const notification = this.notifications.get(notificationId);
    if (!notification) {
      return false;
    }

    notification.read = true;
    return true;
  }

  async markAllAsRead(): Promise<number> {
    let count = 0;
    for (const notification of this.notifications.values()) {
      if (!notification.read) {
        notification.read = true;
        count++;
      }
    }
    return count;
  }

  async clearNotification(notificationId: string): Promise<boolean> {
    return this.notifications.delete(notificationId);
  }

  async clearAllNotifications(): Promise<number> {
    const count = this.notifications.size;
    this.notifications.clear();
    return count;
  }

  async clearReadNotifications(): Promise<number> {
    let count = 0;
    for (const [id, notification] of this.notifications) {
      if (notification.read) {
        this.notifications.delete(id);
        count++;
      }
    }
    return count;
  }

  private async cleanupOldNotifications(): Promise<void> {
    if (this.notifications.size <= this.maxNotifications) {
      return;
    }

    const sorted = Array.from(this.notifications.values())
      .sort((a, b) => a.createdAt - b.createdAt);

    const toRemove = sorted.slice(0, sorted.length - this.maxNotifications);
    for (const notification of toRemove) {
      this.notifications.delete(notification.id);
    }
  }

  private generateNotificationId(): string {
    return `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength - 3) + '...';
  }

  async updateSettings(settings: AppSettings): Promise<void> {
    this.enabled = settings.notifications;
  }

  async notifySyncStarted(): Promise<NotificationRecord | null> {
    return this.notifyInfo('同步已开始', '正在同步您的邮件...');
  }

  async notifySyncCompleted(emailCount: number): Promise<NotificationRecord | null> {
    if (emailCount === 0) {
      return null;
    }
    return this.notifyInfo('同步完成', `已同步 ${emailCount} 封新邮件`);
  }

  async notifySyncError(error: Error | string): Promise<NotificationRecord | null> {
    return this.notifyError('同步失败', error);
  }

  async notifyBackupStarted(): Promise<NotificationRecord | null> {
    return this.notifyInfo('备份已开始', '正在备份您的数据...');
  }

  async notifyBackupCompleted(): Promise<NotificationRecord | null> {
    return this.notifyInfo('备份完成', '您的数据已成功备份');
  }

  async notifyBackupError(error: Error | string): Promise<NotificationRecord | null> {
    return this.notifyError('备份失败', error);
  }

  async notifyPluginInstalled(pluginName: string): Promise<NotificationRecord | null> {
    return this.notifyInfo('插件已安装', `${pluginName} 已成功安装`);
  }

  async notifyPluginError(pluginName: string, error: Error | string): Promise<NotificationRecord | null> {
    return this.notifyError(`插件错误: ${pluginName}`, error);
  }

  getNotification(notificationId: string): NotificationRecord | undefined {
    return this.notifications.get(notificationId);
  }

  setMaxNotifications(max: number): void {
    this.maxNotifications = max;
  }

  getMaxNotifications(): number {
    return this.maxNotifications;
  }
}
