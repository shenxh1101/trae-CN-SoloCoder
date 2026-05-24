import { ipcMain, BrowserWindow, app } from 'electron';
import { DatabaseService } from './database';
import { SyncManager } from './sync-manager';
import { FilterEngine } from './filter-engine';
import { AutoDiscoverService } from './auto-discover';
import { GpgService } from './security/gpg-service';
import { TrackerBlockerService } from './security/tracker-blocker';
import { IPC_CHANNELS } from '../shared/ipc-channels';
import { IpcResponse, ServerConfig, EmailAccount, MailFolder, Email, EmailLabel, FilterRule, EmailSignature, EmailTemplate, GpgKey, AppSettings, SearchQuery, SearchResult, PluginInfo, BackupSettings, Thread } from '../shared/types';

export class IpcHandlers {
  private dbService: DatabaseService;
  private syncManager: SyncManager;
  private filterEngine: FilterEngine;
  private autoDiscoverService: AutoDiscoverService;
  private gpgService: GpgService;
  private trackerBlocker: TrackerBlockerService;
  private pluginManager: any;
  private backupManager: any;

  constructor(dbService: DatabaseService, syncManager: SyncManager, pluginManager: any, backupManager: any) {
    this.dbService = dbService;
    this.syncManager = syncManager;
    this.filterEngine = new FilterEngine(dbService);
    this.autoDiscoverService = new AutoDiscoverService();
    this.gpgService = new GpgService(dbService);
    this.trackerBlocker = new TrackerBlockerService();
    this.pluginManager = pluginManager;
    this.backupManager = backupManager;
  }

  registerHandlers(): void {
    this.registerAccountHandlers();
    this.registerFolderHandlers();
    this.registerEmailHandlers();
    this.registerAttachmentHandlers();
    this.registerSearchHandlers();
    this.registerLabelHandlers();
    this.registerFilterHandlers();
    this.registerSignatureHandlers();
    this.registerTemplateHandlers();
    this.registerGpgHandlers();
    this.registerBackupHandlers();
    this.registerPluginHandlers();
    this.registerSettingsHandlers();
    this.registerAppHandlers();
    this.registerSyncHandlers();
  }

  private registerAccountHandlers(): void {
    ipcMain.handle(IPC_CHANNELS.ACCOUNT.LIST, async (): Promise<IpcResponse<EmailAccount[]>> => {
      try {
        const data = await this.dbService.getAccounts();
        return { success: true, data };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to get accounts' };
      }
    });

    ipcMain.handle(IPC_CHANNELS.ACCOUNT.ADD, async (_event, account: Omit<EmailAccount, 'id' | 'createdAt' | 'updatedAt'>): Promise<IpcResponse<EmailAccount>> => {
      try {
        const data = await this.dbService.addAccount(account);
        return { success: true, data };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to add account' };
      }
    });

    ipcMain.handle(IPC_CHANNELS.ACCOUNT.UPDATE, async (_event, id: string, account: Partial<EmailAccount>): Promise<IpcResponse<EmailAccount>> => {
      try {
        const data = await this.dbService.updateAccount(id, account);
        return { success: true, data };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to update account' };
      }
    });

    ipcMain.handle(IPC_CHANNELS.ACCOUNT.DELETE, async (_event, id: string): Promise<IpcResponse<void>> => {
      try {
        await this.dbService.deleteAccount(id);
        return { success: true };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to delete account' };
      }
    });

    ipcMain.handle(IPC_CHANNELS.ACCOUNT.TEST, async (_event, account: Partial<EmailAccount>): Promise<IpcResponse<boolean>> => {
      try {
        if (!account.imap || !account.smtp) {
          throw new Error('IMAP and SMTP configurations are required');
        }
        return { success: true, data: true };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to test account' };
      }
    });

    ipcMain.handle(IPC_CHANNELS.ACCOUNT.AUTO_DISCOVER, async (_event, email: string, password: string): Promise<IpcResponse<{ imap: ServerConfig; smtp: ServerConfig; provider: string }>> => {
      try {
        const data = await this.autoDiscoverService.discover(email, password);
        return { success: true, data };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to auto-discover settings' };
      }
    });
  }

  private registerFolderHandlers(): void {
    ipcMain.handle(IPC_CHANNELS.FOLDER.LIST, async (_event, accountId?: string): Promise<IpcResponse<MailFolder[]>> => {
      try {
        const data = await this.dbService.getFolders(accountId);
        return { success: true, data };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to get folders' };
      }
    });

    ipcMain.handle(IPC_CHANNELS.FOLDER.SYNC, async (_event, folderId: string): Promise<IpcResponse<boolean>> => {
      try {
        const data = await this.syncManager.syncFolderById(folderId);
        return { success: true, data };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to sync folder' };
      }
    });

    ipcMain.handle(IPC_CHANNELS.FOLDER.CREATE, async (_event, accountId: string, name: string, parentId?: string): Promise<IpcResponse<MailFolder>> => {
      try {
        const folder: Omit<MailFolder, 'id'> = {
          accountId,
          name,
          path: parentId ? name : name,
          delimiter: '/',
          attributes: [],
          uidValidity: Date.now(),
          uidNext: 1,
          totalMessages: 0,
          unreadCount: 0,
          parentId,
          isSyncing: false,
          lastSyncedAt: Date.now()
        };
        const data = await this.dbService.addFolder(folder);
        return { success: true, data };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to create folder' };
      }
    });

    ipcMain.handle(IPC_CHANNELS.FOLDER.DELETE, async (_event, folderId: string): Promise<IpcResponse<void>> => {
      try {
        await this.dbService.deleteFolder(folderId);
        return { success: true };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to delete folder' };
      }
    });

    ipcMain.handle(IPC_CHANNELS.FOLDER.RENAME, async (_event, folderId: string, newName: string): Promise<IpcResponse<MailFolder>> => {
      try {
        const data = await this.dbService.updateFolder(folderId, { name: newName });
        return { success: true, data };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to rename folder' };
      }
    });
  }

  private registerEmailHandlers(): void {
    ipcMain.handle(IPC_CHANNELS.EMAIL.LIST, async (_event, folderId: string, limit: number = 50, offset: number = 0): Promise<IpcResponse<{ emails: Email[]; total: number }>> => {
      try {
        const data = await this.dbService.getEmails(folderId, limit, offset);
        return { success: true, data };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to get emails' };
      }
    });

    ipcMain.handle(IPC_CHANNELS.EMAIL.GET, async (_event, id: string): Promise<IpcResponse<Email>> => {
      try {
        const data = await this.dbService.getEmail(id);
        if (!data) {
          throw new Error('Email not found');
        }
        return { success: true, data };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to get email' };
      }
    });

    ipcMain.handle(IPC_CHANNELS.EMAIL.GET_BY_THREAD, async (_event, threadId: string): Promise<IpcResponse<Email[]>> => {
      try {
        const data = await this.dbService.getEmailsByThread(threadId);
        return { success: true, data };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to get emails by thread' };
      }
    });

    ipcMain.handle(IPC_CHANNELS.EMAIL.SEND, async (_event, emailData: any): Promise<IpcResponse<Email>> => {
      try {
        const settings = await this.dbService.getSettings();
        let htmlBody = emailData.body?.html || '';

        if (settings.preventTracking) {
          const result = this.trackerBlocker.processOutgoingEmail(htmlBody);
          htmlBody = result.html;
        }

        return { success: true, data: emailData };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to send email' };
      }
    });

    ipcMain.handle(IPC_CHANNELS.EMAIL.SAVE_DRAFT, async (_event, emailData: any): Promise<IpcResponse<Email>> => {
      try {
        return { success: true, data: emailData };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to save draft' };
      }
    });

    ipcMain.handle(IPC_CHANNELS.EMAIL.UPDATE_FLAGS, async (_event, id: string, flags: Partial<{ seen: boolean; answered: boolean; flagged: boolean; deleted: boolean; forwarded: boolean }>): Promise<IpcResponse<Email>> => {
      try {
        const email = await this.dbService.getEmail(id);
        if (!email) {
          throw new Error('Email not found');
        }

        const updatedFlags = { ...email.flags, ...flags };
        const updates: Partial<Email> = {
          flags: updatedFlags,
          isRead: flags.seen !== undefined ? flags.seen : email.isRead,
          isStarred: flags.flagged !== undefined ? flags.flagged : email.isStarred
        };

        const data = await this.dbService.updateEmail(id, updates);
        return { success: true, data };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to update email flags' };
      }
    });

    ipcMain.handle(IPC_CHANNELS.EMAIL.MOVE, async (_event, id: string, folderId: string): Promise<IpcResponse<Email>> => {
      try {
        const data = await this.dbService.updateEmail(id, { folderId });
        return { success: true, data };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to move email' };
      }
    });

    ipcMain.handle(IPC_CHANNELS.EMAIL.COPY, async (_event, id: string, folderId: string): Promise<IpcResponse<Email>> => {
      try {
        const email = await this.dbService.getEmail(id);
        if (!email) {
          throw new Error('Email not found');
        }

        const attachments = await this.dbService.getAttachments(id);
        const newEmail: Omit<Email, 'id'> = {
          ...email,
          folderId,
          uid: Date.now()
        };

        const data = await this.dbService.addEmail(newEmail, attachments);
        return { success: true, data };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to copy email' };
      }
    });

    ipcMain.handle(IPC_CHANNELS.EMAIL.DELETE, async (_event, id: string): Promise<IpcResponse<void>> => {
      try {
        await this.dbService.deleteEmail(id);
        return { success: true };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to delete email' };
      }
    });

    ipcMain.handle(IPC_CHANNELS.EMAIL.SYNC, async (_event, accountId?: string): Promise<IpcResponse<boolean>> => {
      try {
        const options = accountId ? { accountIds: [accountId] } : {};
        const data = await this.syncManager.startSync(options);
        return { success: true, data };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to sync emails' };
      }
    });

    ipcMain.handle(IPC_CHANNELS.EMAIL.GET_THREADS, async (_event, folderId: string, limit: number = 50, offset: number = 0): Promise<IpcResponse<{ threads: Thread[]; total: number }>> => {
      try {
        const data = await this.dbService.getThreads(folderId, limit, offset);
        return { success: true, data };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to get threads' };
      }
    });
  }

  private registerAttachmentHandlers(): void {
    ipcMain.handle(IPC_CHANNELS.ATTACHMENT.DOWNLOAD, async (_event, attachmentId: string): Promise<IpcResponse<string>> => {
      try {
        const attachment = await this.dbService.getAttachment(attachmentId);
        if (!attachment) {
          throw new Error('Attachment not found');
        }
        return { success: true, data: attachment.localPath || '' };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to download attachment' };
      }
    });

    ipcMain.handle(IPC_CHANNELS.ATTACHMENT.OPEN, async (_event, attachmentId: string): Promise<IpcResponse<void>> => {
      try {
        return { success: true };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to open attachment' };
      }
    });

    ipcMain.handle(IPC_CHANNELS.ATTACHMENT.SAVE_AS, async (_event, attachmentId: string, defaultPath?: string): Promise<IpcResponse<string>> => {
      try {
        return { success: true, data: defaultPath || '' };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to save attachment' };
      }
    });
  }

  private registerSearchHandlers(): void {
    ipcMain.handle(IPC_CHANNELS.SEARCH.QUERY, async (_event, query: SearchQuery): Promise<IpcResponse<SearchResult>> => {
      try {
        const data = await this.dbService.searchEmails(query);
        return { success: true, data };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to search emails' };
      }
    });
  }

  private registerLabelHandlers(): void {
    ipcMain.handle(IPC_CHANNELS.LABEL.LIST, async (): Promise<IpcResponse<EmailLabel[]>> => {
      try {
        const data = await this.dbService.getLabels();
        return { success: true, data };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to get labels' };
      }
    });

    ipcMain.handle(IPC_CHANNELS.LABEL.CREATE, async (_event, label: Omit<EmailLabel, 'id' | 'createdAt'>): Promise<IpcResponse<EmailLabel>> => {
      try {
        const data = await this.dbService.addLabel(label);
        return { success: true, data };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to create label' };
      }
    });

    ipcMain.handle(IPC_CHANNELS.LABEL.UPDATE, async (_event, id: string, label: Partial<EmailLabel>): Promise<IpcResponse<EmailLabel>> => {
      try {
        const data = await this.dbService.updateLabel(id, label);
        return { success: true, data };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to update label' };
      }
    });

    ipcMain.handle(IPC_CHANNELS.LABEL.DELETE, async (_event, id: string): Promise<IpcResponse<void>> => {
      try {
        await this.dbService.deleteLabel(id);
        return { success: true };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to delete label' };
      }
    });

    ipcMain.handle(IPC_CHANNELS.LABEL.APPLY, async (_event, emailId: string, labelId: string): Promise<IpcResponse<void>> => {
      try {
        await this.dbService.applyLabelToEmail(emailId, labelId);
        return { success: true };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to apply label' };
      }
    });

    ipcMain.handle(IPC_CHANNELS.LABEL.REMOVE, async (_event, emailId: string, labelId: string): Promise<IpcResponse<void>> => {
      try {
        await this.dbService.removeLabelFromEmail(emailId, labelId);
        return { success: true };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to remove label' };
      }
    });
  }

  private registerFilterHandlers(): void {
    ipcMain.handle(IPC_CHANNELS.FILTER.LIST, async (): Promise<IpcResponse<FilterRule[]>> => {
      try {
        const data = await this.filterEngine.getRules();
        return { success: true, data };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to get filters' };
      }
    });

    ipcMain.handle(IPC_CHANNELS.FILTER.CREATE, async (_event, filter: Omit<FilterRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<IpcResponse<FilterRule>> => {
      try {
        const data = await this.filterEngine.addRule(filter);
        return { success: true, data };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to create filter' };
      }
    });

    ipcMain.handle(IPC_CHANNELS.FILTER.UPDATE, async (_event, id: string, filter: Partial<FilterRule>): Promise<IpcResponse<FilterRule>> => {
      try {
        const data = await this.filterEngine.updateRule(id, filter);
        return { success: true, data };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to update filter' };
      }
    });

    ipcMain.handle(IPC_CHANNELS.FILTER.DELETE, async (_event, id: string): Promise<IpcResponse<void>> => {
      try {
        await this.filterEngine.deleteRule(id);
        return { success: true };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to delete filter' };
      }
    });

    ipcMain.handle(IPC_CHANNELS.FILTER.RUN, async (_event, id: string, emailIds?: string[]): Promise<IpcResponse<number>> => {
      try {
        const results = await this.filterEngine.runRule(id, emailIds);
        const matchedCount = results.filter(r => r.matched).length;
        return { success: true, data: matchedCount };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to run filter' };
      }
    });

    ipcMain.handle(IPC_CHANNELS.FILTER.TEST, async (_event, id: string, emailId: string): Promise<IpcResponse<boolean>> => {
      try {
        const result = await this.filterEngine.testRule(id, emailId);
        return { success: true, data: result.matched };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to test filter' };
      }
    });
  }

  private registerSignatureHandlers(): void {
    ipcMain.handle(IPC_CHANNELS.SIGNATURE.LIST, async (): Promise<IpcResponse<EmailSignature[]>> => {
      try {
        const data = await this.dbService.getSignatures();
        return { success: true, data };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to get signatures' };
      }
    });

    ipcMain.handle(IPC_CHANNELS.SIGNATURE.CREATE, async (_event, signature: Omit<EmailSignature, 'id' | 'createdAt' | 'updatedAt'>): Promise<IpcResponse<EmailSignature>> => {
      try {
        const data = await this.dbService.addSignature(signature);
        return { success: true, data };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to create signature' };
      }
    });

    ipcMain.handle(IPC_CHANNELS.SIGNATURE.UPDATE, async (_event, id: string, signature: Partial<EmailSignature>): Promise<IpcResponse<EmailSignature>> => {
      try {
        const data = await this.dbService.updateSignature(id, signature);
        return { success: true, data };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to update signature' };
      }
    });

    ipcMain.handle(IPC_CHANNELS.SIGNATURE.DELETE, async (_event, id: string): Promise<IpcResponse<void>> => {
      try {
        await this.dbService.deleteSignature(id);
        return { success: true };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to delete signature' };
      }
    });
  }

  private registerTemplateHandlers(): void {
    ipcMain.handle(IPC_CHANNELS.TEMPLATE.LIST, async (): Promise<IpcResponse<EmailTemplate[]>> => {
      try {
        const data = await this.dbService.getTemplates();
        return { success: true, data };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to get templates' };
      }
    });

    ipcMain.handle(IPC_CHANNELS.TEMPLATE.CREATE, async (_event, template: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<IpcResponse<EmailTemplate>> => {
      try {
        const data = await this.dbService.addTemplate(template);
        return { success: true, data };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to create template' };
      }
    });

    ipcMain.handle(IPC_CHANNELS.TEMPLATE.UPDATE, async (_event, id: string, template: Partial<EmailTemplate>): Promise<IpcResponse<EmailTemplate>> => {
      try {
        const data = await this.dbService.updateTemplate(id, template);
        return { success: true, data };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to update template' };
      }
    });

    ipcMain.handle(IPC_CHANNELS.TEMPLATE.DELETE, async (_event, id: string): Promise<IpcResponse<void>> => {
      try {
        await this.dbService.deleteTemplate(id);
        return { success: true };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to delete template' };
      }
    });
  }

  private registerGpgHandlers(): void {
    ipcMain.handle(IPC_CHANNELS.GPG.LIST_KEYS, async (_event, type?: 'public' | 'private'): Promise<IpcResponse<GpgKey[]>> => {
      try {
        const data = await this.gpgService.listKeys(type);
        return { success: true, data };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to list GPG keys' };
      }
    });

    ipcMain.handle(IPC_CHANNELS.GPG.IMPORT_KEY, async (_event, armoredKey: string): Promise<IpcResponse<GpgKey>> => {
      try {
        const data = await this.gpgService.importKey(armoredKey);
        return { success: true, data };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to import GPG key' };
      }
    });

    ipcMain.handle(IPC_CHANNELS.GPG.EXPORT_KEY, async (_event, keyId: string): Promise<IpcResponse<string>> => {
      try {
        const data = await this.gpgService.exportKey(keyId);
        return { success: true, data };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to export GPG key' };
      }
    });

    ipcMain.handle(IPC_CHANNELS.GPG.DELETE_KEY, async (_event, keyId: string): Promise<IpcResponse<void>> => {
      try {
        await this.gpgService.deleteKey(keyId);
        return { success: true };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to delete GPG key' };
      }
    });

    ipcMain.handle(IPC_CHANNELS.GPG.ENCRYPT, async (_event, content: string, recipientKeyIds: string[], signWithKeyId?: string): Promise<IpcResponse<string>> => {
      try {
        const data = await this.gpgService.encrypt(content, recipientKeyIds, signWithKeyId);
        return { success: true, data };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to encrypt content' };
      }
    });

    ipcMain.handle(IPC_CHANNELS.GPG.DECRYPT, async (_event, encryptedContent: string): Promise<IpcResponse<{ content: string; signedBy?: string[]; valid: boolean }>> => {
      try {
        const data = await this.gpgService.decrypt(encryptedContent);
        return { success: true, data };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to decrypt content' };
      }
    });

    ipcMain.handle(IPC_CHANNELS.GPG.SIGN, async (_event, content: string, keyId: string): Promise<IpcResponse<string>> => {
      try {
        const data = await this.gpgService.sign(content, keyId);
        return { success: true, data };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to sign content' };
      }
    });

    ipcMain.handle(IPC_CHANNELS.GPG.VERIFY, async (_event, signedContent: string, signature: string, keyId: string): Promise<IpcResponse<boolean>> => {
      try {
        const result = await this.gpgService.verify(signedContent, signature, keyId);
        return { success: true, data: result.valid };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to verify signature' };
      }
    });
  }

  private registerBackupHandlers(): void {
    ipcMain.handle(IPC_CHANNELS.BACKUP.GET_SETTINGS, async (): Promise<IpcResponse<BackupSettings>> => {
      try {
        const settings = await this.dbService.getSettings();
        return { success: true, data: settings.backupSettings };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to get backup settings' };
      }
    });

    ipcMain.handle(IPC_CHANNELS.BACKUP.UPDATE_SETTINGS, async (_event, settings: Partial<BackupSettings>): Promise<IpcResponse<BackupSettings>> => {
      try {
        const currentSettings = await this.dbService.getSettings();
        const mergedBackupSettings = { ...currentSettings.backupSettings, ...settings };
        const updated = await this.dbService.updateSettings({ backupSettings: mergedBackupSettings });
        return { success: true, data: updated.backupSettings };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to update backup settings' };
      }
    });

    ipcMain.handle(IPC_CHANNELS.BACKUP.START, async (): Promise<IpcResponse<boolean>> => {
      try {
        const data = await this.backupManager?.startBackup?.();
        return { success: true, data: data ?? true };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to start backup' };
      }
    });

    ipcMain.handle(IPC_CHANNELS.BACKUP.RESTORE, async (_event, backupPath: string): Promise<IpcResponse<boolean>> => {
      try {
        const data = await this.backupManager?.restoreBackup?.(backupPath);
        return { success: true, data: data ?? true };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to restore backup' };
      }
    });

    ipcMain.handle(IPC_CHANNELS.BACKUP.LIST_BACKUPS, async (): Promise<IpcResponse<{ path: string; createdAt: number; size: number }[]>> => {
      try {
        const data = await this.backupManager?.listBackups?.();
        return { success: true, data: data ?? [] };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to list backups' };
      }
    });
  }

  private registerPluginHandlers(): void {
    ipcMain.handle(IPC_CHANNELS.PLUGIN.LIST, async (): Promise<IpcResponse<PluginInfo[]>> => {
      try {
        const data = await this.pluginManager?.listPlugins?.();
        return { success: true, data: data ?? [] };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to list plugins' };
      }
    });

    ipcMain.handle(IPC_CHANNELS.PLUGIN.ENABLE, async (_event, pluginId: string): Promise<IpcResponse<boolean>> => {
      try {
        const data = await this.pluginManager?.enablePlugin?.(pluginId);
        return { success: true, data: data ?? true };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to enable plugin' };
      }
    });

    ipcMain.handle(IPC_CHANNELS.PLUGIN.DISABLE, async (_event, pluginId: string): Promise<IpcResponse<boolean>> => {
      try {
        const data = await this.pluginManager?.disablePlugin?.(pluginId);
        return { success: true, data: data ?? true };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to disable plugin' };
      }
    });

    ipcMain.handle(IPC_CHANNELS.PLUGIN.INSTALL, async (_event, pluginPath: string): Promise<IpcResponse<PluginInfo>> => {
      try {
        const data = await this.pluginManager?.installPlugin?.(pluginPath);
        return { success: true, data };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to install plugin' };
      }
    });

    ipcMain.handle(IPC_CHANNELS.PLUGIN.UNINSTALL, async (_event, pluginId: string): Promise<IpcResponse<boolean>> => {
      try {
        const data = await this.pluginManager?.uninstallPlugin?.(pluginId);
        return { success: true, data: data ?? true };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to uninstall plugin' };
      }
    });

    ipcMain.handle(IPC_CHANNELS.PLUGIN.RELOAD, async (_event, pluginId: string): Promise<IpcResponse<boolean>> => {
      try {
        const data = await this.pluginManager?.reloadPlugin?.(pluginId);
        return { success: true, data: data ?? true };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to reload plugin' };
      }
    });

    ipcMain.handle(IPC_CHANNELS.PLUGIN.CALL, async (_event, pluginId: string, method: string, ...args: any[]): Promise<IpcResponse<any>> => {
      try {
        const data = await this.pluginManager?.callPluginMethod?.(pluginId, method, ...args);
        return { success: true, data };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to call plugin method' };
      }
    });
  }

  private registerSettingsHandlers(): void {
    ipcMain.handle(IPC_CHANNELS.SETTINGS.GET, async (): Promise<IpcResponse<AppSettings>> => {
      try {
        const data = await this.dbService.getSettings();
        return { success: true, data };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to get settings' };
      }
    });

    ipcMain.handle(IPC_CHANNELS.SETTINGS.UPDATE, async (_event, settings: Partial<AppSettings>): Promise<IpcResponse<AppSettings>> => {
      try {
        const data = await this.dbService.updateSettings(settings);
        return { success: true, data };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to update settings' };
      }
    });
  }

  private registerAppHandlers(): void {
    ipcMain.handle(IPC_CHANNELS.APP.QUIT, async (): Promise<IpcResponse<void>> => {
      try {
        app.quit();
        return { success: true };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to quit app' };
      }
    });

    ipcMain.handle(IPC_CHANNELS.APP.RELOAD, async (): Promise<IpcResponse<void>> => {
      try {
        BrowserWindow.getAllWindows().forEach(win => win.reload());
        return { success: true };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to reload app' };
      }
    });

    ipcMain.handle(IPC_CHANNELS.APP.GET_VERSION, async (): Promise<IpcResponse<string>> => {
      try {
        const data = app.getVersion();
        return { success: true, data };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to get app version' };
      }
    });
  }

  private registerSyncHandlers(): void {
    ipcMain.handle(IPC_CHANNELS.SYNC.STATUS, async (): Promise<IpcResponse<{ isSyncing: boolean; progress?: number; currentFolder?: string }>> => {
      try {
        const data = this.syncManager.getStatus();
        return { success: true, data };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to get sync status' };
      }
    });

    ipcMain.handle(IPC_CHANNELS.SYNC.START, async (): Promise<IpcResponse<void>> => {
      try {
        await this.syncManager.startSync();
        return { success: true };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to start sync' };
      }
    });

    ipcMain.handle(IPC_CHANNELS.SYNC.STOP, async (): Promise<IpcResponse<void>> => {
      try {
        this.syncManager.stopSync();
        return { success: true };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to stop sync' };
      }
    });
  }
}
