import { Router, type Request, type Response } from 'express'
import type {
  CreateRoomRequest,
  CreateRoomResponse,
  VerifyRequest,
  VerifyResponse,
  Room,
  Option,
  VoteRecord,
  Danmu,
} from '../../shared/types.js'
import { roomService } from '../services/roomService.js'
import { antiCheatService } from '../services/antiCheatService.js'

declare module 'express' {
  interface Request {
    clientIp?: string
  }
}

const router = Router()

function sanitizeRoom(room: Room): Omit<Room, 'voteRecords'> & {
  voteRecords: Array<Omit<VoteRecord, 'ip' | 'fingerprint'>>
} {
  const { voteRecords, ...rest } = room
  return {
    ...rest,
    voteRecords: voteRecords.map(({ ip, fingerprint, ...record }) => record),
  }
}

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body as CreateRoomRequest

    if (!body.title || !Array.isArray(body.options) || body.options.length < 2) {
      res.status(400).json({
        success: false,
        error: 'Invalid request: title and at least 2 options are required',
      })
      return
    }

    if (!body.creatorName) {
      res.status(400).json({
        success: false,
        error: 'Invalid request: creatorName is required',
      })
      return
    }

    const fingerprint = req.headers['x-fingerprint'] as string || 'unknown'
    const hostIp = req.clientIp || '127.0.0.1'

    const result = await roomService.createRoom(body, fingerprint, hostIp)

    res.status(201).json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('Create room error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to create room',
    })
  }
})

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const roomId = req.params.id
    const room = await roomService.getRoom(roomId)

    if (!room) {
      res.status(404).json({
        success: false,
        error: 'Room not found',
      })
      return
    }

    const sanitizedRoom = sanitizeRoom(room)

    res.status(200).json({
      success: true,
      data: sanitizedRoom,
    })
  } catch (error) {
    console.error('Get room error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get room',
    })
  }
})

router.post('/:id/verify', async (req: Request, res: Response): Promise<void> => {
  try {
    const roomId = req.params.id
    const body = req.body as VerifyRequest

    if (!body.fingerprint) {
      res.status(400).json({
        success: false,
        error: 'Invalid request: fingerprint is required',
      })
      return
    }

    const clientIp = req.clientIp || body.ip || '127.0.0.1'

    const result = await antiCheatService.isAllowedToVote(
      roomId,
      clientIp,
      body.fingerprint,
      body.userId
    )

    const room = await roomService.getRoom(roomId)
    let role: 'host' | 'voter' | 'viewer' = 'viewer'

    if (room && body.userId) {
      const user = room.onlineUsers.find(u => u.id === body.userId)
      if (user) {
        role = user.role
      } else if (room.creatorId === body.userId) {
        role = 'host'
      } else {
        role = 'voter'
      }
    }

    const response: VerifyResponse = {
      allowed: result.allowed,
      hasVoted: result.hasVoted,
      role,
    }

    res.status(200).json({
      success: true,
      data: response,
    })
  } catch (error) {
    console.error('Verify error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to verify',
    })
  }
})

router.get('/:id/results', async (req: Request, res: Response): Promise<void> => {
  try {
    const roomId = req.params.id
    const room = await roomService.getRoom(roomId)

    if (!room) {
      res.status(404).json({
        success: false,
        error: 'Room not found',
      })
      return
    }

    const options: Option[] = room.options
    const totalVotes = room.voteRecords.length

    const userId = req.headers['x-user-id'] as string
    const isHost = userId && room.creatorId === userId

    const response: {
      options: Option[]
      totalVotes: number
      voteRecords?: Array<Omit<VoteRecord, 'ip' | 'fingerprint'>>
    } = {
      options,
      totalVotes,
    }

    if (!room.isAnonymous && isHost) {
      response.voteRecords = room.voteRecords.map(({ ip, fingerprint, ...record }) => record)
    }

    res.status(200).json({
      success: true,
      data: response,
    })
  } catch (error) {
    console.error('Get results error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get results',
    })
  }
})

router.get('/:id/danmus', async (req: Request, res: Response): Promise<void> => {
  try {
    const roomId = req.params.id
    const room = await roomService.getRoom(roomId)

    if (!room) {
      res.status(404).json({
        success: false,
        error: 'Room not found',
      })
      return
    }

    const danmus: Danmu[] = room.danmus

    res.status(200).json({
      success: true,
      data: danmus,
    })
  } catch (error) {
    console.error('Get danmus error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get danmus',
    })
  }
})

export default router
