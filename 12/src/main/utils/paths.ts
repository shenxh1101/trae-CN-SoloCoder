import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';

export function getAppDataPath(): string {
  if (app) {
    return path.join(app.getPath('userData'));
  }
  const homeDir = process.env.HOME || process.env.USERPROFILE || '';
  const appDataDir = process.platform === 'darwin'
    ? path.join(homeDir, 'Library', 'Application Support', 'Solo Mail')
    : process.platform === 'win32'
      ? path.join(process.env.APPDATA || path.join(homeDir, 'AppData', 'Roaming'), 'Solo Mail')
      : path.join(process.env.XDG_CONFIG_HOME || path.join(homeDir, '.config'), 'solo-mail');
  return appDataDir;
}

export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function getAttachmentsPath(accountId?: string, emailId?: string): string {
  const basePath = path.join(getAppDataPath(), 'attachments');
  ensureDir(basePath);
  
  let fullPath = basePath;
  if (accountId) {
    fullPath = path.join(fullPath, accountId);
    ensureDir(fullPath);
  }
  if (emailId) {
    fullPath = path.join(fullPath, emailId);
    ensureDir(fullPath);
  }
  
  return fullPath;
}

export function getPluginsPath(): string {
  const pluginsPath = path.join(getAppDataPath(), 'plugins');
  ensureDir(pluginsPath);
  return pluginsPath;
}

export function getBackupsPath(): string {
  const backupsPath = path.join(getAppDataPath(), 'backups');
  ensureDir(backupsPath);
  return backupsPath;
}

export function getDatabasePath(): string {
  return path.join(getAppDataPath(), 'solo-mail.db');
}

export function sanitizeFilename(filename: string): string {
  return filename.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_');
}
