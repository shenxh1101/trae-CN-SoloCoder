import { Router, type Request, type Response } from 'express'
import bcrypt from 'bcrypt'
import prisma from '../lib/prisma.js'
import { auth, generateToken, type AuthRequest } from '../middleware/auth.js'
import type { User, AuthResponse, EditorSettings } from '../../shared/types.js'

const router = Router()
const SALT_ROUNDS = 10

const DEFAULT_EDITOR_SETTINGS: EditorSettings = {
  theme: 'vs-dark',
  fontSize: 14,
  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
  tabSize: 2,
  insertSpaces: true,
  minimap: true,
  wordWrap: 'off',
  keybindings: {},
}

router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, password } = req.body

    if (!username || !email || !password) {
      res.status(400).json({
        success: false,
        error: 'Username, email and password are required',
      })
      return
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ username }, { email }],
      },
    })

    if (existingUser) {
      res.status(409).json({
        success: false,
        error: 'Username or email already exists',
      })
      return
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)

    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
        settings: {
          create: {
            editorSettings: DEFAULT_EDITOR_SETTINGS,
          },
        },
      },
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        bio: true,
        createdAt: true,
      },
    })

    const token = generateToken({
      userId: user.id,
      username: user.username,
      email: user.email,
    })

    const response: AuthResponse = {
      user: user as User,
      token,
    }

    res.status(201).json({
      success: true,
      data: response,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Registration failed',
    })
  }
})

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      res.status(400).json({
        success: false,
        error: 'Email and password are required',
      })
      return
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        username: true,
        email: true,
        passwordHash: true,
        avatar: true,
        bio: true,
        createdAt: true,
      },
    })

    if (!user || !user.passwordHash) {
      res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      })
      return
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash)

    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      })
      return
    }

    const token = generateToken({
      userId: user.id,
      username: user.username,
      email: user.email,
    })

    const { passwordHash: _, ...userWithoutPassword } = user
    const response: AuthResponse = {
      user: userWithoutPassword as User,
      token,
    }

    res.status(200).json({
      success: true,
      data: response,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Login failed',
    })
  }
})

router.get('/me', auth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      })
      return
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        bio: true,
        createdAt: true,
      },
    })

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      })
      return
    }

    res.status(200).json({
      success: true,
      data: user as User,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get user info',
    })
  }
})

router.get('/settings', auth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      })
      return
    }

    const settings = await prisma.userSettings.findUnique({
      where: { userId: req.user.id },
      select: { editorSettings: true },
    })

    const editorSettings = (settings?.editorSettings as EditorSettings) || DEFAULT_EDITOR_SETTINGS

    res.status(200).json({
      success: true,
      data: editorSettings,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get settings',
    })
  }
})

router.put('/settings', auth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      })
      return
    }

    const settingsData = req.body as Partial<EditorSettings>

    const existingSettings = await prisma.userSettings.findUnique({
      where: { userId: req.user.id },
      select: { editorSettings: true },
    })

    const currentSettings = (existingSettings?.editorSettings as EditorSettings) || DEFAULT_EDITOR_SETTINGS
    const mergedSettings = { ...currentSettings, ...settingsData }

    const updatedSettings = await prisma.userSettings.upsert({
      where: { userId: req.user.id },
      update: {
        editorSettings: mergedSettings,
      },
      create: {
        userId: req.user.id,
        editorSettings: mergedSettings,
      },
      select: { editorSettings: true },
    })

    res.status(200).json({
      success: true,
      data: updatedSettings.editorSettings as EditorSettings,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update settings',
    })
  }
})

export default router
