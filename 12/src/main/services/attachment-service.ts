import * as fs from 'fs';
import * as path from 'path';
import { shell } from 'electron';
import { DatabaseService } from '../database';
import { getAttachmentsPath, ensureDir, sanitizeFilename } from '../utils/paths';
import type { Attachment, EmailAccount } from '../../shared/types';

export const DEFAULT_MAX_ATTACHMENT_SIZE = 25 * 1024 * 1024;

export interface AttachmentDownloadOptions {
  maxSize?: number;
  forceDownload?: boolean;
}

export interface AttachmentSaveOptions {
  defaultPath?: string;
  overwrite?: boolean;
}

export class AttachmentService {
  private dbService: DatabaseService;
  private maxAttachmentSize: number;

  constructor(dbService: DatabaseService, maxSize: number = DEFAULT_MAX_ATTACHMENT_SIZE) {
    this.dbService = dbService;
    this.maxAttachmentSize = maxSize;
  }

  setMaxAttachmentSize(size: number): void {
    this.maxAttachmentSize = size;
  }

  getMaxAttachmentSize(): number {
    return this.maxAttachmentSize;
  }

  async downloadAttachment(
    attachmentId: string,
    options: AttachmentDownloadOptions = {}
  ): Promise<string> {
    try {
      const attachment = await this.dbService.getAttachment(attachmentId);
      if (!attachment) {
        throw new Error('Attachment not found');
      }

      if (attachment.localPath && fs.existsSync(attachment.localPath) && !options.forceDownload) {
        return attachment.localPath;
      }

      const maxSize = options.maxSize || this.maxAttachmentSize;
      if (attachment.size > maxSize) {
        throw new Error(`Attachment size (${this.formatSize(attachment.size)}) exceeds maximum allowed size (${this.formatSize(maxSize)})`);
      }

      const email = await this.dbService.getEmail(attachment.emailId);
      if (!email) {
        throw new Error('Email not found');
      }

      const account = await this.dbService.getAccount(email.accountId);
      if (!account) {
        throw new Error('Account not found');
      }

      const localPath = await this.saveAttachmentLocally(attachment, account, email);

      await this.dbService.updateAttachment(attachmentId, { localPath });

      return localPath;
    } catch (error) {
      console.error('Failed to download attachment:', error);
      throw error;
    }
  }

  async downloadAllAttachments(
    emailId: string,
    options: AttachmentDownloadOptions = {}
  ): Promise<string[]> {
    try {
      const email = await this.dbService.getEmail(emailId);
      if (!email) {
        throw new Error('Email not found');
      }

      const downloadedPaths: string[] = [];

      for (const attachment of email.attachments) {
        try {
          const localPath = await this.downloadAttachment(attachment.id, options);
          downloadedPaths.push(localPath);
        } catch (attachmentError) {
          console.error(`Failed to download attachment ${attachment.id}:`, attachmentError);
        }
      }

      return downloadedPaths;
    } catch (error) {
      console.error('Failed to download all attachments:', error);
      throw error;
    }
  }

  async openAttachment(attachmentId: string): Promise<void> {
    try {
      const attachment = await this.dbService.getAttachment(attachmentId);
      if (!attachment) {
        throw new Error('Attachment not found');
      }

      let localPath = attachment.localPath;
      
      if (!localPath || !fs.existsSync(localPath)) {
        localPath = await this.downloadAttachment(attachmentId);
      }

      if (!fs.existsSync(localPath)) {
        throw new Error('Attachment file not found on disk');
      }

      const result = shell.openPath(localPath);
      if (result) {
        throw new Error(`Failed to open attachment: ${result}`);
      }
    } catch (error) {
      console.error('Failed to open attachment:', error);
      throw error;
    }
  }

  async saveAttachmentAs(
    attachmentId: string,
    options: AttachmentSaveOptions = {}
  ): Promise<string> {
    try {
      const attachment = await this.dbService.getAttachment(attachmentId);
      if (!attachment) {
        throw new Error('Attachment not found');
      }

      let localPath = attachment.localPath;
      
      if (!localPath || !fs.existsSync(localPath)) {
        localPath = await this.downloadAttachment(attachmentId);
      }

      if (!fs.existsSync(localPath)) {
        throw new Error('Attachment file not found on disk');
      }

      const defaultFileName = options.defaultPath || sanitizeFilename(attachment.filename);
      const destDir = path.dirname(defaultFileName);
      const destName = path.basename(defaultFileName);

      ensureDir(destDir);

      let destPath = defaultFileName;
      if (!options.overwrite && fs.existsSync(destPath)) {
        destPath = this.generateUniquePath(destDir, destName);
      }

      fs.copyFileSync(localPath, destPath);

      return destPath;
    } catch (error) {
      console.error('Failed to save attachment:', error);
      throw error;
    }
  }

  async saveAllAttachments(
    emailId: string,
    destDir: string,
    options: AttachmentSaveOptions = {}
  ): Promise<string[]> {
    try {
      const email = await this.dbService.getEmail(emailId);
      if (!email) {
        throw new Error('Email not found');
      }

      ensureDir(destDir);

      const savedPaths: string[] = [];

      for (const attachment of email.attachments) {
        try {
          const defaultPath = path.join(destDir, sanitizeFilename(attachment.filename));
          const savedPath = await this.saveAttachmentAs(attachment.id, {
            ...options,
            defaultPath
          });
          savedPaths.push(savedPath);
        } catch (attachmentError) {
          console.error(`Failed to save attachment ${attachment.id}:`, attachmentError);
        }
      }

      return savedPaths;
    } catch (error) {
      console.error('Failed to save all attachments:', error);
      throw error;
    }
  }

  async deleteAttachment(attachmentId: string): Promise<void> {
    try {
      const attachment = await this.dbService.getAttachment(attachmentId);
      if (!attachment) {
        throw new Error('Attachment not found');
      }

      if (attachment.localPath && fs.existsSync(attachment.localPath)) {
        try {
          fs.unlinkSync(attachment.localPath);
        } catch (deleteError) {
          console.error('Failed to delete attachment file:', deleteError);
        }
      }
    } catch (error) {
      console.error('Failed to delete attachment:', error);
      throw error;
    }
  }

  async getAttachmentSize(attachmentId: string): Promise<{ size: number; formatted: string }> {
    try {
      const attachment = await this.dbService.getAttachment(attachmentId);
      if (!attachment) {
        throw new Error('Attachment not found');
      }

      return {
        size: attachment.size,
        formatted: this.formatSize(attachment.size)
      };
    } catch (error) {
      console.error('Failed to get attachment size:', error);
      throw error;
    }
  }

  async checkAttachmentExists(attachmentId: string): Promise<boolean> {
    try {
      const attachment = await this.dbService.getAttachment(attachmentId);
      if (!attachment) {
        return false;
      }

      if (!attachment.localPath) {
        return false;
      }

      return fs.existsSync(attachment.localPath);
    } catch (error) {
      console.error('Failed to check attachment existence:', error);
      return false;
    }
  }

  async validateAttachmentSize(size: number, accountId?: string): Promise<boolean> {
    try {
      let maxSize = this.maxAttachmentSize;

      if (accountId) {
        const account = await this.dbService.getAccount(accountId);
        if (account) {
          maxSize = account.syncSettings.maxAttachmentSize;
        }
      }

      return size <= maxSize;
    } catch (error) {
      console.error('Failed to validate attachment size:', error);
      return false;
    }
  }

  async getAttachmentsForEmail(emailId: string): Promise<Attachment[]> {
    try {
      const attachments = await this.dbService.getAttachments(emailId);
      return attachments;
    } catch (error) {
      console.error('Failed to get attachments for email:', error);
      throw error;
    }
  }

  async getAttachmentInfo(attachmentId: string): Promise<Attachment & { downloaded: boolean; localPath?: string }> {
    try {
      const attachment = await this.dbService.getAttachment(attachmentId);
      if (!attachment) {
        throw new Error('Attachment not found');
      }

      const downloaded = !!(attachment.localPath && fs.existsSync(attachment.localPath));

      return {
        ...attachment,
        downloaded
      };
    } catch (error) {
      console.error('Failed to get attachment info:', error);
      throw error;
    }
  }

  private async saveAttachmentLocally(
    attachment: Attachment,
    account: EmailAccount,
    email: any
  ): Promise<string> {
    const attachmentsDir = getAttachmentsPath(account.id, email.id);
    const safeFilename = sanitizeFilename(attachment.filename);
    const filePath = path.join(attachmentsDir, safeFilename);

    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      if (stats.size === attachment.size) {
        return filePath;
      }
    }

    if (attachment.content) {
      fs.writeFileSync(filePath, attachment.content);
    } else {
      const tempPath = `${filePath}.part`;
      fs.writeFileSync(tempPath, Buffer.alloc(0));
      fs.renameSync(tempPath, filePath);
    }

    return filePath;
  }

  private generateUniquePath(dir: string, filename: string): string {
    const ext = path.extname(filename);
    const baseName = path.basename(filename, ext);
    let counter = 1;
    let uniquePath: string;

    do {
      uniquePath = path.join(dir, `${baseName} (${counter})${ext}`);
      counter++;
    } while (fs.existsSync(uniquePath));

    return uniquePath;
  }

  private formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async getTotalAttachmentsSize(accountId?: string): Promise<{ size: number; formatted: string; count: number }> {
    try {
      let totalSize = 0;
      let count = 0;

      const attachmentsDir = accountId 
        ? getAttachmentsPath(accountId)
        : getAttachmentsPath();

      const files = await this.getAllFiles(attachmentsDir);
      
      for (const file of files) {
        try {
          const stats = fs.statSync(file);
          totalSize += stats.size;
          count++;
        } catch (statError) {
          continue;
        }
      }

      return {
        size: totalSize,
        formatted: this.formatSize(totalSize),
        count
      };
    } catch (error) {
      console.error('Failed to get total attachments size:', error);
      throw error;
    }
  }

  async cleanOldAttachments(olderThanDays: number = 30): Promise<{ deleted: number; freedSpace: number }> {
    try {
      const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
      let deleted = 0;
      let freedSpace = 0;

      const attachmentsDir = getAttachmentsPath();
      const files = await this.getAllFiles(attachmentsDir);

      for (const file of files) {
        try {
          const stats = fs.statSync(file);
          if (stats.mtimeMs < cutoffTime) {
            fs.unlinkSync(file);
            deleted++;
            freedSpace += stats.size;
          }
        } catch (fileError) {
          console.error(`Failed to process file ${file}:`, fileError);
        }
      }

      return {
        deleted,
        freedSpace
      };
    } catch (error) {
      console.error('Failed to clean old attachments:', error);
      throw error;
    }
  }

  private async getAllFiles(dir: string): Promise<string[]> {
    const results: string[] = [];
    
    if (!fs.existsSync(dir)) {
      return results;
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...await this.getAllFiles(fullPath));
      } else {
        results.push(fullPath);
      }
    }

    return results;
  }
}
