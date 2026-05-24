import * as path from 'path';
import * as fs from 'fs';
import { DatabaseService } from './database';

export class BackupManager {
  private appDataPath: string;
  private dbService: DatabaseService;
  private autoBackupInterval: NodeJS.Timeout | null;

  constructor(appDataPath: string, dbService: DatabaseService) {
    this.appDataPath = appDataPath;
    this.dbService = dbService;
    this.autoBackupInterval = null;
  }

  startAutoBackup(): void {
    try {
      if (this.autoBackupInterval) {
        return;
      }

      this.autoBackupInterval = setInterval(async () => {
        try {
          const settings = await this.dbService.getSettings();
          if (settings.backupSettings.enabled) {
            const now = Date.now();
            if (!settings.backupSettings.nextBackupAt || now >= settings.backupSettings.nextBackupAt) {
              await this.startBackup();
              await this.dbService.updateSettings({
                backupSettings: {
                  ...settings.backupSettings,
                  lastBackupAt: now,
                  nextBackupAt: now + settings.backupSettings.interval
                }
              });
            }
          }
        } catch (error) {
          console.error('Auto backup failed:', error);
        }
      }, 60 * 60 * 1000);

      console.log('Auto backup started');
    } catch (error) {
      console.error('Failed to start auto backup:', error);
    }
  }

  stopAutoBackup(): void {
    try {
      if (this.autoBackupInterval) {
        clearInterval(this.autoBackupInterval);
        this.autoBackupInterval = null;
        console.log('Auto backup stopped');
      }
    } catch (error) {
      console.error('Failed to stop auto backup:', error);
    }
  }

  async startBackup(): Promise<boolean> {
    try {
      const settings = await this.dbService.getSettings();
      const backupDir = settings.backupSettings.destination || path.join(this.appDataPath, 'backups');

      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(backupDir, `solo-mail-backup-${timestamp}.db`);
      const dbPath = this.dbService.getDatabasePath();

      if (fs.existsSync(dbPath)) {
        fs.copyFileSync(dbPath, backupPath);
        console.log('Backup created at:', backupPath);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Backup failed:', error);
      throw error;
    }
  }

  async restoreBackup(backupPath: string): Promise<boolean> {
    try {
      if (!fs.existsSync(backupPath)) {
        throw new Error('Backup file not found');
      }

      const dbPath = this.dbService.getDatabasePath();
      this.dbService.close();

      fs.copyFileSync(backupPath, dbPath);
      await this.dbService.initialize();

      console.log('Backup restored from:', backupPath);
      return true;
    } catch (error) {
      console.error('Restore failed:', error);
      throw error;
    }
  }

  async listBackups(): Promise<{ path: string; createdAt: number; size: number }[]> {
    try {
      const settings = await this.dbService.getSettings();
      const backupDir = settings.backupSettings.destination || path.join(this.appDataPath, 'backups');

      if (!fs.existsSync(backupDir)) {
        return [];
      }

      const files = fs.readdirSync(backupDir);
      const backups: { path: string; createdAt: number; size: number }[] = [];

      for (const file of files) {
        if (file.endsWith('.db')) {
          const filePath = path.join(backupDir, file);
          const stats = fs.statSync(filePath);
          backups.push({
            path: filePath,
            createdAt: stats.mtime.getTime(),
            size: stats.size
          });
        }
      }

      return backups.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      console.error('Failed to list backups:', error);
      throw error;
    }
  }
}
