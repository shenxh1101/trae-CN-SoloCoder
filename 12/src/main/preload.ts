import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/ipc-channels';
import type {
  EmailAccount,
  MailFolder,
  Email,
  EmailLabel,
  FilterRule,
  EmailSignature,
  EmailTemplate,
  GpgKey,
  AppSettings,
  SearchQuery,
  SearchResult,
  PluginInfo,
  BackupSettings,
  Thread,
  IpcResponse,
  ServerConfig
} from '../shared/types';

const safeInvoke = async (channel: string, ...args: any[]): Promise<any> => {
  try {
    const response = await ipcRenderer.invoke(channel, ...args);
    if (response && response.success === false) {
      throw new Error(response.error || 'Unknown error');
    }
    return response?.data ?? response;
  } catch (error) {
    console.error(`IPC Error on ${channel}:`, error);
    throw error;
  }
};

const api = {
  account: {
    list: (): Promise<EmailAccount[]> => safeInvoke(IPC_CHANNELS.ACCOUNT.LIST),
    add: (account: Omit<EmailAccount, 'id' | 'createdAt' | 'updatedAt'>): Promise<EmailAccount> =>
      safeInvoke(IPC_CHANNELS.ACCOUNT.ADD, account),
    update: (id: string, account: Partial<EmailAccount>): Promise<EmailAccount> =>
      safeInvoke(IPC_CHANNELS.ACCOUNT.UPDATE, id, account),
    delete: (id: string): Promise<void> => safeInvoke(IPC_CHANNELS.ACCOUNT.DELETE, id),
    test: (account: Partial<EmailAccount>): Promise<boolean> => safeInvoke(IPC_CHANNELS.ACCOUNT.TEST, account),
    autoDiscover: (email: string, password: string): Promise<{ imap: ServerConfig; smtp: ServerConfig; provider: string }> =>
      safeInvoke(IPC_CHANNELS.ACCOUNT.AUTO_DISCOVER, email, password)
  },

  folder: {
    list: (accountId?: string): Promise<MailFolder[]> => safeInvoke(IPC_CHANNELS.FOLDER.LIST, accountId),
    sync: (folderId: string): Promise<boolean> => safeInvoke(IPC_CHANNELS.FOLDER.SYNC, folderId),
    create: (accountId: string, name: string, parentId?: string): Promise<MailFolder> =>
      safeInvoke(IPC_CHANNELS.FOLDER.CREATE, accountId, name, parentId),
    delete: (folderId: string): Promise<void> => safeInvoke(IPC_CHANNELS.FOLDER.DELETE, folderId),
    rename: (folderId: string, newName: string): Promise<MailFolder> =>
      safeInvoke(IPC_CHANNELS.FOLDER.RENAME, folderId, newName)
  },

  email: {
    list: (folderId: string, limit?: number, offset?: number): Promise<{ emails: Email[]; total: number }> =>
      safeInvoke(IPC_CHANNELS.EMAIL.LIST, folderId, limit, offset),
    get: (id: string): Promise<Email> => safeInvoke(IPC_CHANNELS.EMAIL.GET, id),
    getByThread: (threadId: string): Promise<Email[]> => safeInvoke(IPC_CHANNELS.EMAIL.GET_BY_THREAD, threadId),
    send: (emailData: any): Promise<Email> => safeInvoke(IPC_CHANNELS.EMAIL.SEND, emailData),
    saveDraft: (emailData: any): Promise<Email> => safeInvoke(IPC_CHANNELS.EMAIL.SAVE_DRAFT, emailData),
    updateFlags: (id: string, flags: Partial<{ seen: boolean; answered: boolean; flagged: boolean; deleted: boolean; forwarded: boolean }>): Promise<Email> =>
      safeInvoke(IPC_CHANNELS.EMAIL.UPDATE_FLAGS, id, flags),
    move: (id: string, folderId: string): Promise<Email> => safeInvoke(IPC_CHANNELS.EMAIL.MOVE, id, folderId),
    copy: (id: string, folderId: string): Promise<Email> => safeInvoke(IPC_CHANNELS.EMAIL.COPY, id, folderId),
    delete: (id: string): Promise<void> => safeInvoke(IPC_CHANNELS.EMAIL.DELETE, id),
    sync: (accountId?: string): Promise<boolean> => safeInvoke(IPC_CHANNELS.EMAIL.SYNC, accountId),
    getThreads: (folderId: string, limit?: number, offset?: number): Promise<{ threads: Thread[]; total: number }> =>
      safeInvoke(IPC_CHANNELS.EMAIL.GET_THREADS, folderId, limit, offset)
  },

  attachment: {
    download: (attachmentId: string): Promise<string> => safeInvoke(IPC_CHANNELS.ATTACHMENT.DOWNLOAD, attachmentId),
    open: (attachmentId: string): Promise<void> => safeInvoke(IPC_CHANNELS.ATTACHMENT.OPEN, attachmentId),
    saveAs: (attachmentId: string, defaultPath?: string): Promise<string> =>
      safeInvoke(IPC_CHANNELS.ATTACHMENT.SAVE_AS, attachmentId, defaultPath)
  },

  search: {
    query: (query: SearchQuery): Promise<SearchResult> => safeInvoke(IPC_CHANNELS.SEARCH.QUERY, query)
  },

  label: {
    list: (): Promise<EmailLabel[]> => safeInvoke(IPC_CHANNELS.LABEL.LIST),
    create: (label: Omit<EmailLabel, 'id' | 'createdAt'>): Promise<EmailLabel> =>
      safeInvoke(IPC_CHANNELS.LABEL.CREATE, label),
    update: (id: string, label: Partial<EmailLabel>): Promise<EmailLabel> =>
      safeInvoke(IPC_CHANNELS.LABEL.UPDATE, id, label),
    delete: (id: string): Promise<void> => safeInvoke(IPC_CHANNELS.LABEL.DELETE, id),
    apply: (emailId: string, labelId: string): Promise<void> =>
      safeInvoke(IPC_CHANNELS.LABEL.APPLY, emailId, labelId),
    remove: (emailId: string, labelId: string): Promise<void> =>
      safeInvoke(IPC_CHANNELS.LABEL.REMOVE, emailId, labelId)
  },

  filter: {
    list: (): Promise<FilterRule[]> => safeInvoke(IPC_CHANNELS.FILTER.LIST),
    create: (filter: Omit<FilterRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<FilterRule> =>
      safeInvoke(IPC_CHANNELS.FILTER.CREATE, filter),
    update: (id: string, filter: Partial<FilterRule>): Promise<FilterRule> =>
      safeInvoke(IPC_CHANNELS.FILTER.UPDATE, id, filter),
    delete: (id: string): Promise<void> => safeInvoke(IPC_CHANNELS.FILTER.DELETE, id),
    run: (id: string, emailIds?: string[]): Promise<number> => safeInvoke(IPC_CHANNELS.FILTER.RUN, id, emailIds),
    test: (id: string, emailId: string): Promise<boolean> => safeInvoke(IPC_CHANNELS.FILTER.TEST, id, emailId)
  },

  signature: {
    list: (): Promise<EmailSignature[]> => safeInvoke(IPC_CHANNELS.SIGNATURE.LIST),
    create: (signature: Omit<EmailSignature, 'id' | 'createdAt' | 'updatedAt'>): Promise<EmailSignature> =>
      safeInvoke(IPC_CHANNELS.SIGNATURE.CREATE, signature),
    update: (id: string, signature: Partial<EmailSignature>): Promise<EmailSignature> =>
      safeInvoke(IPC_CHANNELS.SIGNATURE.UPDATE, id, signature),
    delete: (id: string): Promise<void> => safeInvoke(IPC_CHANNELS.SIGNATURE.DELETE, id)
  },

  template: {
    list: (): Promise<EmailTemplate[]> => safeInvoke(IPC_CHANNELS.TEMPLATE.LIST),
    create: (template: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<EmailTemplate> =>
      safeInvoke(IPC_CHANNELS.TEMPLATE.CREATE, template),
    update: (id: string, template: Partial<EmailTemplate>): Promise<EmailTemplate> =>
      safeInvoke(IPC_CHANNELS.TEMPLATE.UPDATE, id, template),
    delete: (id: string): Promise<void> => safeInvoke(IPC_CHANNELS.TEMPLATE.DELETE, id)
  },

  gpg: {
    listKeys: (type?: 'public' | 'private'): Promise<GpgKey[]> => safeInvoke(IPC_CHANNELS.GPG.LIST_KEYS, type),
    importKey: (armoredKey: string): Promise<GpgKey> => safeInvoke(IPC_CHANNELS.GPG.IMPORT_KEY, armoredKey),
    exportKey: (keyId: string): Promise<string> => safeInvoke(IPC_CHANNELS.GPG.EXPORT_KEY, keyId),
    deleteKey: (keyId: string): Promise<void> => safeInvoke(IPC_CHANNELS.GPG.DELETE_KEY, keyId),
    encrypt: (content: string, recipientKeyIds: string[], signWithKeyId?: string): Promise<string> =>
      safeInvoke(IPC_CHANNELS.GPG.ENCRYPT, content, recipientKeyIds, signWithKeyId),
    decrypt: (encryptedContent: string): Promise<{ content: string; signedBy?: string[]; valid: boolean }> =>
      safeInvoke(IPC_CHANNELS.GPG.DECRYPT, encryptedContent),
    sign: (content: string, keyId: string): Promise<string> =>
      safeInvoke(IPC_CHANNELS.GPG.SIGN, content, keyId),
    verify: (signedContent: string, signature: string, keyId: string): Promise<boolean> =>
      safeInvoke(IPC_CHANNELS.GPG.VERIFY, signedContent, signature, keyId)
  },

  backup: {
    getSettings: (): Promise<BackupSettings> => safeInvoke(IPC_CHANNELS.BACKUP.GET_SETTINGS),
    updateSettings: (settings: Partial<BackupSettings>): Promise<BackupSettings> =>
      safeInvoke(IPC_CHANNELS.BACKUP.UPDATE_SETTINGS, settings),
    start: (): Promise<boolean> => safeInvoke(IPC_CHANNELS.BACKUP.START),
    restore: (backupPath: string): Promise<boolean> => safeInvoke(IPC_CHANNELS.BACKUP.RESTORE, backupPath),
    listBackups: (): Promise<{ path: string; createdAt: number; size: number }[]> =>
      safeInvoke(IPC_CHANNELS.BACKUP.LIST_BACKUPS)
  },

  plugin: {
    list: (): Promise<PluginInfo[]> => safeInvoke(IPC_CHANNELS.PLUGIN.LIST),
    enable: (pluginId: string): Promise<boolean> => safeInvoke(IPC_CHANNELS.PLUGIN.ENABLE, pluginId),
    disable: (pluginId: string): Promise<boolean> => safeInvoke(IPC_CHANNELS.PLUGIN.DISABLE, pluginId),
    install: (pluginPath: string): Promise<PluginInfo> => safeInvoke(IPC_CHANNELS.PLUGIN.INSTALL, pluginPath),
    uninstall: (pluginId: string): Promise<boolean> => safeInvoke(IPC_CHANNELS.PLUGIN.UNINSTALL, pluginId),
    reload: (pluginId: string): Promise<boolean> => safeInvoke(IPC_CHANNELS.PLUGIN.RELOAD, pluginId),
    call: (pluginId: string, method: string, ...args: any[]): Promise<any> =>
      safeInvoke(IPC_CHANNELS.PLUGIN.CALL, pluginId, method, ...args)
  },

  settings: {
    get: (): Promise<AppSettings> => safeInvoke(IPC_CHANNELS.SETTINGS.GET),
    update: (settings: Partial<AppSettings>): Promise<AppSettings> =>
      safeInvoke(IPC_CHANNELS.SETTINGS.UPDATE, settings)
  },

  app: {
    quit: (): Promise<void> => safeInvoke(IPC_CHANNELS.APP.QUIT),
    reload: (): Promise<void> => safeInvoke(IPC_CHANNELS.APP.RELOAD),
    getVersion: (): Promise<string> => safeInvoke(IPC_CHANNELS.APP.GET_VERSION)
  },

  sync: {
    status: (): Promise<{ isSyncing: boolean; progress?: number; currentFolder?: string }> =>
      safeInvoke(IPC_CHANNELS.SYNC.STATUS),
    start: (): Promise<void> => safeInvoke(IPC_CHANNELS.SYNC.START),
    stop: (): Promise<void> => safeInvoke(IPC_CHANNELS.SYNC.STOP),
    onProgress: (callback: (data: { progress: number; currentFolder: string; accountId: string }) => void) => {
      const handler = (_event: any, data: any) => callback(data);
      ipcRenderer.on(IPC_CHANNELS.SYNC.PROGRESS, handler);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.SYNC.PROGRESS, handler);
    }
  }
};

contextBridge.exposeInMainWorld('api', api);

export type ApiType = typeof api;
