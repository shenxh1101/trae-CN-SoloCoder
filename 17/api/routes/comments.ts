import { Router, type Request, type Response } from 'express'
import prisma from '../lib/prisma.js'
import type { Comment } from '@/shared/types'

const router = Router()

router.get('/snippets/:snippetId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { snippetId } = req.params
    const { page = 1, limit = 20 } = req.query

    const pageNum = Number(page)
    const limitNum = Number(limit)
    const skip = (pageNum - 1) * limitNum

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

    const comments = await prisma.comment.findMany({
      where: {
        snippetId,
        parentId: null,
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
        replies: {
          include: {
            author: {
              select: {
                id: true,
                username: true,
                avatar: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
    })

    const total = await prisma.comment.count({
      where: {
        snippetId,
        parentId: null,
      },
    })

    res.status(200).json({
      success: true,
      data: comments,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch comments',
    })
  }
})

router.post('/snippets/:snippetId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { snippetId } = req.params
    const { content, authorId, lineNumber, lineContent, parentId } = req.body

    if (!content || !authorId) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields',
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

    if (parentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: parentId },
      })

      if (!parentComment) {
        res.status(404).json({
          success: false,
          error: 'Parent comment not found',
        })
        return
      }
    }

    const comment = await prisma.comment.create({
      data: {
        snippetId,
        content,
        authorId,
        lineNumber,
        lineContent,
        parentId,
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
    })

    res.status(201).json({
      success: true,
      data: comment,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to create comment',
    })
  }
})

router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { content } = req.body

    if (!content) {
      res.status(400).json({
        success: false,
        error: 'Content is required',
      })
      return
    }

    const comment = await prisma.comment.findUnique({
      where: { id },
    })

    if (!comment) {
      res.status(404).json({
        success: false,
        error: 'Comment not found',
      })
      return
    }

    const updatedComment = await prisma.comment.update({
      where: { id },
      data: { content },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
    })

    res.status(200).json({
      success: true,
      data: updatedComment,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update comment',
    })
  }
})

router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const comment = await prisma.comment.findUnique({
      where: { id },
    })

    if (!comment) {
      res.status(404).json({
        success: false,
        error: 'Comment not found',
      })
      return
    }

    await prisma.comment.deleteMany({
      where: { parentId: id },
    })

    await prisma.comment.delete({ where: { id } })

    res.status(200).json({
      success: true,
      message: 'Comment deleted successfully',
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to delete comment',
    })
  }
})

export default router
