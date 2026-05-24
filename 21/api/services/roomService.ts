import type { Room, Option, User, CreateRoomRequest, CreateRoomResponse } from '../../shared/types.js'
import { storage } from '../storage/index.js'

function generateId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36)
}

export const roomService = {
  async createRoom(req: CreateRoomRequest, hostFingerprint: string, hostIp: string): Promise<CreateRoomResponse & { creatorId: string }> {
    const roomId = generateId()
    const creatorId = `user_${hostFingerprint.slice(0, 16)}`

    const options: Option[] = req.options.map((text, index) => ({
      id: `opt_${index}_${Date.now()}`,
      text,
      votes: 0,
    }))

    const hostUser: User = {
      id: creatorId,
      name: req.creatorName,
      fingerprint: hostFingerprint,
      lastIp: hostIp,
      hasVoted: false,
      role: 'host',
    }

    const room: Room = {
      id: roomId,
      title: req.title,
      status: 'waiting',
      creatorId,
      creatorName: req.creatorName,
      options,
      isMultiple: req.isMultiple,
      isAnonymous: req.isAnonymous,
      antiCheat: req.antiCheat,
      endTime: req.endTime,
      createdAt: Date.now(),
      voteRecords: [],
      danmus: [],
      onlineUsers: [hostUser],
    }

    await storage.saveRoom(room)

    return {
      roomId,
      shareUrl: `/room/${roomId}`,
      creatorId,
    }
  },

  async getRoom(roomId: string): Promise<Room | null> {
    return storage.getRoom(roomId)
  },

  async joinRoom(
    roomId: string,
    userId: string,
    userName: string,
    fingerprint: string,
    ip: string
  ): Promise<{ user: User; onlineCount: number; room: Room } | null> {
    const room = await storage.getRoom(roomId)
    if (!room) return null

    const existingUser = room.onlineUsers.find(u => u.id === userId)
    let user: User

    if (existingUser) {
      user = existingUser
      if (room.creatorId === userId && user.role !== 'host') {
        user.role = 'host'
      }
    } else {
      const role = room.creatorId === userId ? 'host' : 'voter'
      const hasVoted = await storage.hasUserVoted(roomId, userId, fingerprint)

      user = {
        id: userId,
        name: userName,
        fingerprint,
        lastIp: ip,
        hasVoted,
        role,
      }
    }

    await storage.addOnlineUser(roomId, user)

    const updatedRoom = await storage.getRoom(roomId)
    const onlineCount = updatedRoom ? updatedRoom.onlineUsers.length : room.onlineUsers.length + 1

    return { user, onlineCount, room: updatedRoom || room }
  },

  async leaveRoom(roomId: string, userId: string): Promise<{ onlineCount: number; room: Room } | null> {
    const room = await storage.getRoom(roomId)
    if (!room) return null

    await storage.removeOnlineUser(roomId, userId)

    const updatedRoom = await storage.getRoom(roomId)
    const onlineCount = updatedRoom ? updatedRoom.onlineUsers.length : Math.max(0, room.onlineUsers.length - 1)

    return { onlineCount, room: updatedRoom || room }
  },

  async controlVote(
    roomId: string,
    userId: string,
    action: 'start' | 'pause' | 'resume' | 'end'
  ): Promise<{ status: Room['status']; endTime?: number; room: Room } | null> {
    const room = await storage.getRoom(roomId)
    if (!room) return null

    if (room.creatorId !== userId) {
      return null
    }

    let newStatus: Room['status'] = room.status
    const updates: Partial<Room> = {}

    switch (action) {
      case 'start':
        if (room.status !== 'waiting') return null
        newStatus = 'voting'
        updates.status = 'voting'
        updates.startedAt = Date.now()
        break
      case 'pause':
        if (room.status !== 'voting') return null
        newStatus = 'paused'
        updates.status = 'paused'
        break
      case 'resume':
        if (room.status !== 'paused') return null
        newStatus = 'voting'
        updates.status = 'voting'
        break
      case 'end':
        if (room.status === 'ended' || room.status === 'waiting') return null
        newStatus = 'ended'
        updates.status = 'ended'
        updates.endedAt = Date.now()
        break
    }

    const updatedRoom = await storage.updateRoom(roomId, updates)
    if (!updatedRoom) return null

    return {
      status: newStatus,
      endTime: updatedRoom.endTime,
      room: updatedRoom,
    }
  },
}
