import * as path from 'path';
import * as fs from 'fs';
import Database from 'better-sqlite3';
import { generateId } from '../utils/id';
import {
  EmailAccount,
  MailFolder,
  Email,
  Attachment,
  EmailLabel,
  FilterRule,
  EmailSignature,
  EmailTemplate,
  GpgKey,
  AppSettings,
  BackupSettings,
  SearchQuery,
  SearchResult,
  Thread,
  EmailContact,
  EmailFlags,
  EmailBody
} from '../../shared/types';

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  language: 'zh-CN',
  notifications: true,
  autoCheck: true,
  checkInterval: 5,
  preventTracking: true,
  previewPane: true,
  threadView: true,
  backupSettings: {
    enabled: false,
    interval: 24 * 60 * 60 * 1000,
    destination: '',
    keepBackups: 7,
    includeAttachments: true
  },
  pluginSettings: {}
};

export class DatabaseService {
  private db: Database.Database | null = null;
  private dbPath: string;

  constructor(appDataPath: string) {
    this.dbPath = path.join(appDataPath, 'solo-mail.db');
  }

  async initialize(): Promise<void> {
    try {
      this.db = new Database(this.dbPath);
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('foreign_keys = ON');
      this.db.pragma('synchronous = NORMAL');
      this.createTables();
      this.insertDefaultSettings();
      this.createIndexes();
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  private createTables(): void {
    if (!this.db) throw new Error('Database not initialized');

    const tables = [
      `CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        provider TEXT NOT NULL CHECK (provider IN ('gmail', 'outlook', 'qq', 'other')),
        imap_host TEXT NOT NULL,
        imap_port INTEGER NOT NULL,
        imap_secure INTEGER NOT NULL DEFAULT 1,
        imap_username TEXT NOT NULL,
        imap_password TEXT NOT NULL,
        smtp_host TEXT NOT NULL,
        smtp_port INTEGER NOT NULL,
        smtp_secure INTEGER NOT NULL DEFAULT 1,
        smtp_username TEXT NOT NULL,
        smtp_password TEXT NOT NULL,
        sync_days INTEGER NOT NULL DEFAULT 30,
        max_attachment_size INTEGER NOT NULL DEFAULT 10485760,
        auto_download_attachments INTEGER NOT NULL DEFAULT 1,
        sync_interval INTEGER NOT NULL DEFAULT 5,
        signature_id TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`,

      `CREATE TABLE IF NOT EXISTS folders (
        id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL,
        name TEXT NOT NULL,
        path TEXT NOT NULL,
        delimiter TEXT NOT NULL DEFAULT '/',
        attributes TEXT,
        uid_validity INTEGER,
        uid_next INTEGER,
        total_messages INTEGER NOT NULL DEFAULT 0,
        unread_count INTEGER NOT NULL DEFAULT 0,
        parent_id TEXT,
        is_syncing INTEGER NOT NULL DEFAULT 0,
        last_synced_at INTEGER,
        FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE,
        UNIQUE(account_id, path)
      )`,

      `CREATE TABLE IF NOT EXISTS emails (
        id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL,
        folder_id TEXT NOT NULL,
        message_id TEXT NOT NULL,
        thread_id TEXT NOT NULL,
        uid INTEGER NOT NULL,
        flags TEXT,
        from_name TEXT,
        from_email TEXT NOT NULL,
        to_contacts TEXT,
        cc_contacts TEXT,
        bcc_contacts TEXT,
        reply_to_name TEXT,
        reply_to_email TEXT,
        subject TEXT NOT NULL,
        body_plain TEXT,
        body_html TEXT,
        body_markdown TEXT,
        date INTEGER NOT NULL,
        internal_date INTEGER NOT NULL,
        size INTEGER NOT NULL,
        refs TEXT,
        in_reply_to TEXT,
        labels TEXT,
        is_read INTEGER NOT NULL DEFAULT 0,
        is_starred INTEGER NOT NULL DEFAULT 0,
        has_tracking INTEGER NOT NULL DEFAULT 0,
        is_encrypted INTEGER NOT NULL DEFAULT 0,
        is_signed INTEGER NOT NULL DEFAULT 0,
        signature_valid INTEGER,
        preview TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
        FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE,
        UNIQUE(account_id, folder_id, uid)
      )`,

      `CREATE TABLE IF NOT EXISTS attachments (
        id TEXT PRIMARY KEY,
        email_id TEXT NOT NULL,
        filename TEXT NOT NULL,
        content_type TEXT NOT NULL,
        size INTEGER NOT NULL,
        content_id TEXT,
        is_inline INTEGER NOT NULL DEFAULT 0,
        local_path TEXT,
        encoding TEXT NOT NULL,
        FOREIGN KEY (email_id) REFERENCES emails(id) ON DELETE CASCADE
      )`,

      `CREATE TABLE IF NOT EXISTS labels (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        color TEXT NOT NULL,
        parent_id TEXT,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (parent_id) REFERENCES labels(id) ON DELETE CASCADE
      )`,

      `CREATE TABLE IF NOT EXISTS email_labels (
        email_id TEXT NOT NULL,
        label_id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        PRIMARY KEY (email_id, label_id),
        FOREIGN KEY (email_id) REFERENCES emails(id) ON DELETE CASCADE,
        FOREIGN KEY (label_id) REFERENCES labels(id) ON DELETE CASCADE
      )`,

      `CREATE TABLE IF NOT EXISTS filters (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        priority INTEGER NOT NULL DEFAULT 0,
        conditions TEXT NOT NULL,
        actions TEXT NOT NULL,
        match_type TEXT NOT NULL CHECK (match_type IN ('all', 'any')),
        account_ids TEXT,
        folder_ids TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`,

      `CREATE TABLE IF NOT EXISTS signatures (
        id TEXT PRIMARY KEY,
        account_id TEXT,
        name TEXT NOT NULL,
        html TEXT NOT NULL,
        plain TEXT NOT NULL,
        is_default INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
      )`,

      `CREATE TABLE IF NOT EXISTS templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        subject TEXT NOT NULL,
        body_plain TEXT,
        body_html TEXT,
        body_markdown TEXT,
        attachments TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`,

      `CREATE TABLE IF NOT EXISTS gpg_keys (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK (type IN ('public', 'private')),
        fingerprint TEXT NOT NULL,
        key_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        email TEXT NOT NULL,
        armored TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        expires_at INTEGER,
        is_revoked INTEGER NOT NULL DEFAULT 0,
        UNIQUE(fingerprint, type)
      )`,

      `CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        theme TEXT NOT NULL DEFAULT 'system',
        language TEXT NOT NULL DEFAULT 'zh-CN',
        notifications INTEGER NOT NULL DEFAULT 1,
        auto_check INTEGER NOT NULL DEFAULT 1,
        check_interval INTEGER NOT NULL DEFAULT 5,
        prevent_tracking INTEGER NOT NULL DEFAULT 1,
        preview_pane INTEGER NOT NULL DEFAULT 1,
        thread_view INTEGER NOT NULL DEFAULT 1,
        backup_enabled INTEGER NOT NULL DEFAULT 0,
        backup_interval INTEGER NOT NULL DEFAULT 86400000,
        backup_destination TEXT,
        backup_keep INTEGER NOT NULL DEFAULT 7,
        backup_include_attachments INTEGER NOT NULL DEFAULT 1,
        backup_last_run INTEGER,
        backup_next_run INTEGER,
        plugin_settings TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`,

      `CREATE TABLE IF NOT EXISTS plugins (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        version TEXT NOT NULL,
        path TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        manifest TEXT,
        error TEXT,
        installed_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`
    ];

    for (const sql of tables) {
      this.db.exec(sql);
    }
  }

  private createIndexes(): void {
    if (!this.db) throw new Error('Database not initialized');

    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_emails_thread_id ON emails(thread_id)',
      'CREATE INDEX IF NOT EXISTS idx_emails_date ON emails(date DESC)',
      'CREATE INDEX IF NOT EXISTS idx_emails_account_folder ON emails(account_id, folder_id)',
      'CREATE INDEX IF NOT EXISTS idx_emails_is_read ON emails(is_read)',
      'CREATE INDEX IF NOT EXISTS idx_emails_is_starred ON emails(is_starred)',
      'CREATE INDEX IF NOT EXISTS idx_emails_subject ON emails(subject)',
      'CREATE INDEX IF NOT EXISTS idx_emails_from_email ON emails(from_email)',
      'CREATE INDEX IF NOT EXISTS idx_attachments_email_id ON attachments(email_id)',
      'CREATE INDEX IF NOT EXISTS idx_folders_account_id ON folders(account_id)',
      'CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders(parent_id)',
      'CREATE INDEX IF NOT EXISTS idx_labels_parent_id ON labels(parent_id)',
      'CREATE INDEX IF NOT EXISTS idx_email_labels_label_id ON email_labels(label_id)',
      'CREATE INDEX IF NOT EXISTS idx_emails_fts ON emails(subject, body_plain, body_html, from_name, from_email)'
    ];

    for (const sql of indexes) {
      this.db.exec(sql);
    }
  }

  private insertDefaultSettings(): void {
    if (!this.db) throw new Error('Database not initialized');

    const count = this.db.prepare('SELECT COUNT(*) as count FROM settings').get() as { count: number };
    if (count.count === 0) {
      const now = Date.now();
      this.db.prepare(`INSERT INTO settings (
        id, theme, language, notifications, auto_check, check_interval,
        prevent_tracking, preview_pane, thread_view, backup_enabled,
        backup_interval, backup_destination, backup_keep, backup_include_attachments,
        plugin_settings, created_at, updated_at
      ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
        DEFAULT_SETTINGS.theme,
        DEFAULT_SETTINGS.language,
        DEFAULT_SETTINGS.notifications ? 1 : 0,
        DEFAULT_SETTINGS.autoCheck ? 1 : 0,
        DEFAULT_SETTINGS.checkInterval,
        DEFAULT_SETTINGS.preventTracking ? 1 : 0,
        DEFAULT_SETTINGS.previewPane ? 1 : 0,
        DEFAULT_SETTINGS.threadView ? 1 : 0,
        DEFAULT_SETTINGS.backupSettings.enabled ? 1 : 0,
        DEFAULT_SETTINGS.backupSettings.interval,
        DEFAULT_SETTINGS.backupSettings.destination,
        DEFAULT_SETTINGS.backupSettings.keepBackups,
        DEFAULT_SETTINGS.backupSettings.includeAttachments ? 1 : 0,
        JSON.stringify(DEFAULT_SETTINGS.pluginSettings),
        now,
        now
      );
    }
  }

  close(): void {
    if (this.db) {
      this.db.pragma('wal_checkpoint(TRUNCATE)');
      this.db.close();
      this.db = null;
    }
  }

  getDb(): Database.Database {
    if (!this.db) throw new Error('Database not initialized');
    return this.db;
  }

  getDatabasePath(): string {
    return this.dbPath;
  }

  async getAccounts(): Promise<EmailAccount[]> {
    const rows = this.getDb().prepare('SELECT * FROM accounts ORDER BY created_at').all() as any[];
    return rows.map(this.rowToAccount);
  }

  async getAccount(id: string): Promise<EmailAccount | null> {
    const row = this.getDb().prepare('SELECT * FROM accounts WHERE id = ?').get(id) as any;
    return row ? this.rowToAccount(row) : null;
  }

  async addAccount(account: Omit<EmailAccount, 'id' | 'createdAt' | 'updatedAt'>): Promise<EmailAccount> {
    const now = Date.now();
    const id = generateId();
    const stmt = this.getDb().prepare(`INSERT INTO accounts (
      id, name, email, password, provider,
      imap_host, imap_port, imap_secure, imap_username, imap_password,
      smtp_host, smtp_port, smtp_secure, smtp_username, smtp_password,
      sync_days, max_attachment_size, auto_download_attachments, sync_interval,
      signature_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    stmt.run(
      id, account.name, account.email, account.password, account.provider,
      account.imap.host, account.imap.port, account.imap.secure ? 1 : 0, account.imap.username, account.imap.password,
      account.smtp.host, account.smtp.port, account.smtp.secure ? 1 : 0, account.smtp.username, account.smtp.password,
      account.syncSettings.syncDays, account.syncSettings.maxAttachmentSize,
      account.syncSettings.autoDownloadAttachments ? 1 : 0, account.syncSettings.syncInterval,
      account.signatureId || null, now, now
    );
    return { ...account, id, createdAt: now, updatedAt: now };
  }

  async updateAccount(id: string, account: Partial<EmailAccount>): Promise<EmailAccount> {
    const existing = await this.getAccount(id);
    if (!existing) throw new Error('Account not found');

    const now = Date.now();
    const updates: string[] = [];
    const params: any[] = [];

    if (account.name !== undefined) { updates.push('name = ?'); params.push(account.name); }
    if (account.email !== undefined) { updates.push('email = ?'); params.push(account.email); }
    if (account.password !== undefined) { updates.push('password = ?'); params.push(account.password); }
    if (account.provider !== undefined) { updates.push('provider = ?'); params.push(account.provider); }
    if (account.imap) {
      updates.push('imap_host = ?', 'imap_port = ?', 'imap_secure = ?', 'imap_username = ?', 'imap_password = ?');
      params.push(account.imap.host, account.imap.port, account.imap.secure ? 1 : 0, account.imap.username, account.imap.password);
    }
    if (account.smtp) {
      updates.push('smtp_host = ?', 'smtp_port = ?', 'smtp_secure = ?', 'smtp_username = ?', 'smtp_password = ?');
      params.push(account.smtp.host, account.smtp.port, account.smtp.secure ? 1 : 0, account.smtp.username, account.smtp.password);
    }
    if (account.syncSettings) {
      if (account.syncSettings.syncDays !== undefined) { updates.push('sync_days = ?'); params.push(account.syncSettings.syncDays); }
      if (account.syncSettings.maxAttachmentSize !== undefined) { updates.push('max_attachment_size = ?'); params.push(account.syncSettings.maxAttachmentSize); }
      if (account.syncSettings.autoDownloadAttachments !== undefined) { updates.push('auto_download_attachments = ?'); params.push(account.syncSettings.autoDownloadAttachments ? 1 : 0); }
      if (account.syncSettings.syncInterval !== undefined) { updates.push('sync_interval = ?'); params.push(account.syncSettings.syncInterval); }
    }
    if (account.signatureId !== undefined) { updates.push('signature_id = ?'); params.push(account.signatureId || null); }

    updates.push('updated_at = ?');
    params.push(now, id);

    this.getDb().prepare(`UPDATE accounts SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    const updated = await this.getAccount(id);
    if (!updated) throw new Error('Failed to update account');
    return updated;
  }

  async deleteAccount(id: string): Promise<void> {
    this.getDb().prepare('DELETE FROM accounts WHERE id = ?').run(id);
  }

  async getFolders(accountId?: string): Promise<MailFolder[]> {
    let sql = 'SELECT * FROM folders';
    let params: any[] = [];
    if (accountId) {
      sql += ' WHERE account_id = ?';
      params.push(accountId);
    }
    sql += ' ORDER BY account_id, path';
    const rows = this.getDb().prepare(sql).all(...params) as any[];
    return rows.map(this.rowToFolder);
  }

  async getFolder(id: string): Promise<MailFolder | null> {
    const row = this.getDb().prepare('SELECT * FROM folders WHERE id = ?').get(id) as any;
    return row ? this.rowToFolder(row) : null;
  }

  async getFolderByPath(accountId: string, path: string): Promise<MailFolder | null> {
    const row = this.getDb().prepare('SELECT * FROM folders WHERE account_id = ? AND path = ?').get(accountId, path) as any;
    return row ? this.rowToFolder(row) : null;
  }

  async addFolder(folder: Omit<MailFolder, 'id'>): Promise<MailFolder> {
    const now = Date.now();
    const id = generateId();
    const stmt = this.getDb().prepare(`INSERT INTO folders (
      id, account_id, name, path, delimiter, attributes, uid_validity, uid_next,
      total_messages, unread_count, parent_id, is_syncing, last_synced_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    stmt.run(
      id, folder.accountId, folder.name, folder.path, folder.delimiter,
      JSON.stringify(folder.attributes), folder.uidValidity, folder.uidNext,
      folder.totalMessages, folder.unreadCount, folder.parentId || null,
      folder.isSyncing ? 1 : 0, folder.lastSyncedAt || now
    );
    return { ...folder, id };
  }

  async updateFolder(id: string, folder: Partial<MailFolder>): Promise<MailFolder> {
    const updates: string[] = [];
    const params: any[] = [];

    if (folder.name !== undefined) { updates.push('name = ?'); params.push(folder.name); }
    if (folder.uidValidity !== undefined) { updates.push('uid_validity = ?'); params.push(folder.uidValidity); }
    if (folder.uidNext !== undefined) { updates.push('uid_next = ?'); params.push(folder.uidNext); }
    if (folder.totalMessages !== undefined) { updates.push('total_messages = ?'); params.push(folder.totalMessages); }
    if (folder.unreadCount !== undefined) { updates.push('unread_count = ?'); params.push(folder.unreadCount); }
    if (folder.isSyncing !== undefined) { updates.push('is_syncing = ?'); params.push(folder.isSyncing ? 1 : 0); }
    if (folder.lastSyncedAt !== undefined) { updates.push('last_synced_at = ?'); params.push(folder.lastSyncedAt); }

    if (updates.length === 0) {
      const f = await this.getFolder(id);
      if (!f) throw new Error('Folder not found');
      return f;
    }

    params.push(id);
    this.getDb().prepare(`UPDATE folders SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    const updated = await this.getFolder(id);
    if (!updated) throw new Error('Failed to update folder');
    return updated;
  }

  async deleteFolder(id: string): Promise<void> {
    this.getDb().prepare('DELETE FROM folders WHERE id = ?').run(id);
  }

  async getEmails(folderId: string, limit: number = 50, offset: number = 0): Promise<{ emails: Email[]; total: number }> {
    const total = this.getDb().prepare('SELECT COUNT(*) as count FROM emails WHERE folder_id = ?').get(folderId) as { count: number };
    const rows = this.getDb().prepare(`
      SELECT * FROM emails 
      WHERE folder_id = ? 
      ORDER BY date DESC 
      LIMIT ? OFFSET ?
    `).all(folderId, limit, offset) as any[];
    
    return {
      emails: await Promise.all(rows.map(async r => this.rowToEmail(r))),
      total: total.count
    };
  }

  async getEmail(id: string): Promise<Email | null> {
    const row = this.getDb().prepare('SELECT * FROM emails WHERE id = ?').get(id) as any;
    return row ? this.rowToEmail(row) : null;
  }

  async getEmailByMessageId(accountId: string, messageId: string): Promise<Email | null> {
    const row = this.getDb().prepare('SELECT * FROM emails WHERE account_id = ? AND message_id = ?').get(accountId, messageId) as any;
    return row ? this.rowToEmail(row) : null;
  }

  async getEmailsByThread(threadId: string): Promise<Email[]> {
    const rows = this.getDb().prepare(`
      SELECT * FROM emails 
      WHERE thread_id = ? 
      ORDER BY date ASC
    `).all(threadId) as any[];
    return Promise.all(rows.map(async r => this.rowToEmail(r)));
  }

  async getThreads(folderId: string, limit: number = 50, offset: number = 0): Promise<{ threads: Thread[]; total: number }> {
    const threadRows = this.getDb().prepare(`
      SELECT thread_id, MAX(date) as last_date, 
             COUNT(*) as total_messages,
             SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END) as unread_count,
             MAX(subject) as subject,
             MAX(preview) as preview,
             GROUP_CONCAT(DISTINCT account_id) as account_ids,
             MAX(CASE WHEN (SELECT COUNT(*) FROM attachments a WHERE a.email_id = emails.id) > 0 THEN 1 ELSE 0 END) as has_attachment
      FROM emails 
      WHERE folder_id = ?
      GROUP BY thread_id
      ORDER BY last_date DESC
      LIMIT ? OFFSET ?
    `).all(folderId, limit, offset) as any[];

    const totalResult = this.getDb().prepare(`
      SELECT COUNT(DISTINCT thread_id) as count 
      FROM emails 
      WHERE folder_id = ?
    `).get(folderId) as { count: number };

    const threads: Thread[] = [];
    for (const row of threadRows) {
      const emails = await this.getEmailsByThread(row.thread_id);
      const participants = new Map<string, EmailContact>();
      const labels = new Set<string>();
      
      emails.forEach(e => {
        participants.set(e.from.email, e.from);
        e.to.forEach(t => participants.set(t.email, t));
        e.labels.forEach(l => labels.add(l));
      });

      threads.push({
        id: row.thread_id,
        subject: row.subject,
        emails,
        participants: Array.from(participants.values()),
        lastMessageAt: row.last_date,
        totalMessages: row.total_messages,
        unreadCount: row.unread_count,
        labels: Array.from(labels),
        preview: row.preview,
        hasAttachment: row.has_attachment === 1,
        accountIds: row.account_ids.split(',')
      });
    }

    return { threads, total: totalResult.count };
  }

  async addEmail(email: Omit<Email, 'id'>, attachments: Omit<Attachment, 'id'>[] = []): Promise<Email> {
    const now = Date.now();
    const id = generateId();

    const tx = this.getDb().transaction(() => {
      this.getDb().prepare(`INSERT INTO emails (
        id, account_id, folder_id, message_id, thread_id, uid, flags,
        from_name, from_email, to_contacts, cc_contacts, bcc_contacts,
        reply_to_name, reply_to_email, subject, body_plain, body_html, body_markdown,
        date, internal_date, size, refs, in_reply_to, labels,
        is_read, is_starred, has_tracking, is_encrypted, is_signed, signature_valid,
        preview, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
        id, email.accountId, email.folderId, email.messageId, email.threadId, email.uid,
        JSON.stringify(email.flags), email.from.name, email.from.email,
        JSON.stringify(email.to), JSON.stringify(email.cc), JSON.stringify(email.bcc),
        email.replyTo?.name || null, email.replyTo?.email || null,
        email.subject, email.body.plain || null, email.body.html || null, email.body.markdown || null,
        email.date, email.internalDate, email.size,
        JSON.stringify(email.references), email.inReplyTo || null, JSON.stringify(email.labels),
        email.isRead ? 1 : 0, email.isStarred ? 1 : 0, email.hasTracking ? 1 : 0,
        email.isEncrypted ? 1 : 0, email.isSigned ? 1 : 0, email.signatureValid ? 1 : 0,
        email.preview, now, now
      );

      const attachStmt = this.getDb().prepare(`INSERT INTO attachments (
        id, email_id, filename, content_type, size, content_id,
        is_inline, local_path, encoding
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);

      for (const att of attachments) {
        const attId = generateId();
        attachStmt.run(
          attId, id, att.filename, att.contentType, att.size,
          att.contentId || null, att.isInline ? 1 : 0, att.localPath || null, att.encoding
        );
      }

      return id;
    });

    const emailId = tx();
    const result = await this.getEmail(emailId);
    if (!result) throw new Error('Failed to add email');
    return result;
  }

  async updateEmail(id: string, updates: Partial<Email>): Promise<Email> {
    const setClauses: string[] = [];
    const params: any[] = [];

    if (updates.isRead !== undefined) { setClauses.push('is_read = ?'); params.push(updates.isRead ? 1 : 0); }
    if (updates.isStarred !== undefined) { setClauses.push('is_starred = ?'); params.push(updates.isStarred ? 1 : 0); }
    if (updates.folderId !== undefined) { setClauses.push('folder_id = ?'); params.push(updates.folderId); }
    if (updates.flags) {
      setClauses.push('flags = ?');
      params.push(JSON.stringify(updates.flags));
      setClauses.push('is_read = ?');
      params.push(updates.flags.seen ? 1 : 0);
    }
    if (updates.labels) { setClauses.push('labels = ?'); params.push(JSON.stringify(updates.labels)); }
    if (updates.body) {
      if (updates.body.plain !== undefined) { setClauses.push('body_plain = ?'); params.push(updates.body.plain); }
      if (updates.body.html !== undefined) { setClauses.push('body_html = ?'); params.push(updates.body.html); }
    }
    if (updates.hasTracking !== undefined) { setClauses.push('has_tracking = ?'); params.push(updates.hasTracking ? 1 : 0); }

    if (setClauses.length === 0) {
      const e = await this.getEmail(id);
      if (!e) throw new Error('Email not found');
      return e;
    }

    setClauses.push('updated_at = ?');
    params.push(Date.now(), id);

    this.getDb().prepare(`UPDATE emails SET ${setClauses.join(', ')} WHERE id = ?`).run(...params);
    const updated = await this.getEmail(id);
    if (!updated) throw new Error('Failed to update email');
    return updated;
  }

  async deleteEmail(id: string): Promise<void> {
    this.getDb().prepare('DELETE FROM emails WHERE id = ?').run(id);
  }

  async getAttachments(emailId: string): Promise<Attachment[]> {
    const rows = this.getDb().prepare('SELECT * FROM attachments WHERE email_id = ?').all(emailId) as any[];
    return rows.map(this.rowToAttachment);
  }

  async getAttachment(id: string): Promise<Attachment | null> {
    const row = this.getDb().prepare('SELECT * FROM attachments WHERE id = ?').get(id) as any;
    return row ? this.rowToAttachment(row) : null;
  }

  async updateAttachment(id: string, updates: Partial<Attachment>): Promise<Attachment> {
    const setClauses: string[] = [];
    const params: any[] = [];

    if (updates.localPath !== undefined) { setClauses.push('local_path = ?'); params.push(updates.localPath); }

    if (setClauses.length === 0) {
      const a = await this.getAttachment(id);
      if (!a) throw new Error('Attachment not found');
      return a;
    }

    params.push(id);
    this.getDb().prepare(`UPDATE attachments SET ${setClauses.join(', ')} WHERE id = ?`).run(...params);
    const updated = await this.getAttachment(id);
    if (!updated) throw new Error('Failed to update attachment');
    return updated;
  }

  async getLabels(): Promise<EmailLabel[]> {
    const rows = this.getDb().prepare('SELECT * FROM labels ORDER BY sort_order, name').all() as any[];
    return rows.map(this.rowToLabel);
  }

  async addLabel(label: Omit<EmailLabel, 'id' | 'createdAt'>): Promise<EmailLabel> {
    const now = Date.now();
    const id = generateId();
    this.getDb().prepare(`INSERT INTO labels (
      id, name, color, parent_id, sort_order, created_at
    ) VALUES (?, ?, ?, ?, ?, ?)`).run(
      id, label.name, label.color, label.parentId || null, label.sortOrder, now
    );
    return { ...label, id, createdAt: now };
  }

  async updateLabel(id: string, label: Partial<EmailLabel>): Promise<EmailLabel> {
    const updates: string[] = [];
    const params: any[] = [];

    if (label.name !== undefined) { updates.push('name = ?'); params.push(label.name); }
    if (label.color !== undefined) { updates.push('color = ?'); params.push(label.color); }
    if (label.parentId !== undefined) { updates.push('parent_id = ?'); params.push(label.parentId || null); }
    if (label.sortOrder !== undefined) { updates.push('sort_order = ?'); params.push(label.sortOrder); }

    if (updates.length === 0) {
      const l = await this.getLabel(id);
      if (!l) throw new Error('Label not found');
      return l;
    }

    params.push(id);
    this.getDb().prepare(`UPDATE labels SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    const updated = await this.getLabel(id);
    if (!updated) throw new Error('Failed to update label');
    return updated;
  }

  async getLabel(id: string): Promise<EmailLabel | null> {
    const row = this.getDb().prepare('SELECT * FROM labels WHERE id = ?').get(id) as any;
    return row ? this.rowToLabel(row) : null;
  }

  async deleteLabel(id: string): Promise<void> {
    this.getDb().prepare('DELETE FROM labels WHERE id = ?').run(id);
  }

  async applyLabelToEmail(emailId: string, labelId: string): Promise<void> {
    const now = Date.now();
    this.getDb().prepare(`INSERT OR IGNORE INTO email_labels (
      email_id, label_id, created_at
    ) VALUES (?, ?, ?)`).run(emailId, labelId, now);

    const email = await this.getEmail(emailId);
    if (email && !email.labels.includes(labelId)) {
      await this.updateEmail(emailId, { labels: [...email.labels, labelId] });
    }
  }

  async removeLabelFromEmail(emailId: string, labelId: string): Promise<void> {
    this.getDb().prepare('DELETE FROM email_labels WHERE email_id = ? AND label_id = ?').run(emailId, labelId);

    const email = await this.getEmail(emailId);
    if (email) {
      await this.updateEmail(emailId, { labels: email.labels.filter(l => l !== labelId) });
    }
  }

  async getFilters(): Promise<FilterRule[]> {
    const rows = this.getDb().prepare('SELECT * FROM filters ORDER BY priority, created_at').all() as any[];
    return rows.map(this.rowToFilter);
  }

  async addFilter(filter: Omit<FilterRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<FilterRule> {
    const now = Date.now();
    const id = generateId();
    this.getDb().prepare(`INSERT INTO filters (
      id, name, enabled, priority, conditions, actions,
      match_type, account_ids, folder_ids, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      id, filter.name, filter.enabled ? 1 : 0, filter.priority,
      JSON.stringify(filter.conditions), JSON.stringify(filter.actions),
      filter.matchType, JSON.stringify(filter.accountIds), JSON.stringify(filter.folderIds),
      now, now
    );
    return { ...filter, id, createdAt: now, updatedAt: now };
  }

  async updateFilter(id: string, filter: Partial<FilterRule>): Promise<FilterRule> {
    const updates: string[] = [];
    const params: any[] = [];

    if (filter.name !== undefined) { updates.push('name = ?'); params.push(filter.name); }
    if (filter.enabled !== undefined) { updates.push('enabled = ?'); params.push(filter.enabled ? 1 : 0); }
    if (filter.priority !== undefined) { updates.push('priority = ?'); params.push(filter.priority); }
    if (filter.conditions) { updates.push('conditions = ?'); params.push(JSON.stringify(filter.conditions)); }
    if (filter.actions) { updates.push('actions = ?'); params.push(JSON.stringify(filter.actions)); }
    if (filter.matchType) { updates.push('match_type = ?'); params.push(filter.matchType); }
    if (filter.accountIds) { updates.push('account_ids = ?'); params.push(JSON.stringify(filter.accountIds)); }
    if (filter.folderIds) { updates.push('folder_ids = ?'); params.push(JSON.stringify(filter.folderIds)); }

    if (updates.length === 0) {
      const f = await this.getFilter(id);
      if (!f) throw new Error('Filter not found');
      return f;
    }

    updates.push('updated_at = ?');
    params.push(Date.now(), id);

    this.getDb().prepare(`UPDATE filters SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    const updated = await this.getFilter(id);
    if (!updated) throw new Error('Failed to update filter');
    return updated;
  }

  async getFilter(id: string): Promise<FilterRule | null> {
    const row = this.getDb().prepare('SELECT * FROM filters WHERE id = ?').get(id) as any;
    return row ? this.rowToFilter(row) : null;
  }

  async deleteFilter(id: string): Promise<void> {
    this.getDb().prepare('DELETE FROM filters WHERE id = ?').run(id);
  }

  async getSignatures(): Promise<EmailSignature[]> {
    const rows = this.getDb().prepare('SELECT * FROM signatures ORDER BY is_default DESC, created_at').all() as any[];
    return rows.map(this.rowToSignature);
  }

  async addSignature(signature: Omit<EmailSignature, 'id' | 'createdAt' | 'updatedAt'>): Promise<EmailSignature> {
    const now = Date.now();
    const id = generateId();

    if (signature.isDefault) {
      this.getDb().prepare('UPDATE signatures SET is_default = 0 WHERE account_id = ? OR (account_id IS NULL AND ? IS NULL)').run(signature.accountId || null, signature.accountId || null);
    }

    this.getDb().prepare(`INSERT INTO signatures (
      id, account_id, name, html, plain, is_default, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
      id, signature.accountId || null, signature.name, signature.html,
      signature.plain, signature.isDefault ? 1 : 0, now, now
    );
    return { ...signature, id, createdAt: now, updatedAt: now };
  }

  async updateSignature(id: string, signature: Partial<EmailSignature>): Promise<EmailSignature> {
    const updates: string[] = [];
    const params: any[] = [];

    if (signature.name !== undefined) { updates.push('name = ?'); params.push(signature.name); }
    if (signature.html !== undefined) { updates.push('html = ?'); params.push(signature.html); }
    if (signature.plain !== undefined) { updates.push('plain = ?'); params.push(signature.plain); }
    if (signature.isDefault !== undefined) {
      const existing = await this.getSignature(id);
      if (signature.isDefault && existing) {
        this.getDb().prepare('UPDATE signatures SET is_default = 0 WHERE account_id = ? OR (account_id IS NULL AND ? IS NULL)').run(existing.accountId || null, existing.accountId || null);
      }
      updates.push('is_default = ?');
      params.push(signature.isDefault ? 1 : 0);
    }

    if (updates.length === 0) {
      const s = await this.getSignature(id);
      if (!s) throw new Error('Signature not found');
      return s;
    }

    updates.push('updated_at = ?');
    params.push(Date.now(), id);

    this.getDb().prepare(`UPDATE signatures SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    const updated = await this.getSignature(id);
    if (!updated) throw new Error('Failed to update signature');
    return updated;
  }

  async getSignature(id: string): Promise<EmailSignature | null> {
    const row = this.getDb().prepare('SELECT * FROM signatures WHERE id = ?').get(id) as any;
    return row ? this.rowToSignature(row) : null;
  }

  async deleteSignature(id: string): Promise<void> {
    this.getDb().prepare('DELETE FROM signatures WHERE id = ?').run(id);
  }

  async getTemplates(): Promise<EmailTemplate[]> {
    const rows = this.getDb().prepare('SELECT * FROM templates ORDER BY updated_at DESC').all() as any[];
    return rows.map(this.rowToTemplate);
  }

  async addTemplate(template: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<EmailTemplate> {
    const now = Date.now();
    const id = generateId();
    this.getDb().prepare(`INSERT INTO templates (
      id, name, subject, body_plain, body_html, body_markdown,
      attachments, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      id, template.name, template.subject,
      template.body.plain || null, template.body.html || null, template.body.markdown || null,
      JSON.stringify(template.attachments), now, now
    );
    return { ...template, id, createdAt: now, updatedAt: now };
  }

  async updateTemplate(id: string, template: Partial<EmailTemplate>): Promise<EmailTemplate> {
    const updates: string[] = [];
    const params: any[] = [];

    if (template.name !== undefined) { updates.push('name = ?'); params.push(template.name); }
    if (template.subject !== undefined) { updates.push('subject = ?'); params.push(template.subject); }
    if (template.body) {
      if (template.body.plain !== undefined) { updates.push('body_plain = ?'); params.push(template.body.plain); }
      if (template.body.html !== undefined) { updates.push('body_html = ?'); params.push(template.body.html); }
      if (template.body.markdown !== undefined) { updates.push('body_markdown = ?'); params.push(template.body.markdown); }
    }
    if (template.attachments) { updates.push('attachments = ?'); params.push(JSON.stringify(template.attachments)); }

    if (updates.length === 0) {
      const t = await this.getTemplate(id);
      if (!t) throw new Error('Template not found');
      return t;
    }

    updates.push('updated_at = ?');
    params.push(Date.now(), id);

    this.getDb().prepare(`UPDATE templates SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    const updated = await this.getTemplate(id);
    if (!updated) throw new Error('Failed to update template');
    return updated;
  }

  async getTemplate(id: string): Promise<EmailTemplate | null> {
    const row = this.getDb().prepare('SELECT * FROM templates WHERE id = ?').get(id) as any;
    return row ? this.rowToTemplate(row) : null;
  }

  async deleteTemplate(id: string): Promise<void> {
    this.getDb().prepare('DELETE FROM templates WHERE id = ?').run(id);
  }

  async getGpgKeys(type?: 'public' | 'private'): Promise<GpgKey[]> {
    let sql = 'SELECT * FROM gpg_keys';
    let params: any[] = [];
    if (type) {
      sql += ' WHERE type = ?';
      params.push(type);
    }
    sql += ' ORDER BY created_at DESC';
    const rows = this.getDb().prepare(sql).all(...params) as any[];
    return rows.map(this.rowToGpgKey);
  }

  async addGpgKey(key: Omit<GpgKey, 'id'>): Promise<GpgKey> {
    const id = generateId();
    this.getDb().prepare(`INSERT INTO gpg_keys (
      id, type, fingerprint, key_id, user_id, email, armored,
      created_at, expires_at, is_revoked
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      id, key.type, key.fingerprint, key.keyId, key.userId,
      key.email, key.armored, key.createdAt, key.expiresAt || null,
      key.isRevoked ? 1 : 0
    );
    return { ...key, id };
  }

  async getGpgKey(id: string): Promise<GpgKey | null> {
    const row = this.getDb().prepare('SELECT * FROM gpg_keys WHERE id = ?').get(id) as any;
    return row ? this.rowToGpgKey(row) : null;
  }

  async getGpgKeyByFingerprint(fingerprint: string): Promise<GpgKey | null> {
    const row = this.getDb().prepare('SELECT * FROM gpg_keys WHERE fingerprint = ?').get(fingerprint) as any;
    return row ? this.rowToGpgKey(row) : null;
  }

  async deleteGpgKey(id: string): Promise<void> {
    this.getDb().prepare('DELETE FROM gpg_keys WHERE id = ?').run(id);
  }

  async getSettings(): Promise<AppSettings> {
    const row = this.getDb().prepare('SELECT * FROM settings WHERE id = 1').get() as any;
    return this.rowToSettings(row);
  }

  async updateSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
    const updates: string[] = [];
    const params: any[] = [];

    if (settings.theme !== undefined) { updates.push('theme = ?'); params.push(settings.theme); }
    if (settings.language !== undefined) { updates.push('language = ?'); params.push(settings.language); }
    if (settings.notifications !== undefined) { updates.push('notifications = ?'); params.push(settings.notifications ? 1 : 0); }
    if (settings.autoCheck !== undefined) { updates.push('auto_check = ?'); params.push(settings.autoCheck ? 1 : 0); }
    if (settings.checkInterval !== undefined) { updates.push('check_interval = ?'); params.push(settings.checkInterval); }
    if (settings.preventTracking !== undefined) { updates.push('prevent_tracking = ?'); params.push(settings.preventTracking ? 1 : 0); }
    if (settings.previewPane !== undefined) { updates.push('preview_pane = ?'); params.push(settings.previewPane ? 1 : 0); }
    if (settings.threadView !== undefined) { updates.push('thread_view = ?'); params.push(settings.threadView ? 1 : 0); }
    if (settings.pluginSettings) { updates.push('plugin_settings = ?'); params.push(JSON.stringify(settings.pluginSettings)); }
    
    if (settings.backupSettings) {
      if (settings.backupSettings.enabled !== undefined) { updates.push('backup_enabled = ?'); params.push(settings.backupSettings.enabled ? 1 : 0); }
      if (settings.backupSettings.interval !== undefined) { updates.push('backup_interval = ?'); params.push(settings.backupSettings.interval); }
      if (settings.backupSettings.destination !== undefined) { updates.push('backup_destination = ?'); params.push(settings.backupSettings.destination); }
      if (settings.backupSettings.keepBackups !== undefined) { updates.push('backup_keep = ?'); params.push(settings.backupSettings.keepBackups); }
      if (settings.backupSettings.includeAttachments !== undefined) { updates.push('backup_include_attachments = ?'); params.push(settings.backupSettings.includeAttachments ? 1 : 0); }
      if (settings.backupSettings.lastBackupAt !== undefined) { updates.push('backup_last_run = ?'); params.push(settings.backupSettings.lastBackupAt); }
      if (settings.backupSettings.nextBackupAt !== undefined) { updates.push('backup_next_run = ?'); params.push(settings.backupSettings.nextBackupAt); }
    }

    if (updates.length === 0) {
      return this.getSettings();
    }

    updates.push('updated_at = ?');
    params.push(Date.now());

    this.getDb().prepare(`UPDATE settings SET ${updates.join(', ')} WHERE id = 1`).run(...params);
    return this.getSettings();
  }

  async searchEmails(query: SearchQuery): Promise<SearchResult> {
    const conditions: string[] = [];
    const params: any[] = [];

    if (query.accountIds && query.accountIds.length > 0) {
      const placeholders = query.accountIds.map(() => '?').join(',');
      conditions.push(`account_id IN (${placeholders})`);
      params.push(...query.accountIds);
    }

    if (query.folderIds && query.folderIds.length > 0) {
      const placeholders = query.folderIds.map(() => '?').join(',');
      conditions.push(`folder_id IN (${placeholders})`);
      params.push(...query.folderIds);
    }

    if (query.from) {
      conditions.push('(from_name LIKE ? OR from_email LIKE ?)');
      params.push(`%${query.from}%`, `%${query.from}%`);
    }

    if (query.to) {
      conditions.push('(to_contacts LIKE ? OR cc_contacts LIKE ?)');
      params.push(`%${query.to}%`, `%${query.to}%`);
    }

    if (query.dateFrom) {
      conditions.push('date >= ?');
      params.push(query.dateFrom);
    }

    if (query.dateTo) {
      conditions.push('date <= ?');
      params.push(query.dateTo);
    }

    if (query.hasAttachment !== undefined) {
      if (query.hasAttachment) {
        conditions.push('EXISTS (SELECT 1 FROM attachments a WHERE a.email_id = emails.id)');
      } else {
        conditions.push('NOT EXISTS (SELECT 1 FROM attachments a WHERE a.email_id = emails.id)');
      }
    }

    if (query.labelIds && query.labelIds.length > 0) {
      const placeholders = query.labelIds.map(() => '?').join(',');
      conditions.push(`id IN (SELECT email_id FROM email_labels WHERE label_id IN (${placeholders}))`);
      params.push(...query.labelIds);
    }

    if (query.isRead !== undefined) {
      conditions.push('is_read = ?');
      params.push(query.isRead ? 1 : 0);
    }

    if (query.isStarred !== undefined) {
      conditions.push('is_starred = ?');
      params.push(query.isStarred ? 1 : 0);
    }

    if (query.query && query.query.trim()) {
      const searchTerm = `%${query.query.trim()}%`;
      conditions.push('(subject LIKE ? OR body_plain LIKE ? OR body_html LIKE ? OR from_name LIKE ? OR from_email LIKE ?)');
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    let sql = 'SELECT * FROM emails';
    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }
    sql += ' ORDER BY date DESC LIMIT 200';

    const rows = this.getDb().prepare(sql).all(...params) as any[];
    const emails = await Promise.all(rows.map(async r => this.rowToEmail(r)));

    const countSql = 'SELECT COUNT(*) as count FROM emails' + (conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '');
    const total = this.getDb().prepare(countSql).get(...params) as { count: number };

    let highlighted: Map<string, string[]> | undefined;
    if (query.highlightKeywords && query.query && query.query.trim()) {
      highlighted = new Map();
      const keywords = query.query.trim().toLowerCase().split(/\s+/);
      for (const email of emails) {
        const matches: string[] = [];
        const content = `${email.subject} ${email.body.plain || ''} ${email.from.name} ${email.from.email}`.toLowerCase();
        for (const kw of keywords) {
          if (content.includes(kw)) {
            matches.push(kw);
          }
        }
        if (matches.length > 0) {
          highlighted.set(email.id, matches);
        }
      }
    }

    return { emails, total: total.count, highlighted };
  }

  private rowToAccount(row: any): EmailAccount {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      password: row.password,
      provider: row.provider,
      imap: {
        host: row.imap_host,
        port: row.imap_port,
        secure: row.imap_secure === 1,
        username: row.imap_username,
        password: row.imap_password
      },
      smtp: {
        host: row.smtp_host,
        port: row.smtp_port,
        secure: row.smtp_secure === 1,
        username: row.smtp_username,
        password: row.smtp_password
      },
      syncSettings: {
        syncDays: row.sync_days,
        maxAttachmentSize: row.max_attachment_size,
        autoDownloadAttachments: row.auto_download_attachments === 1,
        syncInterval: row.sync_interval
      },
      signatureId: row.signature_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private rowToFolder(row: any): MailFolder {
    return {
      id: row.id,
      accountId: row.account_id,
      name: row.name,
      path: row.path,
      delimiter: row.delimiter,
      attributes: row.attributes ? JSON.parse(row.attributes) : [],
      uidValidity: row.uid_validity,
      uidNext: row.uid_next,
      totalMessages: row.total_messages,
      unreadCount: row.unread_count,
      parentId: row.parent_id,
      isSyncing: row.is_syncing === 1,
      lastSyncedAt: row.last_synced_at
    };
  }

  private async rowToEmail(row: any): Promise<Email> {
    const flags: EmailFlags = row.flags ? JSON.parse(row.flags) : {
      seen: row.is_read === 1,
      answered: false,
      flagged: row.is_starred === 1,
      deleted: false,
      draft: false,
      recent: false,
      forwarded: false,
      custom: []
    };

    const attachments = await this.getAttachments(row.id);

    return {
      id: row.id,
      accountId: row.account_id,
      folderId: row.folder_id,
      messageId: row.message_id,
      threadId: row.thread_id,
      uid: row.uid,
      flags,
      from: { name: row.from_name || '', email: row.from_email },
      to: row.to_contacts ? JSON.parse(row.to_contacts) : [],
      cc: row.cc_contacts ? JSON.parse(row.cc_contacts) : [],
      bcc: row.bcc_contacts ? JSON.parse(row.bcc_contacts) : [],
      replyTo: row.reply_to_email ? { name: row.reply_to_name || '', email: row.reply_to_email } : undefined,
      subject: row.subject,
      body: {
        plain: row.body_plain,
        html: row.body_html,
        markdown: row.body_markdown
      },
      date: row.date,
      internalDate: row.internal_date,
      size: row.size,
      attachments,
      references: row.refs ? JSON.parse(row.refs) : [],
      inReplyTo: row.in_reply_to,
      labels: row.labels ? JSON.parse(row.labels) : [],
      isRead: row.is_read === 1,
      isStarred: row.is_starred === 1,
      hasTracking: row.has_tracking === 1,
      isEncrypted: row.is_encrypted === 1,
      isSigned: row.is_signed === 1,
      signatureValid: row.signature_valid === 1,
      preview: row.preview,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private rowToAttachment(row: any): Attachment {
    return {
      id: row.id,
      emailId: row.email_id,
      filename: row.filename,
      contentType: row.content_type,
      size: row.size,
      contentId: row.content_id,
      isInline: row.is_inline === 1,
      localPath: row.local_path,
      encoding: row.encoding
    };
  }

  private rowToLabel(row: any): EmailLabel {
    return {
      id: row.id,
      name: row.name,
      color: row.color,
      parentId: row.parent_id,
      sortOrder: row.sort_order,
      createdAt: row.created_at
    };
  }

  private rowToFilter(row: any): FilterRule {
    return {
      id: row.id,
      name: row.name,
      enabled: row.enabled === 1,
      priority: row.priority,
      conditions: JSON.parse(row.conditions),
      actions: JSON.parse(row.actions),
      matchType: row.match_type,
      accountIds: row.account_ids ? JSON.parse(row.account_ids) : [],
      folderIds: row.folder_ids ? JSON.parse(row.folder_ids) : [],
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private rowToSignature(row: any): EmailSignature {
    return {
      id: row.id,
      accountId: row.account_id,
      name: row.name,
      html: row.html,
      plain: row.plain,
      isDefault: row.is_default === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private rowToTemplate(row: any): EmailTemplate {
    return {
      id: row.id,
      name: row.name,
      subject: row.subject,
      body: {
        plain: row.body_plain,
        html: row.body_html,
        markdown: row.body_markdown
      },
      attachments: row.attachments ? JSON.parse(row.attachments) : [],
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private rowToGpgKey(row: any): GpgKey {
    return {
      id: row.id,
      type: row.type,
      fingerprint: row.fingerprint,
      keyId: row.key_id,
      userId: row.user_id,
      email: row.email,
      armored: row.armored,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      isRevoked: row.is_revoked === 1
    };
  }

  private rowToSettings(row: any): AppSettings {
    return {
      theme: row.theme,
      language: row.language,
      notifications: row.notifications === 1,
      autoCheck: row.auto_check === 1,
      checkInterval: row.check_interval,
      preventTracking: row.prevent_tracking === 1,
      previewPane: row.preview_pane === 1,
      threadView: row.thread_view === 1,
      backupSettings: {
        enabled: row.backup_enabled === 1,
        interval: row.backup_interval,
        destination: row.backup_destination || '',
        keepBackups: row.backup_keep,
        includeAttachments: row.backup_include_attachments === 1,
        lastBackupAt: row.backup_last_run,
        nextBackupAt: row.backup_next_run
      },
      pluginSettings: row.plugin_settings ? JSON.parse(row.plugin_settings) : {}
    };
  }
}
