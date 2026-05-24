import { type Request, type Response, type NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import prisma from '../lib/prisma.js'

export interface AuthRequest extends Request {
  user?: {
    id: string
    username: string
    email: string
  }
}

export interface JwtPayload {
  userId: string
  username: string
  email: string
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

export const generateToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export const verifyToken = (token: string): JwtPayload | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload
  } catch {
    return null
  }
}

const DEV_MOCK_USER = {
  id: 'user-1',
  username: 'alice_dev',
  email: 'alice@example.com',
}

export const auth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization

    if (process.env.NODE_ENV === 'development' && (!authHeader || !authHeader.startsWith('Bearer '))) {
      console.log('[Dev Mode] Using mock user for authenticated route')
      req.user = DEV_MOCK_USER
      next()
      return
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'Authorization header is required',
      })
      return
    }

    const token = authHeader.split(' ')[1]
    const payload = verifyToken(token)

    if (!payload) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Dev Mode] Invalid token, using mock user')
        req.user = DEV_MOCK_USER
        next()
        return
      }
      res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
      })
      return
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        username: true,
        email: true,
      },
    })

    if (!user) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Dev Mode] User not found, using mock user')
        req.user = DEV_MOCK_USER
        next()
        return
      }
      res.status(401).json({
        success: false,
        error: 'User not found',
      })
      return
    }

    req.user = user
    next()
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Dev Mode] Auth error, using mock user:', error)
      req.user = DEV_MOCK_USER
      next()
      return
    }
    res.status(500).json({
      success: false,
      error: 'Authentication failed',
    })
  }
}

export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next()
      return
    }

    const token = authHeader.split(' ')[1]
    const payload = verifyToken(token)

    if (!payload) {
      next()
      return
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        username: true,
        email: true,
      },
    })

    if (user) {
      req.user = user
    }

    next()
  } catch {
    next()
  }
}
