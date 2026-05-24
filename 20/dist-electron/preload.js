import { contextBridge, ipcRenderer } from "electron";
contextBridge.exposeInMainWorld("electronAPI", {
  file: {
    read: (path) => ipcRenderer.invoke("file:read", path),
    write: (path, content, encrypted, password) => ipcRenderer.invoke("file:write", path, content, encrypted, password),
    delete: (path) => ipcRenderer.invoke("file:delete", path),
    move: (from, to) => ipcRenderer.invoke("file:move", from, to),
    exists: (path) => ipcRenderer.invoke("file:exists", path)
  },
  dir: {
    list: (path) => ipcRenderer.invoke("dir:list", path),
    create: (path) => ipcRenderer.invoke("dir:create", path),
    delete: (path) => ipcRenderer.invoke("dir:delete", path)
  },
  version: {
    save: (notePath, content, message) => ipcRenderer.invoke("version:save", notePath, content, message),
    list: (notePath) => ipcRenderer.invoke("version:list", notePath),
    restore: (notePath, snapshotId) => ipcRenderer.invoke("version:restore", notePath, snapshotId),
    delete: (notePath, snapshotId) => ipcRenderer.invoke("version:delete", notePath, snapshotId)
  },
  export: {
    pdf: (html, outputPath, options) => ipcRenderer.invoke("export:pdf", html, outputPath, options),
    html: (html, outputPath, options) => ipcRenderer.invoke("export:html", html, outputPath, options),
    image: (imageData, outputPath) => ipcRenderer.invoke("export:image", imageData, outputPath),
    zip: (notebookPath, outputPath) => ipcRenderer.invoke("export:zip", notebookPath, outputPath)
  },
  tray: {
    pin: (notePath, noteTitle) => ipcRenderer.invoke("tray:pin", notePath, noteTitle),
    unpin: (notePath) => ipcRenderer.invoke("tray:unpin", notePath),
    getPinned: () => ipcRenderer.invoke("tray:getPinned")
  },
  upload: {
    image: (imagePath, config) => ipcRenderer.invoke("upload:image", imagePath, config),
    clipboardImage: () => ipcRenderer.invoke("upload:clipboardImage")
  },
  crypto: {
    encrypt: (content, password) => ipcRenderer.invoke("crypto:encrypt", content, password),
    decrypt: (encrypted, password) => ipcRenderer.invoke("crypto:decrypt", encrypted, password),
    verifyPassword: (encrypted, password) => ipcRenderer.invoke("crypto:verifyPassword", encrypted, password)
  },
  settings: {
    get: () => ipcRenderer.invoke("settings:get"),
    set: (settings) => ipcRenderer.invoke("settings:set", settings)
  },
  app: {
    getPath: (name) => ipcRenderer.invoke("app:getPath", name),
    showOpenDialog: (options) => ipcRenderer.invoke("app:showOpenDialog", options),
    showSaveDialog: (options) => ipcRenderer.invoke("app:showSaveDialog", options),
    showMessageBox: (options) => ipcRenderer.invoke("app:showMessageBox", options),
    openExternal: (url) => ipcRenderer.invoke("app:openExternal", url)
  },
  window: {
    minimize: () => ipcRenderer.invoke("window:minimize"),
    maximize: () => ipcRenderer.invoke("window:maximize"),
    close: () => ipcRenderer.invoke("window:close"),
    setTitle: (title) => ipcRenderer.invoke("window:setTitle", title)
  },
  on: (channel, callback) => {
    ipcRenderer.on(channel, (_event, ...args) => callback(...args));
  },
  removeListener: (channel, callback) => {
    ipcRenderer.removeListener(channel, callback);
  }
});
//# sourceMappingURL=preload.js.map
