import { BrowserWindow } from 'electron';
import { DatabaseService } from './database';
import { FilterEngine } from './filter-engine';
import { TrackerBlockerService } from './security/tracker-blocker';
import { IPC_CHANNELS } from '../shared/ipc-channels';
import { EmailAccount, MailFolder, Email, EmailFlags, EmailBody, Attachment, EmailContact } from '../shared/types';
import { generateThreadId, generateId } from './utils/id';

interface SyncProgress {
  accountId: string;
  currentFolder: string;
  progress: number;
  totalFolders: number;
  syncedFolders: number;
  totalMessages: number;
  syncedMessages: number;
  status: 'idle' | 'syncing' | 'error' | 'completed';
  error?: string;
}

interface SyncState {
  isSyncing: boolean;
  currentAccountId?: string;
  currentFolderId?: string;
  progress: number;
  accounts: Map<string, SyncProgress>;
}

interface SyncOptions {
  fullSync?: boolean;
  accountIds?: string[];
  folderIds?: string[];
}

export class SyncManager {
  private dbService: DatabaseService;
  private mainWindow: BrowserWindow | null;
  private filterEngine: FilterEngine;
  private trackerBlocker: TrackerBlockerService;
  private syncState: SyncState;
  private autoSyncInterval: NodeJS.Timeout | null;
  private syncAbortController: AbortController | null;

  constructor(dbService: DatabaseService, mainWindow: BrowserWindow | null) {
    this.dbService = dbService;
    this.mainWindow = mainWindow;
    this.filterEngine = new FilterEngine(dbService);
    this.trackerBlocker = new TrackerBlockerService();
    this.syncState = {
      isSyncing: false,
      progress: 0,
      accounts: new Map()
    };
    this.autoSyncInterval = null;
    this.syncAbortController = null;
  }

  startAutoSync(): void {
    try {
      if (this.autoSyncInterval) {
        return;
      }

      this.autoSyncInterval = setInterval(async () => {
        if (!this.syncState.isSyncing) {
          try {
            await this.syncAll();
          } catch (error) {
            console.error('Auto sync failed:', error);
          }
        }
      }, 5 * 60 * 1000);

      console.log('Auto sync started');
    } catch (error) {
      console.error('Failed to start auto sync:', error);
    }
  }

  stopAutoSync(): void {
    try {
      if (this.autoSyncInterval) {
        clearInterval(this.autoSyncInterval);
        this.autoSyncInterval = null;
        console.log('Auto sync stopped');
      }
    } catch (error) {
      console.error('Failed to stop auto sync:', error);
    }
  }

  getStatus(): { isSyncing: boolean; progress?: number; currentFolder?: string } {
    try {
      const currentAccount = this.syncState.currentAccountId
        ? this.syncState.accounts.get(this.syncState.currentAccountId)
        : undefined;

      return {
        isSyncing: this.syncState.isSyncing,
        progress: this.syncState.progress,
        currentFolder: currentAccount?.currentFolder
      };
    } catch (error) {
      console.error('Failed to get sync status:', error);
      return { isSyncing: false };
    }
  }

  async startSync(options: SyncOptions = {}): Promise<boolean> {
    try {
      if (this.syncState.isSyncing) {
        throw new Error('Sync already in progress');
      }

      this.syncAbortController = new AbortController();
      this.syncState.isSyncing = true;
      this.syncState.progress = 0;

      if (options.accountIds && options.accountIds.length > 0) {
        for (const accountId of options.accountIds) {
          if (this.syncAbortController.signal.aborted) break;
          await this.syncAccount(accountId, options);
        }
      } else {
        await this.syncAll(options);
      }

      this.syncState.isSyncing = false;
      this.syncState.progress = 100;
      this.sendProgress();

      return true;
    } catch (error) {
      console.error('Sync failed:', error);
      this.syncState.isSyncing = false;
      throw error;
    }
  }

  stopSync(): void {
    try {
      if (this.syncAbortController) {
        this.syncAbortController.abort();
        this.syncAbortController = null;
      }
      this.syncState.isSyncing = false;
      this.sendProgress();
      console.log('Sync stopped');
    } catch (error) {
      console.error('Failed to stop sync:', error);
    }
  }

  async syncAll(options: SyncOptions = {}): Promise<void> {
    try {
      const accounts = await this.dbService.getAccounts();

      for (const account of accounts) {
        if (this.syncAbortController?.signal.aborted) break;
        if (options.accountIds && options.accountIds.length > 0 && !options.accountIds.includes(account.id)) {
          continue;
        }
        await this.syncAccount(account.id, options);
      }
    } catch (error) {
      console.error('Failed to sync all accounts:', error);
      throw error;
    }
  }

  async syncAccount(accountId: string, options: SyncOptions = {}): Promise<void> {
    try {
      const account = await this.dbService.getAccount(accountId);
      if (!account) {
        throw new Error('Account not found');
      }

      this.syncState.currentAccountId = accountId;
      this.initializeAccountProgress(accountId);

      const accountProgress = this.syncState.accounts.get(accountId)!;
      accountProgress.status = 'syncing';

      try {
        await this.syncFolders(account, options);
        accountProgress.status = 'completed';
      } catch (error) {
        accountProgress.status = 'error';
        accountProgress.error = error instanceof Error ? error.message : 'Sync failed';
        throw error;
      } finally {
        this.sendProgress();
        this.syncState.currentAccountId = undefined;
      }
    } catch (error) {
      console.error(`Failed to sync account ${accountId}:`, error);
      throw error;
    }
  }

  private async syncFolders(account: EmailAccount, options: SyncOptions): Promise<void> {
    try {
      const accountProgress = this.syncState.accounts.get(account.id)!;
      const folders = await this.fetchFolders(account);

      accountProgress.totalFolders = folders.length;
      accountProgress.syncedFolders = 0;

      for (const folder of folders) {
        if (this.syncAbortController?.signal.aborted) break;

        if (options.folderIds && options.folderIds.length > 0 && !options.folderIds.includes(folder.id)) {
          accountProgress.syncedFolders++;
          continue;
        }

        this.syncState.currentFolderId = folder.id;
        accountProgress.currentFolder = folder.name;

        try {
          await this.syncFolder(account, folder, options);
          accountProgress.syncedFolders++;
          accountProgress.progress = Math.round((accountProgress.syncedFolders / accountProgress.totalFolders) * 100);
          this.syncState.progress = this.calculateOverallProgress();
          this.sendProgress();
        } catch (error) {
          console.error(`Failed to sync folder ${folder.name}:`, error);
          throw error;
        }
      }
    } catch (error) {
      console.error('Failed to sync folders:', error);
      throw error;
    }
  }

  private async fetchFolders(account: EmailAccount): Promise<MailFolder[]> {
    try {
      const existingFolders = await this.dbService.getFolders(account.id);

      const simulatedFolders: MailFolder[] = [
        {
          id: existingFolders.find(f => f.path === 'INBOX')?.id || generateId(),
          accountId: account.id,
          name: 'INBOX',
          path: 'INBOX',
          delimiter: '/',
          attributes: [],
          uidValidity: 1,
          uidNext: 1000,
          totalMessages: 0,
          unreadCount: 0,
          isSyncing: false,
          lastSyncedAt: Date.now()
        },
        {
          id: existingFolders.find(f => f.path === 'Sent')?.id || generateId(),
          accountId: account.id,
          name: 'Sent',
          path: 'Sent',
          delimiter: '/',
          attributes: ['\\Sent'],
          uidValidity: 1,
          uidNext: 500,
          totalMessages: 0,
          unreadCount: 0,
          isSyncing: false,
          lastSyncedAt: Date.now()
        },
        {
          id: existingFolders.find(f => f.path === 'Drafts')?.id || generateId(),
          accountId: account.id,
          name: 'Drafts',
          path: 'Drafts',
          delimiter: '/',
          attributes: ['\\Drafts'],
          uidValidity: 1,
          uidNext: 100,
          totalMessages: 0,
          unreadCount: 0,
          isSyncing: false,
          lastSyncedAt: Date.now()
        },
        {
          id: existingFolders.find(f => f.path === 'Trash')?.id || generateId(),
          accountId: account.id,
          name: 'Trash',
          path: 'Trash',
          delimiter: '/',
          attributes: ['\\Trash'],
          uidValidity: 1,
          uidNext: 200,
          totalMessages: 0,
          unreadCount: 0,
          isSyncing: false,
          lastSyncedAt: Date.now()
        },
        {
          id: existingFolders.find(f => f.path === 'Archive')?.id || generateId(),
          accountId: account.id,
          name: 'Archive',
          path: 'Archive',
          delimiter: '/',
          attributes: ['\\Archive'],
          uidValidity: 1,
          uidNext: 300,
          totalMessages: 0,
          unreadCount: 0,
          isSyncing: false,
          lastSyncedAt: Date.now()
        },
        {
          id: existingFolders.find(f => f.path === 'Spam')?.id || generateId(),
          accountId: account.id,
          name: 'Spam',
          path: 'Spam',
          delimiter: '/',
          attributes: ['\\Junk'],
          uidValidity: 1,
          uidNext: 150,
          totalMessages: 0,
          unreadCount: 0,
          isSyncing: false,
          lastSyncedAt: Date.now()
        }
      ];

      for (const folder of simulatedFolders) {
        const existing = existingFolders.find(f => f.path === folder.path);
        if (existing) {
          await this.dbService.updateFolder(existing.id, folder);
        } else {
          await this.dbService.addFolder(folder);
        }
      }

      return await this.dbService.getFolders(account.id);
    } catch (error) {
      console.error('Failed to fetch folders:', error);
      throw error;
    }
  }

  private async syncFolder(account: EmailAccount, folder: MailFolder, options: SyncOptions): Promise<void> {
    try {
      const { fullSync = false } = options;
      const syncDays = account.syncSettings.syncDays;
      const sinceDate = syncDays > 0 ? Date.now() - (syncDays * 24 * 60 * 60 * 1000) : 0;

      const lastSyncedAt = fullSync ? 0 : (folder.lastSyncedAt || 0);

      const messages = await this.fetchMessages(account, folder, lastSyncedAt, sinceDate);

      const accountProgress = this.syncState.accounts.get(account.id)!;
      accountProgress.totalMessages = messages.length;
      accountProgress.syncedMessages = 0;

      for (const message of messages) {
        if (this.syncAbortController?.signal.aborted) break;

        try {
          await this.processMessage(account, folder, message);
          accountProgress.syncedMessages++;
          accountProgress.progress = Math.round(
            ((accountProgress.syncedFolders / accountProgress.totalFolders) * 50) +
            ((accountProgress.syncedMessages / accountProgress.totalMessages) * 50)
          );
          this.syncState.progress = this.calculateOverallProgress();
          this.sendProgress();
        } catch (error) {
          console.error(`Failed to process message:`, error);
        }
      }

      await this.dbService.updateFolder(folder.id, {
        lastSyncedAt: Date.now(),
        uidNext: folder.uidNext + messages.length
      });
    } catch (error) {
      console.error(`Failed to sync folder ${folder.name}:`, error);
      throw error;
    }
  }

  private async fetchMessages(account: EmailAccount, folder: MailFolder, lastSyncedAt: number, sinceDate: number): Promise<any[]> {
    try {
      const messages: any[] = [];
      const messageCount = Math.floor(Math.random() * 20) + 5;

      for (let i = 0; i < messageCount; i++) {
        const messageDate = sinceDate + Math.random() * (Date.now() - sinceDate);

        if (messageDate < lastSyncedAt) {
          continue;
        }

        const sampleSenders = [
          { name: 'John Doe', email: 'john@example.com' },
          { name: 'Jane Smith', email: 'jane@example.com' },
          { name: 'Bob Wilson', email: 'bob@example.com' },
          { name: 'Alice Brown', email: 'alice@example.com' },
          { name: 'Newsletter', email: 'news@example.com' }
        ];

        const sampleSubjects = [
          'Meeting tomorrow',
          'Project update',
          'Your invoice is ready',
          'Weekly digest',
          'Important announcement',
          'Welcome to our service',
          'Your order has shipped',
          'Password reset request',
          'Account security alert',
          'New features available'
        ];

        const sender = sampleSenders[Math.floor(Math.random() * sampleSenders.length)];
        const subject = sampleSubjects[Math.floor(Math.random() * sampleSubjects.length)];
        const messageId = `<${generateId()}@${account.email.split('@')[1]}>`;

        messages.push({
          uid: folder.uidNext + i,
          messageId,
          subject,
          from: sender,
          to: [{ name: account.name, email: account.email }],
          date: messageDate,
          internalDate: messageDate,
          flags: {
            seen: Math.random() > 0.5,
            answered: Math.random() > 0.8,
            flagged: Math.random() > 0.9,
            deleted: false,
            draft: false,
            recent: Math.random() > 0.7,
            forwarded: Math.random() > 0.85,
            custom: []
          },
          size: Math.floor(Math.random() * 50000) + 1000,
          body: {
            plain: `This is the plain text content of the email: ${subject}`,
            html: `<p>This is the <strong>HTML</strong> content of the email: ${subject}</p>`
          },
          attachments: [],
          references: [],
          inReplyTo: undefined
        });
      }

      return messages.sort((a, b) => a.date - b.date);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      throw error;
    }
  }

  private async processMessage(account: EmailAccount, folder: MailFolder, message: any): Promise<void> {
    try {
      const existingEmail = await this.dbService.getEmailByMessageId(account.id, message.messageId);

      if (existingEmail) {
        const hasTracking = this.trackerBlocker.detectAndRemoveTracking(message.body.html || '').hasTracking;
        await this.dbService.updateEmail(existingEmail.id, {
          flags: message.flags,
          isRead: message.flags.seen,
          isStarred: message.flags.flagged,
          hasTracking
        });
        return;
      }

      const trackingResult = this.trackerBlocker.detectAndRemoveTracking(message.body.html || '');
      const threadId = generateThreadId(message.messageId, message.references, message.inReplyTo);

      const body: EmailBody = {
        plain: message.body.plain,
        html: trackingResult.cleanedHtml,
        markdown: undefined
      };

      const preview = this.generatePreview(body.plain || body.html || '');

      const email: Omit<Email, 'id'> = {
        accountId: account.id,
        folderId: folder.id,
        messageId: message.messageId,
        threadId,
        uid: message.uid,
        flags: message.flags,
        from: message.from,
        to: message.to || [],
        cc: message.cc || [],
        bcc: message.bcc || [],
        replyTo: message.replyTo,
        subject: message.subject,
        body,
        date: message.date,
        internalDate: message.internalDate,
        size: message.size,
        attachments: message.attachments || [],
        references: message.references || [],
        inReplyTo: message.inReplyTo,
        labels: [],
        isRead: message.flags.seen,
        isStarred: message.flags.flagged,
        hasTracking: trackingResult.hasTracking,
        isEncrypted: false,
        isSigned: false,
        signatureValid: undefined,
        preview,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const savedEmail = await this.dbService.addEmail(email, message.attachments || []);

      await this.filterEngine.processIncomingEmail(savedEmail);

      await this.updateFolderStats(folder.id);
    } catch (error) {
      console.error('Failed to process message:', error);
      throw error;
    }
  }

  private async updateFolderStats(folderId: string): Promise<void> {
    try {
      const folder = await this.dbService.getFolder(folderId);
      if (!folder) return;

      const { total } = await this.dbService.getEmails(folderId, 1, 0);

      const allEmails = await this.dbService.getEmails(folderId, 10000, 0);
      const unreadCount = allEmails.emails.filter(e => !e.isRead).length;

      await this.dbService.updateFolder(folderId, {
        totalMessages: total,
        unreadCount
      });
    } catch (error) {
      console.error('Failed to update folder stats:', error);
    }
  }

  private generatePreview(content: string, maxLength: number = 150): string {
    try {
      let text = content;
      text = text.replace(/<[^>]*>/g, ' ');
      text = text.replace(/\s+/g, ' ');
      text = text.trim();

      if (text.length <= maxLength) {
        return text;
      }

      return text.substring(0, maxLength) + '...';
    } catch {
      return '';
    }
  }

  private initializeAccountProgress(accountId: string): void {
    this.syncState.accounts.set(accountId, {
      accountId,
      currentFolder: '',
      progress: 0,
      totalFolders: 0,
      syncedFolders: 0,
      totalMessages: 0,
      syncedMessages: 0,
      status: 'idle'
    });
  }

  private calculateOverallProgress(): number {
    let totalProgress = 0;
    let accountCount = 0;

    for (const progress of this.syncState.accounts.values()) {
      totalProgress += progress.progress;
      accountCount++;
    }

    return accountCount > 0 ? Math.round(totalProgress / accountCount) : 0;
  }

  private sendProgress(): void {
    try {
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        const currentAccount = this.syncState.currentAccountId
          ? this.syncState.accounts.get(this.syncState.currentAccountId)
          : undefined;

        this.mainWindow.webContents.send(IPC_CHANNELS.SYNC.PROGRESS, {
          progress: this.syncState.progress,
          currentFolder: currentAccount?.currentFolder || '',
          accountId: this.syncState.currentAccountId || '',
          isSyncing: this.syncState.isSyncing
        });
      }
    } catch (error) {
      console.error('Failed to send progress:', error);
    }
  }

  async syncFolderById(folderId: string): Promise<boolean> {
    try {
      const folder = await this.dbService.getFolder(folderId);
      if (!folder) {
        throw new Error('Folder not found');
      }

      const account = await this.dbService.getAccount(folder.accountId);
      if (!account) {
        throw new Error('Account not found');
      }

      this.syncState.isSyncing = true;
      this.syncAbortController = new AbortController();

      this.initializeAccountProgress(account.id);
      const accountProgress = this.syncState.accounts.get(account.id)!;
      accountProgress.status = 'syncing';
      accountProgress.totalFolders = 1;
      accountProgress.currentFolder = folder.name;
      this.syncState.currentAccountId = account.id;
      this.syncState.currentFolderId = folder.id;

      try {
        await this.syncFolder(account, folder, {});
        accountProgress.status = 'completed';
        accountProgress.syncedFolders = 1;
        accountProgress.progress = 100;
        this.syncState.progress = 100;
      } catch (error) {
        accountProgress.status = 'error';
        accountProgress.error = error instanceof Error ? error.message : 'Sync failed';
        throw error;
      } finally {
        this.syncState.isSyncing = false;
        this.sendProgress();
        this.syncState.currentAccountId = undefined;
        this.syncState.currentFolderId = undefined;
      }

      return true;
    } catch (error) {
      console.error('Failed to sync folder:', error);
      this.syncState.isSyncing = false;
      throw error;
    }
  }
}
