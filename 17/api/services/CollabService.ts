import type { Collaborator } from '../../shared/types.js'
import * as Y from 'yjs'
import Redis from 'ioredis'

interface RoomState {
  doc: Y.Doc
  collaborators: Map<string, Collaborator>
  lastActivity: number
}

interface CollabServiceOptions {
  redisUrl?: string
  roomTimeoutMs?: number
}

const COLLABORATOR_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
  '#BB8FCE', '#85C1E9', '#F8B500', '#00CED1',
]

export class CollabService {
  private rooms: Map<string, RoomState> = new Map()
  private redis: Redis | null = null
  private redisSub: Redis | null = null
  private roomTimeoutMs: number
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor(options: CollabServiceOptions = {}) {
    this.roomTimeoutMs = options.roomTimeoutMs || 30 * 60 * 1000

    if (options.redisUrl) {
      try {
        this.redis = new Redis(options.redisUrl)
        this.redisSub = new Redis(options.redisUrl)
        this.setupRedisSubscription()
      } catch (error) {
        console.warn('[CollabService] Redis connection failed, falling back to memory mode:', error)
        this.redis = null
        this.redisSub = null
      }
    }

    this.startCleanupInterval()
  }

  private setupRedisSubscription(): void {
    if (!this.redisSub) return

    this.redisSub.subscribe('collab:cursor', 'collab:join', 'collab:leave', (err) => {
      if (err) {
        console.warn('[CollabService] Redis subscribe failed:', err)
      }
    })

    this.redisSub.on('message', (channel, message) => {
      try {
        const data = JSON.parse(message)
        const room = this.rooms.get(data.roomId)
        if (!room) return

        if (channel === 'collab:cursor') {
          const collaborator = room.collaborators.get(data.collaborator.userId)
          if (collaborator) {
            collaborator.cursor = data.collaborator.cursor
            room.lastActivity = Date.now()
          }
        } else if (channel === 'collab:join') {
          room.collaborators.set(data.collaborator.userId, data.collaborator)
          room.lastActivity = Date.now()
        } else if (channel === 'collab:leave') {
          room.collaborators.delete(data.userId)
          room.lastActivity = Date.now()
        }
      } catch (error) {
        console.warn('[CollabService] Failed to parse Redis message:', error)
      }
    })
  }

  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now()
      for (const [roomId, room] of this.rooms.entries()) {
        if (room.collaborators.size === 0 && now - room.lastActivity > this.roomTimeoutMs) {
          room.doc.destroy()
          this.rooms.delete(roomId)
          console.log(`[CollabService] Room ${roomId} cleaned up due to inactivity`)
        }
      }
    }, 5 * 60 * 1000)
  }

  getOrCreateRoom(roomId: string, initialCode?: string): RoomState {
    let room = this.rooms.get(roomId)

    if (!room) {
      const doc = new Y.Doc()
      const ytext = doc.getText('code')
      if (initialCode) {
        ytext.insert(0, initialCode)
      }

      room = {
        doc,
        collaborators: new Map(),
        lastActivity: Date.now(),
      }

      this.rooms.set(roomId, room)
      console.log(`[CollabService] Room ${roomId} created`)
    }

    return room
  }

  getRoom(roomId: string): RoomState | undefined {
    return this.rooms.get(roomId)
  }

  getCollaborators(roomId: string): Collaborator[] {
    const room = this.rooms.get(roomId)
    if (!room) return []
    return Array.from(room.collaborators.values())
  }

  addCollaborator(
    roomId: string,
    userId: string,
    username: string,
    avatar: string,
  ): Collaborator {
    const room = this.getOrCreateRoom(roomId)
    const existingCollaborator = room.collaborators.get(userId)

    if (existingCollaborator) {
      room.lastActivity = Date.now()
      return existingCollaborator
    }

    const usedColors = Array.from(room.collaborators.values()).map(c => c.color)
    const availableColors = COLLABORATOR_COLORS.filter(c => !usedColors.includes(c))
    const color = availableColors[0] || COLLABORATOR_COLORS[Math.floor(Math.random() * COLLABORATOR_COLORS.length)]

    const collaborator: Collaborator = {
      userId,
      username,
      avatar,
      cursor: {
        lineNumber: 1,
        column: 1,
      },
      color,
    }

    room.collaborators.set(userId, collaborator)
    room.lastActivity = Date.now()

    if (this.redis) {
      this.redis.publish('collab:join', JSON.stringify({ roomId, collaborator }))
    }

    return collaborator
  }

  removeCollaborator(roomId: string, userId: string): void {
    const room = this.rooms.get(roomId)
    if (!room) return

    room.collaborators.delete(userId)
    room.lastActivity = Date.now()

    if (this.redis) {
      this.redis.publish('collab:leave', JSON.stringify({ roomId, userId }))
    }

    if (room.collaborators.size === 0) {
      setTimeout(() => {
        const currentRoom = this.rooms.get(roomId)
        if (currentRoom && currentRoom.collaborators.size === 0) {
          currentRoom.doc.destroy()
          this.rooms.delete(roomId)
          console.log(`[CollabService] Room ${roomId} destroyed (no collaborators)`)
        }
      }, 5000)
    }
  }

  updateCursor(
    roomId: string,
    userId: string,
    cursor: Collaborator['cursor'],
  ): Collaborator | null {
    const room = this.rooms.get(roomId)
    if (!room) return null

    const collaborator = room.collaborators.get(userId)
    if (!collaborator) return null

    collaborator.cursor = cursor
    room.lastActivity = Date.now()

    if (this.redis) {
      this.redis.publish('collab:cursor', JSON.stringify({ roomId, collaborator }))
    }

    return collaborator
  }

  applyYjsUpdate(roomId: string, update: Uint8Array, sourceId?: string): void {
    const room = this.rooms.get(roomId)
    if (!room) return

    Y.applyUpdate(room.doc, update, sourceId)
    room.lastActivity = Date.now()
  }

  getYjsDocState(roomId: string): Uint8Array | null {
    const room = this.rooms.get(roomId)
    if (!room) return null
    return Y.encodeStateAsUpdate(room.doc)
  }

  getRoomCode(roomId: string): string | null {
    const room = this.rooms.get(roomId)
    if (!room) return null
    return room.doc.getText('code').toString()
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }

    for (const room of this.rooms.values()) {
      room.doc.destroy()
    }
    this.rooms.clear()

    if (this.redis) {
      this.redis.disconnect()
    }
    if (this.redisSub) {
      this.redisSub.disconnect()
    }

    console.log('[CollabService] Service destroyed')
  }
}

let collabServiceInstance: CollabService | null = null

export const getCollabService = (): CollabService => {
  if (!collabServiceInstance) {
    collabServiceInstance = new CollabService({
      redisUrl: process.env.REDIS_URL,
    })
  }
  return collabServiceInstance
}

export default CollabService
