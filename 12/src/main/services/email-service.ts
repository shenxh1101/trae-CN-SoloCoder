import { DatabaseService } from '../database';
import type {
  Email,
  EmailAccount,
  MailFolder,
  FilterRule,
  FilterCondition,
  FilterAction,
  EmailFlags,
  EmailContact
} from '../../shared/types';
import { generateId } from '../utils/id';

export interface SendEmailOptions {
  accountId: string;
  to: EmailContact[];
  cc?: EmailContact[];
  bcc?: EmailContact[];
  replyTo?: EmailContact;
  subject: string;
  body: {
    plain?: string;
    html?: string;
  };
  attachments?: string[];
  inReplyTo?: string;
  references?: string[];
}

export interface EmailOperationResult {
  success: boolean;
  emailId?: string;
  error?: string;
}

export class EmailService {
  private dbService: DatabaseService;

  constructor(dbService: DatabaseService) {
    this.dbService = dbService;
  }

  async sendEmail(options: SendEmailOptions): Promise<Email> {
    try {
      const account = await this.dbService.getAccount(options.accountId);
      if (!account) {
        throw new Error('Account not found');
      }

      const now = Date.now();
      const messageId = `<${generateId()}@${account.email.split('@')[1]}>`;
      const threadId = options.inReplyTo 
        ? await this.getThreadId(options.inReplyTo) 
        : generateId();

      const draftFolder = await this.getDraftFolder(account.id);
      if (!draftFolder) {
        throw new Error('Draft folder not found');
      }

      const email: Omit<Email, 'id'> = {
        accountId: account.id,
        folderId: draftFolder.id,
        messageId,
        threadId,
        uid: await this.getNextUid(draftFolder.id),
        flags: {
          seen: true,
          answered: false,
          flagged: false,
          deleted: false,
          draft: true,
          recent: false,
          forwarded: false,
          custom: []
        },
        from: {
          name: account.name,
          email: account.email
        },
        to: options.to,
        cc: options.cc || [],
        bcc: options.bcc || [],
        replyTo: options.replyTo,
        subject: options.subject,
        body: {
          plain: options.body.plain,
          html: options.body.html
        },
        date: now,
        internalDate: now,
        size: this.calculateEmailSize(options),
        attachments: [],
        references: options.references || (options.inReplyTo ? [options.inReplyTo] : []),
        inReplyTo: options.inReplyTo,
        labels: [],
        isRead: true,
        isStarred: false,
        hasTracking: false,
        isEncrypted: false,
        isSigned: false,
        preview: this.generatePreview(options.body.plain || options.body.html || ''),
        createdAt: now,
        updatedAt: now
      };

      const attachments = options.attachments || [];
      const savedEmail = await this.dbService.addEmail(email, attachments.map(() => ({
        emailId: '',
        filename: '',
        contentType: 'application/octet-stream',
        size: 0,
        isInline: false,
        encoding: 'base64'
      })));

      await this.applyFilters(savedEmail);

      return savedEmail;
    } catch (error) {
      console.error('Failed to send email:', error);
      throw error;
    }
  }

  async saveDraft(options: SendEmailOptions): Promise<Email> {
    try {
      const account = await this.dbService.getAccount(options.accountId);
      if (!account) {
        throw new Error('Account not found');
      }

      const now = Date.now();
      const messageId = `<${generateId()}-draft@${account.email.split('@')[1]}>`;
      const threadId = options.inReplyTo 
        ? await this.getThreadId(options.inReplyTo) 
        : generateId();

      const draftFolder = await this.getDraftFolder(account.id);
      if (!draftFolder) {
        throw new Error('Draft folder not found');
      }

      const email: Omit<Email, 'id'> = {
        accountId: account.id,
        folderId: draftFolder.id,
        messageId,
        threadId,
        uid: await this.getNextUid(draftFolder.id),
        flags: {
          seen: true,
          answered: false,
          flagged: false,
          deleted: false,
          draft: true,
          recent: false,
          forwarded: false,
          custom: []
        },
        from: {
          name: account.name,
          email: account.email
        },
        to: options.to,
        cc: options.cc || [],
        bcc: options.bcc || [],
        replyTo: options.replyTo,
        subject: options.subject,
        body: {
          plain: options.body.plain,
          html: options.body.html
        },
        date: now,
        internalDate: now,
        size: this.calculateEmailSize(options),
        attachments: [],
        references: options.references || (options.inReplyTo ? [options.inReplyTo] : []),
        inReplyTo: options.inReplyTo,
        labels: [],
        isRead: true,
        isStarred: false,
        hasTracking: false,
        isEncrypted: false,
        isSigned: false,
        preview: this.generatePreview(options.body.plain || options.body.html || ''),
        createdAt: now,
        updatedAt: now
      };

      return await this.dbService.addEmail(email);
    } catch (error) {
      console.error('Failed to save draft:', error);
      throw error;
    }
  }

  async moveEmail(emailId: string, targetFolderId: string): Promise<Email> {
    try {
      const email = await this.dbService.getEmail(emailId);
      if (!email) {
        throw new Error('Email not found');
      }

      const targetFolder = await this.dbService.getFolder(targetFolderId);
      if (!targetFolder) {
        throw new Error('Target folder not found');
      }

      const newUid = await this.getNextUid(targetFolderId);
      
      const updated = await this.dbService.updateEmail(emailId, {
        folderId: targetFolderId,
        uid: newUid
      });

      await this.applyFilters(updated);

      return updated;
    } catch (error) {
      console.error('Failed to move email:', error);
      throw error;
    }
  }

  async copyEmail(emailId: string, targetFolderId: string): Promise<Email> {
    try {
      const original = await this.dbService.getEmail(emailId);
      if (!original) {
        throw new Error('Email not found');
      }

      const targetFolder = await this.dbService.getFolder(targetFolderId);
      if (!targetFolder) {
        throw new Error('Target folder not found');
      }

      const newUid = await this.getNextUid(targetFolderId);
      const now = Date.now();

      const copiedEmail: Omit<Email, 'id'> = {
        ...original,
        folderId: targetFolderId,
        uid: newUid,
        messageId: `<${generateId()}-copy@${original.from.email.split('@')[1]}>`,
        createdAt: now,
        updatedAt: now
      };

      const attachments = original.attachments.map(a => ({
        emailId: '',
        filename: a.filename,
        contentType: a.contentType,
        size: a.size,
        contentId: a.contentId,
        isInline: a.isInline,
        localPath: a.localPath,
        encoding: a.encoding
      }));

      const copied = await this.dbService.addEmail(copiedEmail, attachments);
      
      await this.applyFilters(copied);

      return copied;
    } catch (error) {
      console.error('Failed to copy email:', error);
      throw error;
    }
  }

  async deleteEmail(emailId: string): Promise<void> {
    try {
      const email = await this.dbService.getEmail(emailId);
      if (!email) {
        throw new Error('Email not found');
      }

      const trashFolder = await this.getTrashFolder(email.accountId);
      
      if (trashFolder && email.folderId !== trashFolder.id) {
        await this.moveEmail(emailId, trashFolder.id);
      } else {
        await this.dbService.deleteEmail(emailId);
      }
    } catch (error) {
      console.error('Failed to delete email:', error);
      throw error;
    }
  }

  async updateEmailFlags(emailId: string, flags: Partial<EmailFlags>): Promise<Email> {
    try {
      const email = await this.dbService.getEmail(emailId);
      if (!email) {
        throw new Error('Email not found');
      }

      const updatedFlags = { ...email.flags, ...flags };
      const isRead = flags.seen !== undefined ? flags.seen : email.isRead;

      return await this.dbService.updateEmail(emailId, {
        flags: updatedFlags,
        isRead
      });
    } catch (error) {
      console.error('Failed to update email flags:', error);
      throw error;
    }
  }

  async markAsRead(emailId: string, isRead: boolean = true): Promise<Email> {
    return this.updateEmailFlags(emailId, { seen: isRead });
  }

  async markAsStarred(emailId: string, isStarred: boolean = true): Promise<Email> {
    try {
      const email = await this.dbService.getEmail(emailId);
      if (!email) {
        throw new Error('Email not found');
      }

      return await this.dbService.updateEmail(emailId, {
        isStarred,
        flags: { ...email.flags, flagged: isStarred }
      });
    } catch (error) {
      console.error('Failed to mark as starred:', error);
      throw error;
    }
  }

  async applyFilters(email: Email): Promise<FilterAction[]> {
    const appliedActions: FilterAction[] = [];

    try {
      const filters = await this.dbService.getFilters();
      const enabledFilters = filters
        .filter(f => f.enabled)
        .filter(f => f.accountIds.length === 0 || f.accountIds.includes(email.accountId))
        .filter(f => f.folderIds.length === 0 || f.folderIds.includes(email.folderId))
        .sort((a, b) => a.priority - b.priority);

      for (const filter of enabledFilters) {
        if (this.matchFilter(email, filter)) {
          for (const action of filter.actions) {
            try {
              await this.executeFilterAction(email, action);
              appliedActions.push(action);
            } catch (actionError) {
              console.error(`Failed to execute filter action:`, actionError);
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to apply filters:', error);
    }

    return appliedActions;
  }

  private matchFilter(email: Email, filter: FilterRule): boolean {
    const conditions = filter.conditions;
    
    if (conditions.length === 0) {
      return true;
    }

    const results = conditions.map(condition => this.matchCondition(email, condition));

    if (filter.matchType === 'all') {
      return results.every(r => r);
    } else {
      return results.some(r => r);
    }
  }

  private matchCondition(email: Email, condition: FilterCondition): boolean {
    const { field, operator, value } = condition;

    let fieldValue: any;

    switch (field) {
      case 'from':
        fieldValue = `${email.from.name} ${email.from.email}`.toLowerCase();
        break;
      case 'to':
        fieldValue = email.to.map(t => `${t.name} ${t.email}`).join(' ').toLowerCase();
        break;
      case 'subject':
        fieldValue = email.subject.toLowerCase();
        break;
      case 'body':
        fieldValue = (email.body.plain || email.body.html || '').toLowerCase();
        break;
      case 'date':
        fieldValue = email.date;
        break;
      case 'hasAttachment':
        fieldValue = email.attachments.length > 0;
        break;
      case 'size':
        fieldValue = email.size;
        break;
      case 'label':
        fieldValue = email.labels;
        break;
      default:
        return false;
    }

    const compareValue = typeof value === 'string' ? value.toLowerCase() : value;

    switch (operator) {
      case 'equals':
        return fieldValue === compareValue;
      case 'contains':
        return typeof fieldValue === 'string' && fieldValue.includes(compareValue as string);
      case 'startsWith':
        return typeof fieldValue === 'string' && fieldValue.startsWith(compareValue as string);
      case 'endsWith':
        return typeof fieldValue === 'string' && fieldValue.endsWith(compareValue as string);
      case 'greaterThan':
        return typeof fieldValue === 'number' && fieldValue > (compareValue as number);
      case 'lessThan':
        return typeof fieldValue === 'number' && fieldValue < (compareValue as number);
      case 'is':
        return fieldValue === compareValue;
      case 'isNot':
        return fieldValue !== compareValue;
      default:
        return false;
    }
  }

  private async executeFilterAction(email: Email, action: FilterAction): Promise<void> {
    const { type, params } = action;

    switch (type) {
      case 'move':
        if (params.folderId) {
          await this.moveEmail(email.id, params.folderId);
        }
        break;
      case 'copy':
        if (params.folderId) {
          await this.copyEmail(email.id, params.folderId);
        }
        break;
      case 'delete':
        await this.deleteEmail(email.id);
        break;
      case 'markRead':
        await this.markAsRead(email.id, true);
        break;
      case 'markUnread':
        await this.markAsRead(email.id, false);
        break;
      case 'star':
        await this.markAsStarred(email.id, true);
        break;
      case 'addLabel':
        if (params.labelId) {
          await this.dbService.applyLabelToEmail(email.id, params.labelId);
        }
        break;
      case 'removeLabel':
        if (params.labelId) {
          await this.dbService.removeLabelFromEmail(email.id, params.labelId);
        }
        break;
      case 'forward':
        break;
      case 'reply':
        break;
      case 'markForwarded':
        await this.updateEmailFlags(email.id, { forwarded: true });
        break;
      case 'markAnswered':
        await this.updateEmailFlags(email.id, { answered: true });
        break;
    }
  }

  async runFilter(filterId: string, emailIds?: string[]): Promise<number> {
    try {
      const filter = await this.dbService.getFilter(filterId);
      if (!filter) {
        throw new Error('Filter not found');
      }

      let emails: Email[];
      
      if (emailIds && emailIds.length > 0) {
        emails = [];
        for (const id of emailIds) {
          const email = await this.dbService.getEmail(id);
          if (email) emails.push(email);
        }
      } else {
        const folders = await this.dbService.getFolders();
        const filteredFolderIds = filter.folderIds.length > 0 ? filter.folderIds : folders.map(f => f.id);
        emails = [];
        for (const folderId of filteredFolderIds) {
          const result = await this.dbService.getEmails(folderId, 1000, 0);
          emails.push(...result.emails);
        }
      }

      let matchedCount = 0;

      for (const email of emails) {
        if (this.matchFilter(email, filter)) {
          for (const action of filter.actions) {
            try {
              await this.executeFilterAction(email, action);
            } catch (actionError) {
              console.error(`Failed to execute filter action:`, actionError);
            }
          }
          matchedCount++;
        }
      }

      return matchedCount;
    } catch (error) {
      console.error('Failed to run filter:', error);
      throw error;
    }
  }

  async testFilter(filterId: string, emailId: string): Promise<boolean> {
    try {
      const filter = await this.dbService.getFilter(filterId);
      if (!filter) {
        throw new Error('Filter not found');
      }

      const email = await this.dbService.getEmail(emailId);
      if (!email) {
        throw new Error('Email not found');
      }

      return this.matchFilter(email, filter);
    } catch (error) {
      console.error('Failed to test filter:', error);
      throw error;
    }
  }

  private async getThreadId(messageId: string): Promise<string> {
    const emails = await this.dbService.getDb().prepare(
      'SELECT thread_id FROM emails WHERE message_id = ?'
    ).get(messageId) as any;

    return emails?.thread_id || generateId();
  }

  private async getNextUid(folderId: string): Promise<number> {
    const folder = await this.dbService.getFolder(folderId);
    if (!folder) {
      throw new Error('Folder not found');
    }

    const result = await this.dbService.getDb().prepare(
      'SELECT MAX(uid) as max_uid FROM emails WHERE folder_id = ?'
    ).get(folderId) as { max_uid: number | null };

    const nextUid = (result.max_uid || folder.uidNext || 0) + 1;
    
    await this.dbService.updateFolder(folderId, { uidNext: nextUid });

    return nextUid;
  }

  private async getDraftFolder(accountId: string): Promise<MailFolder | null> {
    const folders = await this.dbService.getFolders(accountId);
    return folders.find(f => f.name.toLowerCase() === 'drafts' || f.path.toLowerCase().includes('drafts')) || null;
  }

  private async getTrashFolder(accountId: string): Promise<MailFolder | null> {
    const folders = await this.dbService.getFolders(accountId);
    return folders.find(f => 
      f.name.toLowerCase() === 'trash' || 
      f.name.toLowerCase() === 'bin' ||
      f.name.toLowerCase() === 'deleted items' ||
      f.path.toLowerCase().includes('trash')
    ) || null;
  }

  private calculateEmailSize(options: SendEmailOptions): number {
    let size = 0;
    
    size += options.subject.length;
    size += (options.body.plain || '').length;
    size += (options.body.html || '').length;
    
    for (const contact of options.to) {
      size += contact.name.length + contact.email.length;
    }
    
    return size;
  }

  private generatePreview(content: string): string {
    const plainText = content
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    return plainText.substring(0, 200);
  }

  async receiveEmail(accountId: string, folderId: string, emailData: any): Promise<Email> {
    try {
      const account = await this.dbService.getAccount(accountId);
      if (!account) {
        throw new Error('Account not found');
      }

      const folder = await this.dbService.getFolder(folderId);
      if (!folder) {
        throw new Error('Folder not found');
      }

      const existing = await this.dbService.getEmailByMessageId(accountId, emailData.messageId);
      if (existing) {
        return existing;
      }

      const now = Date.now();
      const threadId = emailData.threadId || generateId();

      const email: Omit<Email, 'id'> = {
        accountId,
        folderId,
        messageId: emailData.messageId,
        threadId,
        uid: emailData.uid || await this.getNextUid(folderId),
        flags: emailData.flags || {
          seen: false,
          answered: false,
          flagged: false,
          deleted: false,
          draft: false,
          recent: true,
          forwarded: false,
          custom: []
        },
        from: emailData.from,
        to: emailData.to || [],
        cc: emailData.cc || [],
        bcc: emailData.bcc || [],
        replyTo: emailData.replyTo,
        subject: emailData.subject,
        body: emailData.body || { plain: '', html: '' },
        date: emailData.date || now,
        internalDate: emailData.internalDate || now,
        size: emailData.size || 0,
        attachments: [],
        references: emailData.references || [],
        inReplyTo: emailData.inReplyTo,
        labels: [],
        isRead: emailData.flags?.seen || false,
        isStarred: emailData.flags?.flagged || false,
        hasTracking: false,
        isEncrypted: emailData.isEncrypted || false,
        isSigned: emailData.isSigned || false,
        preview: this.generatePreview(emailData.body?.plain || emailData.body?.html || emailData.subject || ''),
        createdAt: now,
        updatedAt: now
      };

      const savedEmail = await this.dbService.addEmail(email, emailData.attachments || []);
      
      await this.applyFilters(savedEmail);

      return savedEmail;
    } catch (error) {
      console.error('Failed to receive email:', error);
      throw error;
    }
  }
}
