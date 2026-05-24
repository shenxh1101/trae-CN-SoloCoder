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
  ServerConfig
} from '../shared/types';

declare global {
  interface Window {
    api: {
      account: {
        list: () => Promise<EmailAccount[]>;
        add: (account: Omit<EmailAccount, 'id' | 'createdAt' | 'updatedAt'>) => Promise<EmailAccount>;
        update: (id: string, account: Partial<EmailAccount>) => Promise<EmailAccount>;
        delete: (id: string) => Promise<void>;
        test: (account: Partial<EmailAccount>) => Promise<boolean>;
        autoDiscover: (email: string, password: string) => Promise<{ imap: ServerConfig; smtp: ServerConfig; provider: string }>;
      };
      folder: {
        list: (accountId?: string) => Promise<MailFolder[]>;
        sync: (folderId: string) => Promise<boolean>;
        create: (accountId: string, name: string, parentId?: string) => Promise<MailFolder>;
        delete: (folderId: string) => Promise<void>;
        rename: (folderId: string, newName: string) => Promise<MailFolder>;
      };
      email: {
        list: (folderId: string, limit?: number, offset?: number) => Promise<{ emails: Email[]; total: number }>;
        get: (id: string) => Promise<Email>;
        getByThread: (threadId: string) => Promise<Email[]>;
        send: (emailData: any) => Promise<Email>;
        saveDraft: (emailData: any) => Promise<Email>;
        updateFlags: (id: string, flags: Partial<{ seen: boolean; answered: boolean; flagged: boolean; deleted: boolean; forwarded: boolean }>) => Promise<Email>;
        move: (id: string, folderId: string) => Promise<Email>;
        copy: (id: string, folderId: string) => Promise<Email>;
        delete: (id: string) => Promise<void>;
        sync: (accountId?: string) => Promise<boolean>;
        getThreads: (folderId: string, limit?: number, offset?: number) => Promise<{ threads: Thread[]; total: number }>;
      };
      attachment: {
        download: (attachmentId: string) => Promise<string>;
        open: (attachmentId: string) => Promise<void>;
        saveAs: (attachmentId: string, defaultPath?: string) => Promise<string>;
      };
      search: {
        query: (query: SearchQuery) => Promise<SearchResult>;
      };
      label: {
        list: () => Promise<EmailLabel[]>;
        create: (label: Omit<EmailLabel, 'id' | 'createdAt'>) => Promise<EmailLabel>;
        update: (id: string, label: Partial<EmailLabel>) => Promise<EmailLabel>;
        delete: (id: string) => Promise<void>;
        apply: (emailId: string, labelId: string) => Promise<void>;
        remove: (emailId: string, labelId: string) => Promise<void>;
      };
      filter: {
        list: () => Promise<FilterRule[]>;
        create: (filter: Omit<FilterRule, 'id' | 'createdAt' | 'updatedAt'>) => Promise<FilterRule>;
        update: (id: string, filter: Partial<FilterRule>) => Promise<FilterRule>;
        delete: (id: string) => Promise<void>;
        run: (id: string, emailIds?: string[]) => Promise<number>;
        test: (id: string, emailId: string) => Promise<boolean>;
      };
      signature: {
        list: () => Promise<EmailSignature[]>;
        create: (signature: Omit<EmailSignature, 'id' | 'createdAt' | 'updatedAt'>) => Promise<EmailSignature>;
        update: (id: string, signature: Partial<EmailSignature>) => Promise<EmailSignature>;
        delete: (id: string) => Promise<void>;
      };
      template: {
        list: () => Promise<EmailTemplate[]>;
        create: (template: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt'>) => Promise<EmailTemplate>;
        update: (id: string, template: Partial<EmailTemplate>) => Promise<EmailTemplate>;
        delete: (id: string) => Promise<void>;
      };
      gpg: {
        listKeys: (type?: 'public' | 'private') => Promise<GpgKey[]>;
        importKey: (armoredKey: string) => Promise<GpgKey>;
        exportKey: (keyId: string) => Promise<string>;
        deleteKey: (keyId: string) => Promise<void>;
        encrypt: (content: string, recipientKeyIds: string[], signWithKeyId?: string) => Promise<string>;
        decrypt: (encryptedContent: string) => Promise<{ content: string; signedBy?: string[]; valid: boolean }>;
        sign: (content: string, keyId: string) => Promise<string>;
        verify: (signedContent: string, signature: string, keyId: string) => Promise<boolean>;
      };
      backup: {
        getSettings: () => Promise<BackupSettings>;
        updateSettings: (settings: Partial<BackupSettings>) => Promise<BackupSettings>;
        start: () => Promise<boolean>;
        restore: (backupPath: string) => Promise<boolean>;
        listBackups: () => Promise<{ path: string; createdAt: number; size: number }[]>;
      };
      plugin: {
        list: () => Promise<PluginInfo[]>;
        enable: (pluginId: string) => Promise<boolean>;
        disable: (pluginId: string) => Promise<boolean>;
        install: (pluginPath: string) => Promise<PluginInfo>;
        uninstall: (pluginId: string) => Promise<boolean>;
        reload: (pluginId: string) => Promise<boolean>;
        call: (pluginId: string, method: string, ...args: any[]) => Promise<any>;
      };
      settings: {
        get: () => Promise<AppSettings>;
        update: (settings: Partial<AppSettings>) => Promise<AppSettings>;
      };
      app: {
        quit: () => Promise<void>;
        reload: () => Promise<void>;
        getVersion: () => Promise<string>;
      };
      sync: {
        status: () => Promise<{ isSyncing: boolean; progress?: number; currentFolder?: string }>;
        start: () => Promise<void>;
        stop: () => Promise<void>;
        onProgress: (callback: (data: { progress: number; currentFolder: string; accountId: string }) => void) => () => void;
      };
    };
  }
}

export {};
