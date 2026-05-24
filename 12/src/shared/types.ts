export interface EmailAccount {
  id: string;
  name: string;
  email: string;
  password: string;
  provider: 'gmail' | 'outlook' | 'qq' | 'other';
  imap: ServerConfig;
  smtp: ServerConfig;
  syncSettings: SyncSettings;
  signatureId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ServerConfig {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
}

export interface SyncSettings {
  syncDays: number;
  maxAttachmentSize: number;
  autoDownloadAttachments: boolean;
  syncInterval: number;
}

export interface MailFolder {
  id: string;
  accountId: string;
  name: string;
  path: string;
  delimiter: string;
  attributes: string[];
  uidValidity: number;
  uidNext: number;
  totalMessages: number;
  unreadCount: number;
  parentId?: string;
  isSyncing: boolean;
  lastSyncedAt: number;
}

export interface Email {
  id: string;
  accountId: string;
  folderId: string;
  messageId: string;
  threadId: string;
  uid: number;
  flags: EmailFlags;
  from: EmailContact;
  to: EmailContact[];
  cc: EmailContact[];
  bcc: EmailContact[];
  replyTo?: EmailContact;
  subject: string;
  body: EmailBody;
  date: number;
  internalDate: number;
  size: number;
  attachments: Attachment[];
  references: string[];
  inReplyTo?: string;
  labels: string[];
  isRead: boolean;
  isStarred: boolean;
  hasTracking: boolean;
  isEncrypted: boolean;
  isSigned: boolean;
  signatureValid?: boolean;
  preview: string;
  createdAt: number;
  updatedAt: number;
}

export interface EmailFlags {
  seen: boolean;
  answered: boolean;
  flagged: boolean;
  deleted: boolean;
  draft: boolean;
  recent: boolean;
  forwarded: boolean;
  custom: string[];
}

export interface EmailContact {
  name: string;
  email: string;
}

export interface EmailBody {
  plain?: string;
  html?: string;
  markdown?: string;
}

export interface Attachment {
  id: string;
  emailId: string;
  filename: string;
  contentType: string;
  size: number;
  contentId?: string;
  isInline: boolean;
  localPath?: string;
  content?: Buffer;
  encoding: string;
}

export interface EmailLabel {
  id: string;
  name: string;
  color: string;
  parentId?: string;
  sortOrder: number;
  createdAt: number;
}

export interface FilterRule {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  conditions: FilterCondition[];
  actions: FilterAction[];
  matchType: 'all' | 'any';
  accountIds: string[];
  folderIds: string[];
  createdAt: number;
  updatedAt: number;
}

export interface FilterCondition {
  field: 'from' | 'to' | 'subject' | 'body' | 'date' | 'hasAttachment' | 'size' | 'label';
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'greaterThan' | 'lessThan' | 'is' | 'isNot';
  value: string | number | boolean;
}

export interface FilterAction {
  type: 'move' | 'copy' | 'delete' | 'markRead' | 'markUnread' | 'star' | 'addLabel' | 'removeLabel' | 'forward' | 'reply' | 'markForwarded' | 'markAnswered';
  params: Record<string, any>;
}

export interface EmailSignature {
  id: string;
  accountId: string;
  name: string;
  html: string;
  plain: string;
  isDefault: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: EmailBody;
  attachments: string[];
  createdAt: number;
  updatedAt: number;
}

export interface GpgKey {
  id: string;
  type: 'public' | 'private';
  fingerprint: string;
  keyId: string;
  userId: string;
  email: string;
  armored: string;
  createdAt: number;
  expiresAt?: number;
  isRevoked: boolean;
}

export interface BackupSettings {
  enabled: boolean;
  interval: number;
  destination: string;
  keepBackups: number;
  includeAttachments: boolean;
  lastBackupAt?: number;
  nextBackupAt?: number;
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications: boolean;
  autoCheck: boolean;
  checkInterval: number;
  preventTracking: boolean;
  previewPane: boolean;
  threadView: boolean;
  backupSettings: BackupSettings;
  pluginSettings: Record<string, any>;
}

export interface SearchQuery {
  query: string;
  accountIds?: string[];
  folderIds?: string[];
  from?: string;
  to?: string;
  dateFrom?: number;
  dateTo?: number;
  hasAttachment?: boolean;
  labelIds?: string[];
  isRead?: boolean;
  isStarred?: boolean;
  highlightKeywords: boolean;
}

export interface SearchResult {
  emails: Email[];
  total: number;
  highlighted?: Map<string, string[]>;
}

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  main: string;
  renderer?: string;
  permissions: string[];
  dependencies?: Record<string, string>;
}

export interface PluginInfo extends PluginManifest {
  path: string;
  enabled: boolean;
  error?: string;
}

export interface Thread {
  id: string;
  subject: string;
  emails: Email[];
  participants: EmailContact[];
  lastMessageAt: number;
  totalMessages: number;
  unreadCount: number;
  labels: string[];
  preview: string;
  hasAttachment: boolean;
  accountIds: string[];
}

export interface IpcResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}
