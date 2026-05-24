import { Router, type Request, type Response } from 'express'
import prisma from '../lib/prisma.js'
import { generateUniqueShortCode, validateShortCode } from '../lib/shortCode.js'
import { auth, type AuthRequest } from '../middleware/auth.js'

const router = Router()

router.get('/:shortCode', async (req: Request, res: Response): Promise<void> => {
  try {
    const { shortCode } = req.params

    if (!validateShortCode(shortCode)) {
      res.status(400).json({
        success: false,
        error: 'Invalid short code format',
      })
      return
    }

    const snippet = await prisma.snippet.findUnique({
      where: { shortCode },
      select: {
        id: true,
        isPublic: true,
      },
    })

    if (!snippet) {
      res.status(404).json({
        success: false,
        error: 'Short code not found',
      })
      return
    }

    if (!snippet.isPublic) {
      res.status(403).json({
        success: false,
        error: 'This snippet is private',
      })
      return
    }

    res.status(200).json({
      success: true,
      data: {
        snippetId: snippet.id,
        shortCode,
      },
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to resolve short code',
    })
  }
})

router.post('/generate', auth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      })
      return
    }

    const { snippetId, customPrefix } = req.body

    if (!snippetId) {
      res.status(400).json({
        success: false,
        error: 'Snippet ID is required',
      })
      return
    }

    const snippet = await prisma.snippet.findUnique({
      where: { id: snippetId },
      select: {
        id: true,
        authorId: true,
        isPublic: true,
        shortCode: true,
      },
    })

    if (!snippet) {
      res.status(404).json({
        success: false,
        error: 'Snippet not found',
      })
      return
    }

    if (snippet.authorId !== req.user.id) {
      res.status(403).json({
        success: false,
        error: 'You do not have permission to generate a short code for this snippet',
      })
      return
    }

    const shortCode = await generateUniqueShortCode({ customPrefix })

    await prisma.snippet.update({
      where: { id: snippetId },
      data: { shortCode },
    })

    res.status(201).json({
      success: true,
      data: {
        snippetId,
        shortCode,
        url: `/s/${shortCode}`,
      },
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to generate short code',
    })
  }
})

export default router
