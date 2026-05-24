import * as fs from 'fs';
import * as path from 'path';
import { encrypt, decrypt } from './encryptor';

export interface FileInfo {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modifiedAt: string;
  createdAt: string;
}

export function readFile(filePath: string, password?: string): string {
  const content = fs.readFileSync(filePath, 'utf-8');
  if (password && content.startsWith('ENCRYPTED:')) {
    const decrypted = decrypt(content.slice(10), password);
    if (decrypted === null) {
      throw new Error('Invalid password or corrupted file');
    }
    return decrypted;
  }
  return content;
}

export function writeFile(filePath: string, content: string, encrypted = false, password?: string): boolean {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    let finalContent = content;
    if (encrypted && password) {
      finalContent = 'ENCRYPTED:' + encrypt(content, password);
    }
    fs.writeFileSync(filePath, finalContent, 'utf-8');
    return true;
  } catch {
    return false;
  }
}

export function deleteFile(filePath: string): boolean {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function moveFile(fromPath: string, toPath: string): boolean {
  try {
    const toDir = path.dirname(toPath);
    if (!fs.existsSync(toDir)) {
      fs.mkdirSync(toDir, { recursive: true });
    }
    fs.renameSync(fromPath, toPath);
    return true;
  } catch {
    return false;
  }
}

export function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

export function listDirectory(dirPath: string): FileInfo[] {
  if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
    return [];
  }
  const entries = fs.readdirSync(dirPath);
  return entries
    .filter(entry => !entry.startsWith('.'))
    .map(entry => {
      const fullPath = path.join(dirPath, entry);
      const stats = fs.statSync(fullPath);
      return {
        id: Buffer.from(fullPath).toString('base64'),
        name: entry,
        path: fullPath,
        type: stats.isDirectory() ? 'directory' as const : 'file' as const,
        size: stats.isFile() ? stats.size : undefined,
        modifiedAt: stats.mtime.toISOString(),
        createdAt: stats.birthtime.toISOString(),
      } as FileInfo;
    })
    .sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
}

export function createDirectory(dirPath: string): boolean {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      return true;
    }
    return true;
  } catch {
    return false;
  }
}

export function deleteDirectory(dirPath: string): boolean {
  try {
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
