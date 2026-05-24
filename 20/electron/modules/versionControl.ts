import * as fs from 'fs';
import * as path from 'path';
import { generateId } from './fileManager';

export interface Snapshot {
  id: string;
  notePath: string;
  content: string;
  timestamp: string;
  size: number;
  message?: string;
}

function getVersionsDir(notePath: string): string {
  const noteDir = path.dirname(notePath);
  return path.join(noteDir, '.marknote', 'versions', generateNoteId(notePath));
}

function generateNoteId(notePath: string): string {
  return Buffer.from(notePath).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
}

function getIndexPath(versionsDir: string): string {
  return path.join(versionsDir, 'index.json');
}

function readIndex(versionsDir: string): Snapshot[] {
  const indexPath = getIndexPath(versionsDir);
  if (!fs.existsSync(indexPath)) {
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
  } catch {
    return [];
  }
}

function writeIndex(versionsDir: string, snapshots: Snapshot[]): void {
  const indexPath = getIndexPath(versionsDir);
  const dir = path.dirname(indexPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(indexPath, JSON.stringify(snapshots, null, 2), 'utf-8');
}

export function saveSnapshot(notePath: string, content: string, message?: string, maxSnapshots = 50): string {
  const versionsDir = getVersionsDir(notePath);
  if (!fs.existsSync(versionsDir)) {
    fs.mkdirSync(versionsDir, { recursive: true });
  }

  const snapshotId = generateId();
  const now = new Date().toISOString();
  const snapshotPath = path.join(versionsDir, `${snapshotId}.json`);

  const snapshot: Snapshot = {
    id: snapshotId,
    notePath,
    content,
    timestamp: now,
    size: Buffer.byteLength(content, 'utf-8'),
    message,
  };

  fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2), 'utf-8');

  const index = readIndex(versionsDir);
  index.unshift(snapshot);

  if (index.length > maxSnapshots) {
    const toDelete = index.slice(maxSnapshots);
    toDelete.forEach(s => {
      const p = path.join(versionsDir, `${s.id}.json`);
      if (fs.existsSync(p)) {
        fs.unlinkSync(p);
      }
    });
    index.length = maxSnapshots;
  }

  writeIndex(versionsDir, index);
  return snapshotId;
}

export function listSnapshots(notePath: string): Snapshot[] {
  const versionsDir = getVersionsDir(notePath);
  const index = readIndex(versionsDir);
  return index.map(s => ({
    ...s,
    content: '',
  }));
}

export function getSnapshot(notePath: string, snapshotId: string): Snapshot | null {
  const versionsDir = getVersionsDir(notePath);
  const snapshotPath = path.join(versionsDir, `${snapshotId}.json`);
  if (!fs.existsSync(snapshotPath)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(snapshotPath, 'utf-8'));
  } catch {
    return null;
  }
}

export function deleteSnapshot(notePath: string, snapshotId: string): boolean {
  const versionsDir = getVersionsDir(notePath);
  const snapshotPath = path.join(versionsDir, `${snapshotId}.json`);
  if (!fs.existsSync(snapshotPath)) {
    return false;
  }
  try {
    fs.unlinkSync(snapshotPath);
    const index = readIndex(versionsDir);
    const filtered = index.filter(s => s.id !== snapshotId);
    writeIndex(versionsDir, filtered);
    return true;
  } catch {
    return false;
  }
}

export function restoreSnapshot(notePath: string, snapshotId: string): string | null {
  const snapshot = getSnapshot(notePath, snapshotId);
  if (!snapshot) {
    return null;
  }
  return snapshot.content;
}
