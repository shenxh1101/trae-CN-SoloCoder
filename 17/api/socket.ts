import type { Server as HTTPServer } from 'http'
import type { Socket as NetSocket } from 'net'
import type { Server, Socket } from 'socket.io'
import { Server as IOServer } from 'socket.io'
import * as Y from 'yjs'
import type { Collaborator } from '../shared/types.js'
import { getCollabService } from './services/CollabService.js'
import { verifyToken } from './middleware/auth.js'
import prisma from './lib/prisma.js'

interface SocketData {
  userId: string
  username: string
  avatar: string
  roomId: string | null
}

interface ServerToClientEvents {
  'collab:joined': (data: { collaborators: Collaborator[]; docState: number[] }) => void
  'collab:user-joined': (collaborator: Collaborator) => void
  'collab:user-left': (userId: string) => void
  'collab:cursor-updated': (collaborator: Collaborator) => void
  'collab:doc-update': (update: number[]) => void
  'collab:sync-state': (docState: number[]) => void
  'collab:error': (error: string) => void
}

interface ClientToServerEvents {
  'collab:join': (data: { roomId: string; initialCode?: string }) => void
  'collab:leave': () => void
  'collab:cursor': (cursor: Collaborator['cursor']) => void
  'collab:doc-update': (update: number[]) => void
  'collab:request-sync': () => void
}

interface InterServerEvents {
  ping: () => void
}

export type IOServerType = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>

let io: IOServerType | null = null

const SOCKET_PING_INTERVAL = 25000
const SOCKET_PING_TIMEOUT = 20000

export const initSocketServer = (httpServer: HTTPServer): IOServerType => {
  io = new IOServer(httpServer, {
    path: '/socket.io',
    cors: {
      origin: '*',
      credentials: true,
    },
    pingInterval: SOCKET_PING_INTERVAL,
    pingTimeout: SOCKET_PING_TIMEOUT,
    transports: ['websocket', 'polling'],
  })

  const collabService = getCollabService()

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token
      if (!token) {
        return next(new Error('Authentication required'))
      }

      const payload = verifyToken(token)
      if (!payload) {
        return next(new Error('Invalid or expired token'))
      }

      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
          id: true,
          username: true,
          avatar: true,
        },
      })

      if (!user) {
        return next(new Error('User not found'))
      }

      socket.data.userId = user.id
      socket.data.username = user.username
      socket.data.avatar = user.avatar || ''
      socket.data.roomId = null

      next()
    } catch (error) {
      console.error('[Socket] Authentication error:', error)
      next(new Error('Authentication failed'))
    }
  })

  io.on('connection', (socket) => {
    const { userId, username, avatar } = socket.data
    console.log(`[Socket] User connected: ${userId} (${username})`)

    socket.on('collab:join', async ({ roomId, initialCode }) => {
      try {
        if (socket.data.roomId) {
          await leaveRoom(socket)
        }

        let snippetInitialCode = initialCode
        if (!snippetInitialCode && roomId.startsWith('snippet:')) {
          const snippetId = roomId.replace('snippet:', '')
          const snippet = await prisma.snippet.findUnique({
            where: { id: snippetId },
            select: { code: true },
          })
          if (snippet) {
            snippetInitialCode = snippet.code
          }
        }

        const room = collabService.getOrCreateRoom(roomId, snippetInitialCode)
        const collaborator = collabService.addCollaborator(roomId, userId, username, avatar)

        socket.data.roomId = roomId
        await socket.join(roomId)

        const docState = Array.from(Y.encodeStateAsUpdate(room.doc))

        socket.emit('collab:joined', {
          collaborators: collabService.getCollaborators(roomId),
          docState,
        })

        socket.to(roomId).emit('collab:user-joined', collaborator)

        console.log(`[Socket] User ${userId} joined room ${roomId}`)
      } catch (error) {
        console.error('[Socket] Error joining room:', error)
        socket.emit('collab:error', 'Failed to join room')
      }
    })

    socket.on('collab:leave', async () => {
      await leaveRoom(socket)
    })

    socket.on('collab:cursor', (cursor) => {
      const roomId = socket.data.roomId
      if (!roomId) return

      const updatedCollaborator = collabService.updateCursor(roomId, userId, cursor)
      if (updatedCollaborator) {
        socket.to(roomId).emit('collab:cursor-updated', updatedCollaborator)
      }
    })

    socket.on('collab:doc-update', (update) => {
      const roomId = socket.data.roomId
      if (!roomId) return

      try {
        const updateArray = new Uint8Array(update)
        collabService.applyYjsUpdate(roomId, updateArray, userId)
        socket.to(roomId).emit('collab:doc-update', update)
      } catch (error) {
        console.error('[Socket] Error applying document update:', error)
        socket.emit('collab:error', 'Failed to apply document update')
      }
    })

    socket.on('collab:request-sync', () => {
      const roomId = socket.data.roomId
      if (!roomId) return

      const docState = collabService.getYjsDocState(roomId)
      if (docState) {
        socket.emit('collab:sync-state', Array.from(docState))
      }
    })

    const leaveRoom = async (currentSocket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>) => {
      const roomId = currentSocket.data.roomId
      if (!roomId) return

      collabService.removeCollaborator(roomId, userId)
      currentSocket.to(roomId).emit('collab:user-left', userId)
      await currentSocket.leave(roomId)
      currentSocket.data.roomId = null

      console.log(`[Socket] User ${userId} left room ${roomId}`)
    }

    socket.on('disconnect', async (reason) => {
      console.log(`[Socket] User ${userId} disconnected: ${reason}`)
      await leaveRoom(socket)
    })
  })

  console.log('[Socket] WebSocket server initialized')
  return io
}

export const getSocketServer = (): IOServerType | null => io

export const closeSocketServer = (): void => {
  if (io) {
    io.close()
    io = null
    console.log('[Socket] WebSocket server closed')
  }
}

export default initSocketServer
