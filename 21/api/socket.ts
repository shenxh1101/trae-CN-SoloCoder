import { Server } from 'socket.io'
import type { Server as HTTPServer } from 'http'
import type { ClientToServerEvents, ServerToClientEvents, User } from '../shared/types.js'
import { roomService } from './services/roomService.js'
import { voteService } from './services/voteService.js'
import { antiCheatService } from './services/antiCheatService.js'

const rooms = new Map<string, Set<string>>()

function getSocketIp(socket: any): string {
  const headers = socket.handshake.headers
  const xForwardedFor = headers['x-forwarded-for']
  if (xForwardedFor) {
    const ips = Array.isArray(xForwardedFor)
      ? xForwardedFor[0]
      : xForwardedFor.split(',')[0]
    return ips.trim()
  }

  const xRealIp = headers['x-real-ip']
  if (xRealIp) {
    return Array.isArray(xRealIp) ? xRealIp[0] : xRealIp
  }

  const cfConnectingIp = headers['cf-connecting-ip']
  if (cfConnectingIp) {
    return Array.isArray(cfConnectingIp) ? cfConnectingIp[0] : cfConnectingIp
  }

  return socket.handshake.address || socket.conn.remoteAddress || '127.0.0.1'
}

export function setupSocket(server: HTTPServer): void {
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  })

  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`)

    let currentRoomId: string | null = null
    let currentUserId: string | null = null

    socket.on('join-room', async (data) => {
      const { roomId, userId, userName, fingerprint } = data
      const ip = getSocketIp(socket)

      const result = await roomService.joinRoom(roomId, userId, userName, fingerprint, ip)
      if (!result) {
        return
      }

      const { user, onlineCount } = result

      if (!rooms.has(roomId)) {
        rooms.set(roomId, new Set())
      }
      rooms.get(roomId)!.add(socket.id)

      socket.join(roomId)
      currentRoomId = roomId
      currentUserId = userId

      socket.to(roomId).emit('user-joined', { user, onlineCount })
    })

    socket.on('leave-room', async (data) => {
      const { roomId, userId } = data

      const result = await roomService.leaveRoom(roomId, userId)
      if (!result) {
        return
      }

      const { onlineCount } = result

      if (rooms.has(roomId)) {
        rooms.get(roomId)!.delete(socket.id)
        if (rooms.get(roomId)!.size === 0) {
          rooms.delete(roomId)
        }
      }

      socket.leave(roomId)

      if (currentRoomId === roomId) {
        currentRoomId = null
        currentUserId = null
      }

      socket.to(roomId).emit('user-left', { userId, onlineCount })
    })

    socket.on('vote', async (data) => {
      const { roomId, optionIds, userId, userName, fingerprint } = data
      const ip = getSocketIp(socket)

      const antiCheatResult = await antiCheatService.isAllowedToVote(roomId, ip, fingerprint, userId)
      if (!antiCheatResult.allowed) {
        return
      }

      const result = await voteService.castVote(roomId, optionIds, userId, userName, fingerprint, ip)
      if (!result.success || !result.voteUpdate) {
        return
      }

      io.to(roomId).emit('vote-updated', result.voteUpdate)
    })

    socket.on('danmu', async (data) => {
      const { roomId, userId, userName, content } = data

      const result = await voteService.addDanmu(roomId, userId, userName, content)
      if (!result.danmu) {
        return
      }

      io.to(roomId).emit('danmu-received', result.danmu)
    })

    socket.on('control-vote', async (data) => {
      const { roomId, userId, action } = data

      const result = await roomService.controlVote(roomId, userId, action)
      if (!result) {
        return
      }

      const { status, endTime, room } = result

      if (action === 'end') {
        const totalVotes = room.options.reduce((sum, opt) => sum + opt.votes, 0)
        io.to(roomId).emit('vote-ended', {
          finalResults: room.options,
          totalVotes,
        })
      } else {
        io.to(roomId).emit('vote-status-changed', { status, endTime })
      }
    })

    socket.on('disconnect', async () => {
      console.log(`Client disconnected: ${socket.id}`)

      if (currentRoomId && currentUserId) {
        const result = await roomService.leaveRoom(currentRoomId, currentUserId)
        if (result) {
          const { onlineCount } = result
          socket.to(currentRoomId).emit('user-left', { userId: currentUserId, onlineCount })
        }

        if (rooms.has(currentRoomId)) {
          rooms.get(currentRoomId)!.delete(socket.id)
          if (rooms.get(currentRoomId)!.size === 0) {
            rooms.delete(currentRoomId)
          }
        }
      }
    })
  })
}
