import { Router, type Request, type Response } from 'express'
import prisma from '../lib/prisma.js'
import type { Snippet, SearchQuery, Language } from '@/shared/types'

const router = Router()

function generateShortCode(): string {
  return Math.random().toString(36).substring(2, 10)
}

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { q, language, sortBy = 'latest', page = 1, limit = 20 } = req.query as SearchQuery

    const pageNum = Number(page)
    const limitNum = Number(limit)
    const skip = (pageNum - 1) * limitNum

    const where: any = { isPublic: true }

    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { code: { contains: q, mode: 'insensitive' } },
      ]
    }

    if (language) {
      where.language = language
    }

    let orderBy: any = { createdAt: 'desc' }

    if (sortBy === 'popular') {
      orderBy = [
        { likesCount: 'desc' },
        { viewsCount: 'desc' },
        { createdAt: 'desc' },
      ]
    } else if (sortBy === 'trending') {
      orderBy = [
        { viewsCount: 'desc' },
        { likesCount: 'desc' },
        { createdAt: 'desc' },
      ]
    }

    const snippets = await prisma.snippet.findMany({
      where,
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
      orderBy,
      skip,
      take: limitNum,
    })

    const total = await prisma.snippet.count({ where })

    const formattedSnippets = snippets.map((snippet: any) => ({
      ...snippet,
      tags: snippet.tags.map((st: any) => st.tag.name),
    }))

    res.status(200).json({
      success: true,
      data: formattedSnippets,
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
      error: 'Failed to fetch snippets',
    })
  }
})

router.get('/code/:shortCode', async (req: Request, res: Response): Promise<void> => {
  try {
    const { shortCode } = req.params

    const snippet = await prisma.snippet.findUnique({
      where: { shortCode },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatar: true,
            bio: true,
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
      },
    })

    if (!snippet) {
      res.status(404).json({
        success: false,
        error: 'Snippet not found',
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

    await prisma.snippet.update({
      where: { id: snippet.id },
      data: { viewsCount: { increment: 1 } },
    })

    const formattedSnippet: any = {
      ...snippet,
      tags: snippet.tags ? snippet.tags.map((st: any) => st.tag.name) : [],
    }

    res.status(200).json({
      success: true,
      data: formattedSnippet,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch snippet by short code',
    })
  }
})

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const snippet = await prisma.snippet.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatar: true,
            bio: true,
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
      },
    })

    if (!snippet) {
      res.status(404).json({
        success: false,
        error: 'Snippet not found',
      })
      return
    }

    await prisma.snippet.update({
      where: { id },
      data: { viewsCount: { increment: 1 } },
    })

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    await prisma.viewStat.upsert({
      where: {
        snippetId_viewDate: {
          snippetId: id,
          viewDate: today,
        },
      },
      update: {
        viewCount: { increment: 1 },
      },
      create: {
        snippetId: id,
        viewDate: today,
        viewCount: 1,
      },
    })

    const formattedSnippet = {
      ...snippet,
      tags: snippet.tags.map((st: any) => st.tag.name),
    }

    res.status(200).json({
      success: true,
      data: formattedSnippet,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch snippet',
    })
  }
})

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, description, code, language, isPublic, authorId, tags = [] } = req.body

    if (!title || !code || !language || !authorId) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields',
      })
      return
    }

    let shortCode = generateShortCode()
    let existing = await prisma.snippet.findUnique({ where: { shortCode } })

    while (existing) {
      shortCode = generateShortCode()
      existing = await prisma.snippet.findUnique({ where: { shortCode } })
    }

    const snippet = await prisma.snippet.create({
      data: {
        title,
        description,
        code,
        language,
        isPublic: isPublic ?? true,
        authorId,
        shortCode,
        tags: {
          create: await Promise.all(
            tags.map(async (tagName: string) => {
              const tag = await prisma.tag.upsert({
                where: { name: tagName },
                update: {},
                create: { name: tagName },
              })
              return {
                tag: {
                  connect: { id: tag.id },
                },
              }
            }),
          ),
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

    await prisma.snippetVersion.create({
      data: {
        snippetId: snippet.id,
        version: '1.0.0',
        label: 'Initial version',
        code,
        language,
        createdById: authorId,
      },
    })

    const formattedSnippet = {
      ...snippet,
      tags: snippet.tags.map((st: any) => st.tag.name),
    }

    res.status(201).json({
      success: true,
      data: formattedSnippet,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to create snippet',
    })
  }
})

router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { title, description, code, language, isPublic, tags } = req.body

    const existingSnippet = await prisma.snippet.findUnique({ where: { id } })

    if (!existingSnippet) {
      res.status(404).json({
        success: false,
        error: 'Snippet not found',
      })
      return
    }

    const updateData: any = {
      title,
      description,
      code,
      language,
      isPublic,
    }

    if (tags) {
      await prisma.snippetTag.deleteMany({ where: { snippetId: id } })

      updateData.tags = {
        create: await Promise.all(
          tags.map(async (tagName: string) => {
            const tag = await prisma.tag.upsert({
              where: { name: tagName },
              update: {},
              create: { name: tagName },
            })
            return {
              tag: {
                connect: { id: tag.id },
              },
            }
          }),
        ),
      }
    }

    const snippet = await prisma.snippet.update({
      where: { id },
      data: updateData,
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

    const formattedSnippet = {
      ...snippet,
      tags: snippet.tags.map((st: any) => st.tag.name),
    }

    res.status(200).json({
      success: true,
      data: formattedSnippet,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update snippet',
    })
  }
})

router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const existingSnippet = await prisma.snippet.findUnique({ where: { id } })

    if (!existingSnippet) {
      res.status(404).json({
        success: false,
        error: 'Snippet not found',
      })
      return
    }

    await prisma.snippetTag.deleteMany({ where: { snippetId: id } })
    await prisma.snippetLike.deleteMany({ where: { snippetId: id } })
    await prisma.snippetFavorite.deleteMany({ where: { snippetId: id } })
    await prisma.comment.deleteMany({ where: { snippetId: id } })
    await prisma.snippetVersion.deleteMany({ where: { snippetId: id } })
    await prisma.viewStat.deleteMany({ where: { snippetId: id } })
    await prisma.snippet.delete({ where: { id } })

    res.status(200).json({
      success: true,
      message: 'Snippet deleted successfully',
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to delete snippet',
    })
  }
})

export default router
