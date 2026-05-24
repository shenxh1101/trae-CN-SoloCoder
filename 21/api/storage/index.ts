import { mkdir, readFile, writeFile, unlink, access, constants, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Room, VoteRecord, Danmu, User, Option } from '../../shared/types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', '..', 'data');
const ROOMS_FILE = join(DATA_DIR, 'rooms.json');
const BACKUPS_DIR = join(DATA_DIR, 'backups');

interface StorageData {
  rooms: Record<string, Room>;
  lastBackup: number;
}

interface WriteLock {
  isLocked: boolean;
  queue: Array<() => void>;
}

const writeLock: WriteLock = {
  isLocked: false,
  queue: [],
};

let autoBackupInterval: NodeJS.Timeout | null = null;
let memoryCache: StorageData | null = null;

async function acquireLock(): Promise<void> {
  if (!writeLock.isLocked) {
    writeLock.isLocked = true;
    return;
  }
  return new Promise((resolve) => {
    writeLock.queue.push(resolve);
  });
}

function releaseLock(): void {
  if (writeLock.queue.length > 0) {
    const next = writeLock.queue.shift();
    next?.();
  } else {
    writeLock.isLocked = false;
  }
}

async function ensureDirectories(): Promise<void> {
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true });
  }
  if (!existsSync(BACKUPS_DIR)) {
    await mkdir(BACKUPS_DIR, { recursive: true });
  }
}

function getDefaultData(): StorageData {
  return {
    rooms: {},
    lastBackup: 0,
  };
}

async function initializeStorage(): Promise<void> {
  await ensureDirectories();
  
  try {
    await access(ROOMS_FILE, constants.F_OK);
    const data = await readFile(ROOMS_FILE, 'utf-8');
    const parsed = JSON.parse(data) as StorageData;
    memoryCache = {
      rooms: parsed.rooms || {},
      lastBackup: parsed.lastBackup || 0,
    };
  } catch {
    memoryCache = getDefaultData();
    await writeFile(ROOMS_FILE, JSON.stringify(memoryCache, null, 2), 'utf-8');
  }
}

async function readStorage(): Promise<StorageData> {
  if (memoryCache) {
    return memoryCache;
  }
  
  try {
    const data = await readFile(ROOMS_FILE, 'utf-8');
    const parsed = JSON.parse(data) as StorageData;
    memoryCache = {
      rooms: parsed.rooms || {},
      lastBackup: parsed.lastBackup || 0,
    };
    return memoryCache;
  } catch {
    memoryCache = getDefaultData();
    return memoryCache;
  }
}

async function writeStorage(data: StorageData): Promise<void> {
  await acquireLock();
  try {
    memoryCache = data;
    await writeFile(ROOMS_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } finally {
    releaseLock();
  }
}

async function backupData(): Promise<string> {
  const data = await readStorage();
  const timestamp = Date.now();
  const backupFile = join(BACKUPS_DIR, `rooms-${timestamp}.json`);
  
  const backupData: StorageData = {
    ...data,
    lastBackup: timestamp,
  };
  
  await writeFile(backupFile, JSON.stringify(backupData, null, 2), 'utf-8');
  
  data.lastBackup = timestamp;
  await writeStorage(data);
  
  return backupFile;
}

async function cleanupOldBackups(maxBackups: number = 1440): Promise<void> {
  const backupFiles = await readdir(BACKUPS_DIR);
  
  const jsonFiles = backupFiles
    .filter(f => f.startsWith('rooms-') && f.endsWith('.json'))
    .sort()
    .reverse();
  
  if (jsonFiles.length > maxBackups) {
    const toDelete = jsonFiles.slice(maxBackups);
    await Promise.all(
      toDelete.map(f => unlink(join(BACKUPS_DIR, f)).catch(() => {}))
    );
  }
}

function startAutoBackup(intervalMs: number = 60 * 1000): void {
  if (autoBackupInterval) {
    return;
  }
  
  autoBackupInterval = setInterval(async () => {
    try {
      await backupData();
      await cleanupOldBackups();
    } catch (error) {
      console.error('Auto backup failed:', error);
    }
  }, intervalMs);
  
  autoBackupInterval.unref();
}

function stopAutoBackup(): void {
  if (autoBackupInterval) {
    clearInterval(autoBackupInterval);
    autoBackupInterval = null;
  }
}

void initializeStorage().then(() => {
  startAutoBackup();
});

export const storage = {
  async saveRoom(room: Room): Promise<Room> {
    const data = await readStorage();
    data.rooms[room.id] = { ...room };
    await writeStorage(data);
    return { ...room };
  },

  async getRoom(roomId: string): Promise<Room | null> {
    const data = await readStorage();
    const room = data.rooms[roomId];
    return room ? { ...room } : null;
  },

  async getAllRooms(): Promise<Record<string, Room>> {
    const data = await readStorage();
    const result: Record<string, Room> = {};
    for (const [id, room] of Object.entries(data.rooms)) {
      result[id] = { ...room };
    }
    return result;
  },

  async updateRoom(roomId: string, updates: Partial<Room>): Promise<Room | null> {
    const data = await readStorage();
    const room = data.rooms[roomId];
    if (!room) return null;
    const updatedRoom = { ...room, ...updates };
    data.rooms[roomId] = updatedRoom;
    await writeStorage(data);
    return { ...updatedRoom };
  },

  async deleteRoom(roomId: string): Promise<boolean> {
    const data = await readStorage();
    if (!data.rooms[roomId]) {
      return false;
    }
    delete data.rooms[roomId];
    await writeStorage(data);
    return true;
  },

  async saveVoteRecord(record: VoteRecord): Promise<VoteRecord> {
    const data = await readStorage();
    const room = data.rooms[record.roomId];
    if (room) {
      room.voteRecords.push({ ...record });
      await writeStorage(data);
    }
    return { ...record };
  },

  async getVoteRecords(roomId: string): Promise<VoteRecord[]> {
    const data = await readStorage();
    const room = data.rooms[roomId];
    return room ? room.voteRecords.map(r => ({ ...r })) : [];
  },

  async saveDanmu(danmu: Danmu): Promise<Danmu> {
    const data = await readStorage();
    const room = data.rooms[danmu.roomId];
    if (room) {
      room.danmus.push({ ...danmu });
      await writeStorage(data);
    }
    return { ...danmu };
  },

  async getDanmus(roomId: string): Promise<Danmu[]> {
    const data = await readStorage();
    const room = data.rooms[roomId];
    return room ? room.danmus.map(d => ({ ...d })) : [];
  },

  async updateOptions(roomId: string, options: Option[]): Promise<Option[] | null> {
    const data = await readStorage();
    const room = data.rooms[roomId];
    if (!room) return null;
    room.options = options.map(o => ({ ...o }));
    await writeStorage(data);
    return room.options.map(o => ({ ...o }));
  },

  async addOnlineUser(roomId: string, user: User): Promise<User[] | null> {
    const data = await readStorage();
    const room = data.rooms[roomId];
    if (!room) return null;
    const existingIndex = room.onlineUsers.findIndex(u => u.id === user.id);
    if (existingIndex >= 0) {
      room.onlineUsers[existingIndex] = { ...user };
    } else {
      room.onlineUsers.push({ ...user });
    }
    await writeStorage(data);
    return room.onlineUsers.map(u => ({ ...u }));
  },

  async removeOnlineUser(roomId: string, userId: string): Promise<User[] | null> {
    const data = await readStorage();
    const room = data.rooms[roomId];
    if (!room) return null;
    room.onlineUsers = room.onlineUsers.filter(u => u.id !== userId);
    await writeStorage(data);
    return room.onlineUsers.map(u => ({ ...u }));
  },

  async getOnlineUsers(roomId: string): Promise<User[]> {
    const data = await readStorage();
    const room = data.rooms[roomId];
    return room ? room.onlineUsers.map(u => ({ ...u })) : [];
  },

  async hasUserVoted(roomId: string, userId: string, fingerprint: string): Promise<boolean> {
    const data = await readStorage();
    const room = data.rooms[roomId];
    if (!room) return false;
    return room.voteRecords.some(
      r => r.userId === userId || r.fingerprint === fingerprint
    );
  },
};

export {
  initializeStorage,
  backupData,
  startAutoBackup,
  stopAutoBackup,
};
