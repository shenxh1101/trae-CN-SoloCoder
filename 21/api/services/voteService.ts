import type { Room, Option, VoteRecord, Danmu, VoteUpdate } from '../../shared/types.js'
import { storage } from '../storage/index.js'

function generateId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36)
}

export const voteService = {
  async verifyVotePermission(
    roomId: string,
    userId: string,
    fingerprint: string
  ): Promise<{ allowed: boolean; hasVoted: boolean; room: Room | null }> {
    const room = await storage.getRoom(roomId)
    if (!room) {
      return { allowed: false, hasVoted: false, room: null }
    }

    if (room.status !== 'voting') {
      return { allowed: false, hasVoted: false, room }
    }

    const hasVoted = await storage.hasUserVoted(roomId, userId, fingerprint)
    return {
      allowed: !hasVoted,
      hasVoted,
      room,
    }
  },

  async castVote(
    roomId: string,
    optionIds: string[],
    userId: string,
    userName: string,
    fingerprint: string,
    ip: string
  ): Promise<{ success: boolean; voteUpdate?: VoteUpdate; record?: VoteRecord; room?: Room }> {
    const permission = await this.verifyVotePermission(roomId, userId, fingerprint)
    if (!permission.allowed || !permission.room) {
      return { success: false }
    }

    const room = permission.room

    if (!room.isMultiple && optionIds.length > 1) {
      return { success: false }
    }

    const validOptionIds = optionIds.filter(optId =>
      room.options.some(opt => opt.id === optId)
    )

    if (validOptionIds.length === 0) {
      return { success: false }
    }

    const updatedOptions = room.options.map(opt => ({
      ...opt,
      votes: validOptionIds.includes(opt.id) ? opt.votes + 1 : opt.votes,
    }))

    await storage.updateOptions(roomId, updatedOptions)

    const record: VoteRecord = {
      id: generateId(),
      roomId,
      userId,
      userName,
      optionIds: validOptionIds,
      ip,
      fingerprint,
      timestamp: Date.now(),
    }

    await storage.saveVoteRecord(record)

    const updatedRoom = await storage.getRoom(roomId)
    const options = updatedRoom ? updatedRoom.options : updatedOptions
    const totalVotes = options.reduce((sum, opt) => sum + opt.votes, 0)

    return {
      success: true,
      voteUpdate: {
        roomId,
        options,
        totalVotes,
      },
      record,
      room: updatedRoom || room,
    }
  },

  async getVoteResults(roomId: string): Promise<{ options: Option[]; totalVotes: number; room: Room | null }> {
    const room = await storage.getRoom(roomId)
    if (!room) {
      return { options: [], totalVotes: 0, room: null }
    }

    const totalVotes = room.options.reduce((sum, opt) => sum + opt.votes, 0)
    return {
      options: [...room.options],
      totalVotes,
      room,
    }
  },

  async addDanmu(
    roomId: string,
    userId: string,
    userName: string,
    content: string
  ): Promise<{ danmu?: Danmu; room: Room | null }> {
    const room = await storage.getRoom(roomId)
    if (!room) {
      return { room: null }
    }

    const danmu: Danmu = {
      id: generateId(),
      roomId,
      userId,
      userName,
      content,
      timestamp: Date.now(),
    }

    await storage.saveDanmu(danmu)

    const updatedRoom = await storage.getRoom(roomId)
    return {
      danmu,
      room: updatedRoom || room,
    }
  },
}
