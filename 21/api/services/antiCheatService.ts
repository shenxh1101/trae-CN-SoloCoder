import type { Room, VoteRecord } from '../../shared/types.js'
import { storage } from '../storage/index.js'

export interface VoteCheckResult {
  allowed: boolean
  reason?: string
  hasVoted: boolean
}

export const antiCheatService = {
  checkDuplicateVote(
    voteRecords: VoteRecord[],
    ip: string,
    fingerprint: string
  ): boolean {
    return voteRecords.some(
      record => record.ip === ip || record.fingerprint === fingerprint
    )
  },

  async isAllowedToVote(
    roomId: string,
    ip: string,
    fingerprint: string,
    userId?: string
  ): Promise<VoteCheckResult> {
    const room = await storage.getRoom(roomId)
    if (!room) {
      return {
        allowed: false,
        reason: 'Room not found',
        hasVoted: false,
      }
    }

    if (room.status !== 'voting') {
      return {
        allowed: false,
        reason: 'Voting is not active',
        hasVoted: false,
      }
    }

    if (room.endTime && Date.now() > room.endTime) {
      return {
        allowed: false,
        reason: 'Voting has ended',
        hasVoted: false,
      }
    }

    const voteRecords = room.voteRecords

    if (userId) {
      const userVoted = voteRecords.some(r => r.userId === userId)
      if (userVoted) {
        return {
          allowed: false,
          reason: 'User has already voted',
          hasVoted: true,
        }
      }
    }

    if (room.antiCheat) {
      const duplicate = this.checkDuplicateVote(voteRecords, ip, fingerprint)
      if (duplicate) {
        return {
          allowed: false,
          reason: 'Duplicate vote detected',
          hasVoted: true,
        }
      }
    }

    return {
      allowed: true,
      hasVoted: false,
    }
  },
}
