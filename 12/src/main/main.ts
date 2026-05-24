import { app, BrowserWindow, ipcMain, shell, Notification } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { DatabaseService } from './database';
import { IpcHandlers } from './ipc-handlers';
import { SyncManager } from './sync-manager';
import { PluginManager } from './plugin-manager';
import { BackupManager } from './backup-manager';
import { getAppDataPath, ensureDir } from './utils/paths';
import { AppSettings } from '../shared/types';

let mainWindow: BrowserWindow | null = null;
let dbService: DatabaseService | null = null;
let syncManager: SyncManager | null = null;
let pluginManager: PluginManager | null = null;
let backupManager: BackupManager | null = null;
let ipcHandlers: IpcHandlers | null = null;

const isDev = process.env.NODE_ENV === 'development';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    backgroundColor: '#ffffff',
    title: 'Solo Mail',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      sandbox: false,
      webSecurity: true
    },
    show: false
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show();
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

async function initializeApp() {
  try {
    const appDataPath = getAppDataPath();
    ensureDir(appDataPath);
    ensureDir(path.join(appDataPath, 'attachments'));
    ensureDir(path.join(appDataPath, 'plugins'));
    ensureDir(path.join(appDataPath, 'backups'));

    dbService = new DatabaseService(appDataPath);
    await dbService.initialize();

    syncManager = new SyncManager(dbService, mainWindow);
    pluginManager = new PluginManager(appDataPath, dbService, mainWindow);
    backupManager = new BackupManager(appDataPath, dbService);

    ipcHandlers = new IpcHandlers(dbService, syncManager, pluginManager, backupManager);
    ipcHandlers.registerHandlers();

    const settings = await dbService.getSettings();
    if (settings.notifications) {
      setupNotificationHandler();
    }

    syncManager.startAutoSync();
    backupManager.startAutoBackup();
    pluginManager.loadPlugins();

    if (isDev) {
      console.log('Application initialized successfully');
    }
  } catch (error) {
    console.error('Failed to initialize application:', error);
    throw error;
  }
}

function setupNotificationHandler() {
  if (Notification.isSupported()) {
    ipcMain.on('show-notification', (_event, title: string, body: string) => {
      new Notification({ title, body, silent: false }).show();
    });
  }
}

app.whenReady().then(async () => {
  await initializeApp();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    syncManager?.stopAutoSync();
    backupManager?.stopAutoBackup();
    dbService?.close();
    app.quit();
  }
});

app.on('before-quit', () => {
  syncManager?.stopAutoSync();
  backupManager?.stopAutoBackup();
  dbService?.close();
});

app.on('web-contents-created', (_event, contents) => {
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    if (parsedUrl.origin !== 'http://localhost:5173' && !navigationUrl.startsWith('file://')) {
      event.preventDefault();
    }
  });
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
