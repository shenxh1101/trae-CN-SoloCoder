import { ipcMain, dialog, app, BrowserWindow, shell } from 'electron';
import * as fileManager from '../modules/fileManager';
import * as versionControl from '../modules/versionControl';
import * as exporter from '../modules/exporter';
import * as tray from '../modules/tray';
import * as uploader from '../modules/uploader';
import * as encryptor from '../modules/encryptor';
import * as settings from '../modules/settings';

export function registerIpcHandlers(mainWindow: BrowserWindow | null): void {
  ipcMain.handle('file:read', async (_event, filePath: string, password?: string) => {
    try {
      return fileManager.readFile(filePath, password);
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('file:write', async (_event, filePath: string, content: string, encrypted?: boolean, password?: string) => {
    return fileManager.writeFile(filePath, content, encrypted, password);
  });

  ipcMain.handle('file:delete', async (_event, filePath: string) => {
    return fileManager.deleteFile(filePath);
  });

  ipcMain.handle('file:move', async (_event, fromPath: string, toPath: string) => {
    return fileManager.moveFile(fromPath, toPath);
  });

  ipcMain.handle('file:exists', async (_event, filePath: string) => {
    return fileManager.fileExists(filePath);
  });

  ipcMain.handle('dir:list', async (_event, dirPath: string) => {
    return fileManager.listDirectory(dirPath);
  });

  ipcMain.handle('dir:create', async (_event, dirPath: string) => {
    return fileManager.createDirectory(dirPath);
  });

  ipcMain.handle('dir:delete', async (_event, dirPath: string) => {
    return fileManager.deleteDirectory(dirPath);
  });

  ipcMain.handle('version:save', async (_event, notePath: string, content: string, message?: string) => {
    return versionControl.saveSnapshot(notePath, content, message);
  });

  ipcMain.handle('version:list', async (_event, notePath: string) => {
    return versionControl.listSnapshots(notePath);
  });

  ipcMain.handle('version:restore', async (_event, notePath: string, snapshotId: string) => {
    return versionControl.restoreSnapshot(notePath, snapshotId);
  });

  ipcMain.handle('version:delete', async (_event, notePath: string, snapshotId: string) => {
    return versionControl.deleteSnapshot(notePath, snapshotId);
  });

  ipcMain.handle('export:pdf', async (_event, html: string, outputPath: string, options?: object) => {
    return exporter.exportPdf(html, outputPath);
  });

  ipcMain.handle('export:html', async (_event, html: string, outputPath: string, options?: object) => {
    return exporter.exportHtml(html, outputPath);
  });

  ipcMain.handle('export:image', async (_event, imageData: string, outputPath: string) => {
    return exporter.exportImage(imageData, outputPath);
  });

  ipcMain.handle('export:zip', async (_event, notebookPath: string, outputPath: string) => {
    return exporter.exportZip(notebookPath, outputPath);
  });

  ipcMain.handle('tray:pin', async (_event, notePath: string, noteTitle: string) => {
    return tray.pinNote(notePath, noteTitle);
  });

  ipcMain.handle('tray:unpin', async (_event, notePath: string) => {
    return tray.unpinNote(notePath);
  });

  ipcMain.handle('tray:getPinned', async () => {
    return tray.getPinnedNotes();
  });

  ipcMain.handle('upload:image', async (_event, imagePath: string, config: uploader.UploadConfig) => {
    return uploader.uploadImage(imagePath, config);
  });

  ipcMain.handle('upload:clipboardImage', async () => {
    return uploader.getClipboardImage();
  });

  ipcMain.handle('crypto:encrypt', async (_event, content: string, password: string) => {
    return encryptor.encrypt(content, password);
  });

  ipcMain.handle('crypto:decrypt', async (_event, encrypted: string, password: string) => {
    return encryptor.decrypt(encrypted, password);
  });

  ipcMain.handle('crypto:verifyPassword', async (_event, encrypted: string, password: string) => {
    return encryptor.verifyPassword(encrypted, password);
  });

  ipcMain.handle('settings:get', async () => {
    return settings.loadSettings();
  });

  ipcMain.handle('settings:set', async (_event, newSettings: object) => {
    return settings.saveSettings(newSettings);
  });

  ipcMain.handle('app:getPath', async (_event, name: string) => {
    return app.getPath(name as Parameters<typeof app.getPath>[0]);
  });

  ipcMain.handle('app:showOpenDialog', async (_event, options: Electron.OpenDialogOptions) => {
    if (!mainWindow) return null;
    return dialog.showOpenDialog(mainWindow, options);
  });

  ipcMain.handle('app:showSaveDialog', async (_event, options: Electron.SaveDialogOptions) => {
    if (!mainWindow) return null;
    return dialog.showSaveDialog(mainWindow, options);
  });

  ipcMain.handle('app:showMessageBox', async (_event, options: Electron.MessageBoxOptions) => {
    if (!mainWindow) return null;
    return dialog.showMessageBox(mainWindow, options);
  });

  ipcMain.handle('app:openExternal', async (_event, url: string) => {
    return shell.openExternal(url);
  });

  ipcMain.handle('window:minimize', async () => {
    if (mainWindow) {
      mainWindow.minimize();
    }
  });

  ipcMain.handle('window:maximize', async () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });

  ipcMain.handle('window:close', async () => {
    if (mainWindow) {
      mainWindow.close();
    }
  });

  ipcMain.handle('window:setTitle', async (_event, title: string) => {
    if (mainWindow) {
      mainWindow.setTitle(title);
    }
  });
}
