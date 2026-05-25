import { openDB, IDBPDatabase } from 'idb';

export interface PlaylistRecord {
  id: string;
  name: string;
  coverUrl?: string;
  createdAt: number;
}

export interface PlaylistSongRecord {
  id?: number;
  playlistId: string;
  songId: number;
  songName: string;
  artistName: string;
  albumName: string;
  albumPic: string;
  duration: number;
}

export interface RecentPlayRecord {
  songId: number;
  songName: string;
  artistName: string;
  albumPic: string;
  playedAt: number;
}

export interface UserConfigRecord {
  key: string;
  value: string;
}

interface DBSchema {
  playlists: {
    key: string;
    value: PlaylistRecord;
    indexes: { 'name': string; 'createdAt': number };
  };
  playlist_songs: {
    key: number;
    value: PlaylistSongRecord;
    indexes: { 'playlistId': string; 'songId': number };
  };
  recent_play: {
    key: number;
    value: RecentPlayRecord;
    indexes: { 'playedAt': number };
  };
  user_config: {
    key: string;
    value: UserConfigRecord;
    indexes: Record<string, never>;
  };
}

export let db: IDBPDatabase<DBSchema>;

export async function initDB(): Promise<IDBPDatabase<DBSchema>> {
  if (db) return db;

  db = await openDB<DBSchema>('music_player_db', 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('playlists')) {
        const playlistStore = db.createObjectStore('playlists', { keyPath: 'id' });
        playlistStore.createIndex('name', 'name', { unique: false });
        playlistStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      if (!db.objectStoreNames.contains('playlist_songs')) {
        const playlistSongStore = db.createObjectStore('playlist_songs', {
          keyPath: 'id',
          autoIncrement: true,
        });
        playlistSongStore.createIndex('playlistId', 'playlistId', { unique: false });
        playlistSongStore.createIndex('songId', 'songId', { unique: false });
      }

      if (!db.objectStoreNames.contains('recent_play')) {
        const recentPlayStore = db.createObjectStore('recent_play', { keyPath: 'songId' });
        recentPlayStore.createIndex('playedAt', 'playedAt', { unique: false });
      }

      if (!db.objectStoreNames.contains('user_config')) {
        db.createObjectStore('user_config', { keyPath: 'key' });
      }
    },
  });

  return db;
}

export const playlist = {
  async create(playlist: Omit<PlaylistRecord, 'createdAt'> & { createdAt?: number }): Promise<string> {
    const db = await initDB();
    const record: PlaylistRecord = {
      ...playlist,
      createdAt: playlist.createdAt ?? Date.now(),
    };
    return db.add('playlists', record) as Promise<string>;
  },

  async getAll(): Promise<PlaylistRecord[]> {
    const db = await initDB();
    return db.getAllFromIndex('playlists', 'createdAt');
  },

  async getById(id: string): Promise<PlaylistRecord | undefined> {
    const db = await initDB();
    return db.get('playlists', id);
  },

  async update(id: string, updates: Partial<Omit<PlaylistRecord, 'id'>>): Promise<string> {
    const db = await initDB();
    const existing = await db.get('playlists', id);
    if (!existing) {
      throw new Error(`Playlist with id ${id} not found`);
    }
    const updated: PlaylistRecord = { ...existing, ...updates };
    return db.put('playlists', updated) as Promise<string>;
  },

  async delete(id: string): Promise<void> {
    const db = await initDB();
    const tx = db.transaction(['playlists', 'playlist_songs'], 'readwrite');
    await tx.objectStore('playlists').delete(id);
    const index = tx.objectStore('playlist_songs').index('playlistId');
    let cursor = await index.openCursor(id);
    while (cursor) {
      await cursor.delete();
      cursor = await cursor.continue();
    }
    await tx.done;
  },
};

export const playlistSong = {
  async addToPlaylist(song: Omit<PlaylistSongRecord, 'id'>): Promise<number> {
    const db = await initDB();
    return db.add('playlist_songs', song) as Promise<number>;
  },

  async removeFromPlaylist(playlistId: string, songId: number): Promise<void> {
    const db = await initDB();
    const tx = db.transaction('playlist_songs', 'readwrite');
    const index = tx.store.index('playlistId');
    let cursor = await index.openCursor(playlistId);
    while (cursor) {
      if (cursor.value.songId === songId) {
        await cursor.delete();
      }
      cursor = await cursor.continue();
    }
    await tx.done;
  },

  async getByPlaylistId(playlistId: string): Promise<PlaylistSongRecord[]> {
    const db = await initDB();
    return db.getAllFromIndex('playlist_songs', 'playlistId', playlistId);
  },

  async checkSongInPlaylist(playlistId: string, songId: number): Promise<boolean> {
    const db = await initDB();
    const tx = db.transaction('playlist_songs', 'readonly');
    const index = tx.store.index('playlistId');
    let cursor = await index.openCursor(playlistId);
    while (cursor) {
      if (cursor.value.songId === songId) {
        return true;
      }
      cursor = await cursor.continue();
    }
    return false;
  },
};

export const recentPlay = {
  async add(record: Omit<RecentPlayRecord, 'playedAt'> & { playedAt?: number }): Promise<number> {
    const db = await initDB();
    const fullRecord: RecentPlayRecord = {
      ...record,
      playedAt: record.playedAt ?? Date.now(),
    };
    return db.put('recent_play', fullRecord) as Promise<number>;
  },

  async getAll(limit: number = 30): Promise<RecentPlayRecord[]> {
    const db = await initDB();
    const results: RecentPlayRecord[] = [];
    const index = db.transaction('recent_play').store.index('playedAt');
    let cursor = await index.openCursor(null, 'prev');
    while (cursor && results.length < limit) {
      results.push(cursor.value);
      cursor = await cursor.continue();
    }
    return results;
  },

  async clear(): Promise<void> {
    const db = await initDB();
    await db.clear('recent_play');
  },
};

export const userConfig = {
  async get(key: string): Promise<string | undefined> {
    const db = await initDB();
    const record = await db.get('user_config', key);
    return record?.value;
  },

  async set(key: string, value: string): Promise<string> {
    const db = await initDB();
    return db.put('user_config', { key, value }) as Promise<string>;
  },

  async remove(key: string): Promise<void> {
    const db = await initDB();
    await db.delete('user_config', key);
  },
};
