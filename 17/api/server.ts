import { createServer } from 'http'
import { Server } from 'socket.io'
import app from './app.js'
import prisma from './lib/prisma.js'
import { verifyToken, type JwtPayload } from './middleware/auth.js'
import type { Collaborator } from '@/shared/types'

const PORT = process.env.PORT || 3001

const server = createServer(app)

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  path: '/socket.io',
  transports: ['websocket', 'polling'],
})

interface CollaboratorMap {
  [userId: string]: {
    socketId: string
    user: {
      id: string
      username: string
      avatar: string
    }
    cursor: Collaborator['cursor']
    color: string
  }
}

interface RoomState {
  collaborators: CollaboratorMap
  code: string
  language: string
}

const rooms: Map<string, RoomState> = new Map()

const COLORS = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#96CEB4',
  '#FFEAA7',
  '#DDA0DD',
  '#98D8C8',
  '#F7DC6F',
  '#BB8FCE',
  '#85C1E9',
]

const getRandomColor = (): string => {
  return COLORS[Math.floor(Math.random() * COLORS.length)]
}

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token

    if (!token) {
      next(new Error('Authentication required'))
      return
    }

    const payload = verifyToken(token) as JwtPayload | null

    if (!payload) {
      next(new Error('Invalid token'))
      return
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
      next(new Error('User not found'))
      return
    }

    ;(socket as any).user = user
    next()
  } catch (error) {
    next(new Error('Authentication failed'))
  }
})

io.on('connection', (socket) => {
  const user = (socket as any).user
  console.log(`User connected: ${user.username} (${socket.id})`)

  socket.on('join-room', async (roomId: string) => {
    try {
      const snippet = await prisma.snippet.findUnique({
        where: { id: roomId },
        select: {
          id: true,
          code: true,
          language: true,
          authorId: true,
          isPublic: true,
        },
      })

      if (!snippet) {
        socket.emit('error', 'Snippet not found')
        return
      }

      if (!snippet.isPublic && snippet.authorId !== user.id) {
        socket.emit('error', 'Access denied')
        return
      }

      await socket.join(roomId)

      if (!rooms.has(roomId)) {
        rooms.set(roomId, {
          collaborators: {},
          code: snippet.code,
          language: snippet.language,
        })
      }

      const room = rooms.get(roomId)!
      const color = getRandomColor()

      room.collaborators[user.id] = {
        socketId: socket.id,
        user: {
          id: user.id,
          username: user.username,
          avatar: user.avatar || '',
        },
        cursor: {
          lineNumber: 1,
          column: 1,
        },
        color,
      }

      const collaboratorsList: Collaborator[] = Object.values(room.collaborators).map((c) => ({
        userId: c.user.id,
        username: c.user.username,
        avatar: c.user.avatar,
        cursor: c.cursor,
        color: c.color,
      }))

      socket.emit('room-joined', {
        code: room.code,
        language: room.language,
        collaborators: collaboratorsList.filter((c) => c.userId !== user.id),
      })

      socket.to(roomId).emit('user-joined', {
        userId: user.id,
        username: user.username,
        avatar: user.avatar || '',
        cursor: room.collaborators[user.id].cursor,
        color,
      })

      socket.on('code-change', (delta: any) => {
        const room = rooms.get(roomId)
        if (!room) return

        socket.to(roomId).emit('code-change', {
          userId: user.id,
          delta,
        })
      })

      socket.on('cursor-change', (cursor: Collaborator['cursor']) => {
        const room = rooms.get(roomId)
        if (!room || !room.collaborators[user.id]) return

        room.collaborators[user.id].cursor = cursor

        socket.to(roomId).emit('cursor-change', {
          userId: user.id,
          cursor,
        })
      })

      socket.on('selection-change', (selection: Collaborator['cursor']['selection']) => {
        const room = rooms.get(roomId)
        if (!room || !room.collaborators[user.id]) return

        room.collaborators[user.id].cursor.selection = selection

        socket.to(roomId).emit('selection-change', {
          userId: user.id,
          selection,
        })
      })

      socket.on('save-code', async (data: { code: string; versionLabel?: string }) => {
        try {
          const room = rooms.get(roomId)
          if (!room) return

          room.code = data.code

          await prisma.snippet.update({
            where: { id: roomId },
            data: { code: data.code },
          })

          if (data.versionLabel) {
            const versions = await prisma.snippetVersion.findMany({
              where: { snippetId: roomId },
              orderBy: { createdAt: 'desc' },
              take: 1,
            })

            const lastVersion = versions[0]
            const newVersionNumber = lastVersion
              ? String(parseInt(lastVersion.version) + 1)
              : '1'

            await prisma.snippetVersion.create({
              data: {
                snippetId: roomId,
                version: newVersionNumber,
                label: data.versionLabel,
                code: data.code,
                language: room.language,
                createdById: user.id,
              },
            })
          }

          io.to(roomId).emit('code-saved', {
            userId: user.id,
            savedAt: new Date().toISOString(),
          })
        } catch (error) {
          socket.emit('error', 'Failed to save code')
        }
      })

      socket.on('disconnect', () => {
        const room = rooms.get(roomId)
        if (room) {
          delete room.collaborators[user.id]

          if (Object.keys(room.collaborators).length === 0) {
            rooms.delete(roomId)
          } else {
            socket.to(roomId).emit('user-left', {
              userId: user.id,
            })
          }
        }

        console.log(`User disconnected: ${user.username} (${socket.id})`)
      })
    } catch (error) {
      socket.emit('error', 'Failed to join room')
    }
  })
})

server.listen(PORT, () => {
  console.log(`Server ready on port ${PORT}`)
})

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received')
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('SIGINT signal received')
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})

export default app
