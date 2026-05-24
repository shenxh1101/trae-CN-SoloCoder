import { Router, type Request, type Response } from 'express'
import prisma from '../lib/prisma.js'

const router = Router()

router.post('/snippets/:snippetId/like', async (req: Request, res: Response): Promise<void> => {
  try {
    const { snippetId } = req.params
    const { userId } = req.body

    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'User ID is required',
      })
      return
    }

    const snippet = await prisma.snippet.findUnique({
      where: { id: snippetId },
    })

    if (!snippet) {
      res.status(404).json({
        success: false,
        error: 'Snippet not found',
      })
      return
    }

    const existingLike = await prisma.snippetLike.findUnique({
      where: {
        snippetId_userId: {
          snippetId,
          userId,
        },
      },
    })

    if (existingLike) {
      await prisma.snippetLike.delete({
        where: { id: existingLike.id },
      })

      const updatedSnippet = await prisma.snippet.update({
        where: { id: snippetId },
        data: { likesCount: { decrement: 1 } },
      })

      res.status(200).json({
        success: true,
        data: {
          liked: false,
          likesCount: updatedSnippet.likesCount,
        },
        message: 'Like removed',
      })
    } else {
      await prisma.snippetLike.create({
        data: {
          snippetId,
          userId,
        },
      })

      const updatedSnippet = await prisma.snippet.update({
        where: { id: snippetId },
        data: { likesCount: { increment: 1 } },
      })

      res.status(200).json({
        success: true,
        data: {
          liked: true,
          likesCount: updatedSnippet.likesCount,
        },
        message: 'Like added',
      })
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to toggle like',
    })
  }
})

router.get('/snippets/:snippetId/like/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const { snippetId } = req.params
    const { userId } = req.query

    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'User ID is required',
      })
      return
    }

    const existingLike = await prisma.snippetLike.findUnique({
      where: {
        snippetId_userId: {
          snippetId,
          userId: String(userId),
        },
      },
    })

    const snippet = await prisma.snippet.findUnique({
      where: { id: snippetId },
      select: { likesCount: true },
    })

    res.status(200).json({
      success: true,
      data: {
        liked: !!existingLike,
        likesCount: snippet?.likesCount ?? 0,
      },
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to check like status',
    })
  }
})

router.post('/snippets/:snippetId/favorite', async (req: Request, res: Response): Promise<void> => {
  try {
    const { snippetId } = req.params
    const { userId } = req.body

    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'User ID is required',
      })
      return
    }

    const snippet = await prisma.snippet.findUnique({
      where: { id: snippetId },
    })

    if (!snippet) {
      res.status(404).json({
        success: false,
        error: 'Snippet not found',
      })
      return
    }

    const existingFavorite = await prisma.snippetFavorite.findUnique({
      where: {
        snippetId_userId: {
          snippetId,
          userId,
        },
      },
    })

    if (existingFavorite) {
      await prisma.snippetFavorite.delete({
        where: { id: existingFavorite.id },
      })

      const updatedSnippet = await prisma.snippet.update({
        where: { id: snippetId },
        data: { favoritesCount: { decrement: 1 } },
      })

      res.status(200).json({
        success: true,
        data: {
          favorited: false,
          favoritesCount: updatedSnippet.favoritesCount,
        },
        message: 'Removed from favorites',
      })
    } else {
      await prisma.snippetFavorite.create({
        data: {
          snippetId,
          userId,
        },
      })

      const updatedSnippet = await prisma.snippet.update({
        where: { id: snippetId },
        data: { favoritesCount: { increment: 1 } },
      })

      res.status(200).json({
        success: true,
        data: {
          favorited: true,
          favoritesCount: updatedSnippet.favoritesCount,
        },
        message: 'Added to favorites',
      })
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to toggle favorite',
    })
  }
})

router.get('/snippets/:snippetId/favorite/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const { snippetId } = req.params
    const { userId } = req.query

    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'User ID is required',
      })
      return
    }

    const existingFavorite = await prisma.snippetFavorite.findUnique({
      where: {
        snippetId_userId: {
          snippetId,
          userId: String(userId),
        },
      },
    })

    const snippet = await prisma.snippet.findUnique({
      where: { id: snippetId },
      select: { favoritesCount: true },
    })

    res.status(200).json({
      success: true,
      data: {
        favorited: !!existingFavorite,
        favoritesCount: snippet?.favoritesCount ?? 0,
      },
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to check favorite status',
    })
  }
})

router.post('/snippets/:snippetId/fork', async (req: Request, res: Response): Promise<void> => {
  try {
    const { snippetId } = req.params
    const { userId, title, description } = req.body

    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'User ID is required',
      })
      return
    }

    const originalSnippet = await prisma.snippet.findUnique({
      where: { id: snippetId },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    })

    if (!originalSnippet) {
      res.status(404).json({
        success: false,
        error: 'Snippet not found',
      })
      return
    }

    let shortCode = Math.random().toString(36).substring(2, 10)
    let existing = await prisma.snippet.findUnique({ where: { shortCode } })

    while (existing) {
      shortCode = Math.random().toString(36).substring(2, 10)
      existing = await prisma.snippet.findUnique({ where: { shortCode } })
    }

    const forkedSnippet = await prisma.snippet.create({
      data: {
        title: title || `Fork of ${originalSnippet.title}`,
        description: description || originalSnippet.description,
        code: originalSnippet.code,
        language: originalSnippet.language,
        isPublic: originalSnippet.isPublic,
        authorId: userId,
        forkedFromId: snippetId,
        shortCode,
        tags: {
          create: originalSnippet.tags.map((st: any) => ({
            tag: {
              connect: { id: st.tag.id },
            },
          })),
        },
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
      },
    })

    await prisma.snippet.update({
      where: { id: snippetId },
      data: { forksCount: { increment: 1 } },
    })

    await prisma.snippetVersion.create({
      data: {
        snippetId: forkedSnippet.id,
        version: '1.0.0',
        label: 'Forked version',
        code: forkedSnippet.code,
        language: forkedSnippet.language,
        createdById: userId,
      },
    })

    const formattedSnippet = {
      ...forkedSnippet,
      tags: forkedSnippet.tags.map((st: any) => st.tag.name),
    }

    res.status(201).json({
      success: true,
      data: formattedSnippet,
      message: 'Snippet forked successfully',
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fork snippet',
    })
  }
})

export default router
