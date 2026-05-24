import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  file: {
    read: (path: string) => ipcRenderer.invoke('file:read', path),
    write: (path: string, content: string, encrypted?: boolean, password?: string) =>
      ipcRenderer.invoke('file:write', path, content, encrypted, password),
    delete: (path: string) => ipcRenderer.invoke('file:delete', path),
    move: (from: string, to: string) => ipcRenderer.invoke('file:move', from, to),
    exists: (path: string) => ipcRenderer.invoke('file:exists', path),
  },
  dir: {
    list: (path: string) => ipcRenderer.invoke('dir:list', path),
    create: (path: string) => ipcRenderer.invoke('dir:create', path),
    delete: (path: string) => ipcRenderer.invoke('dir:delete', path),
  },
  version: {
    save: (notePath: string, content: string, message?: string) =>
      ipcRenderer.invoke('version:save', notePath, content, message),
    list: (notePath: string) => ipcRenderer.invoke('version:list', notePath),
    restore: (notePath: string, snapshotId: string) =>
      ipcRenderer.invoke('version:restore', notePath, snapshotId),
    delete: (notePath: string, snapshotId: string) =>
      ipcRenderer.invoke('version:delete', notePath, snapshotId),
  },
  export: {
    pdf: (html: string, outputPath: string, options?: object) =>
      ipcRenderer.invoke('export:pdf', html, outputPath, options),
    html: (html: string, outputPath: string, options?: object) =>
      ipcRenderer.invoke('export:html', html, outputPath, options),
    image: (imageData: string, outputPath: string) =>
      ipcRenderer.invoke('export:image', imageData, outputPath),
    zip: (notebookPath: string, outputPath: string) =>
      ipcRenderer.invoke('export:zip', notebookPath, outputPath),
  },
  tray: {
    pin: (notePath: string, noteTitle: string) =>
      ipcRenderer.invoke('tray:pin', notePath, noteTitle),
    unpin: (notePath: string) => ipcRenderer.invoke('tray:unpin', notePath),
    getPinned: () => ipcRenderer.invoke('tray:getPinned'),
  },
  upload: {
    image: (imagePath: string, config: object) =>
      ipcRenderer.invoke('upload:image', imagePath, config),
    clipboardImage: () => ipcRenderer.invoke('upload:clipboardImage'),
  },
  crypto: {
    encrypt: (content: string, password: string) =>
      ipcRenderer.invoke('crypto:encrypt', content, password),
    decrypt: (encrypted: string, password: string) =>
      ipcRenderer.invoke('crypto:decrypt', encrypted, password),
    verifyPassword: (encrypted: string, password: string) =>
      ipcRenderer.invoke('crypto:verifyPassword', encrypted, password),
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    set: (settings: object) => ipcRenderer.invoke('settings:set', settings),
  },
  app: {
    getPath: (name: string) => ipcRenderer.invoke('app:getPath', name),
    showOpenDialog: (options: object) => ipcRenderer.invoke('app:showOpenDialog', options),
    showSaveDialog: (options: object) => ipcRenderer.invoke('app:showSaveDialog', options),
    showMessageBox: (options: object) => ipcRenderer.invoke('app:showMessageBox', options),
    openExternal: (url: string) => ipcRenderer.invoke('app:openExternal', url),
  },
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    setTitle: (title: string) => ipcRenderer.invoke('window:setTitle', title),
  },
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    ipcRenderer.on(channel, (_event, ...args) => callback(...args));
  },
  removeListener: (channel: string, callback: (...args: unknown[]) => void) => {
    ipcRenderer.removeListener(channel, callback);
  },
});

declare global {
  interface Window {
    electronAPI: {
      file: {
        read: (path: string) => Promise<string>;
        write: (path: string, content: string, encrypted?: boolean, password?: string) => Promise<boolean>;
        delete: (path: string) => Promise<boolean>;
        move: (from: string, to: string) => Promise<boolean>;
        exists: (path: string) => Promise<boolean>;
      };
      dir: {
        list: (path: string) => Promise<unknown[]>;
        create: (path: string) => Promise<boolean>;
        delete: (path: string) => Promise<boolean>;
      };
      version: {
        save: (notePath: string, content: string, message?: string) => Promise<string>;
        list: (notePath: string) => Promise<unknown[]>;
        restore: (notePath: string, snapshotId: string) => Promise<string>;
        delete: (notePath: string, snapshotId: string) => Promise<boolean>;
      };
      export: {
        pdf: (html: string, outputPath: string, options?: object) => Promise<boolean>;
        html: (html: string, outputPath: string, options?: object) => Promise<boolean>;
        image: (imageData: string, outputPath: string) => Promise<boolean>;
        zip: (notebookPath: string, outputPath: string) => Promise<boolean>;
      };
      tray: {
        pin: (notePath: string, noteTitle: string) => Promise<boolean>;
        unpin: (notePath: string) => Promise<boolean>;
        getPinned: () => Promise<unknown[]>;
      };
      upload: {
        image: (imagePath: string, config: object) => Promise<string>;
        clipboardImage: () => Promise<string | null>;
      };
      crypto: {
        encrypt: (content: string, password: string) => Promise<string>;
        decrypt: (encrypted: string, password: string) => Promise<string | null>;
        verifyPassword: (encrypted: string, password: string) => Promise<boolean>;
      };
      settings: {
        get: () => Promise<unknown>;
        set: (settings: object) => Promise<boolean>;
      };
      app: {
        getPath: (name: string) => Promise<string>;
        showOpenDialog: (options: object) => Promise<unknown>;
        showSaveDialog: (options: object) => Promise<unknown>;
        showMessageBox: (options: object) => Promise<unknown>;
        openExternal: (url: string) => Promise<void>;
      };
      window: {
        minimize: () => Promise<void>;
        maximize: () => Promise<void>;
        close: () => Promise<void>;
        setTitle: (title: string) => Promise<void>;
      };
      on: (channel: string, callback: (...args: unknown[]) => void) => void;
      removeListener: (channel: string, callback: (...args: unknown[]) => void) => void;
    };
  }
}
