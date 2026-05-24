import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

export interface PinnedNote {
  notePath: string;
  noteTitle: string;
  pinnedAt: string;
}

function getConfigPath(): string {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'pinned-notes.json');
}

function readConfig(): PinnedNote[] {
  const configPath = getConfigPath();
  if (!fs.existsSync(configPath)) {
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch {
    return [];
  }
}

function writeConfig(pinned: PinnedNote[]): void {
  const configPath = getConfigPath();
  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(configPath, JSON.stringify(pinned, null, 2), 'utf-8');
}

export function pinNote(notePath: string, noteTitle: string): boolean {
  try {
    const pinned = readConfig();
    const existing = pinned.find(p => p.notePath === notePath);
    if (existing) {
      return true;
    }
    pinned.push({
      notePath,
      noteTitle,
      pinnedAt: new Date().toISOString(),
    });
    writeConfig(pinned);
    return true;
  } catch {
    return false;
  }
}

export function unpinNote(notePath: string): boolean {
  try {
    const pinned = readConfig();
    const filtered = pinned.filter(p => p.notePath !== notePath);
    writeConfig(filtered);
    return true;
  } catch {
    return false;
  }
}

export function getPinnedNotes(): PinnedNote[] {
  return readConfig();
}
