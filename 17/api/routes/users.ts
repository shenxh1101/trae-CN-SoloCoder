import { Router, type Request, type Response } from 'express'
import prisma from '../lib/prisma.js'
import type { User, UserStats } from '@/shared/types'

const router = Router()

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const user = await prisma.user.findUnique({
      where: { id },
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
      data: user,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user',
    })
  }
})

router.get('/:id/snippets', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { page = 1, limit = 20, sortBy = 'latest' } = req.query

    const pageNum = Number(page)
    const limitNum = Number(limit)
    const skip = (pageNum - 1) * limitNum

    const user = await prisma.user.findUnique({
      where: { id },
    })

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      })
      return
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
      where: { authorId: id, isPublic: true },
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

    const total = await prisma.snippet.count({
      where: { authorId: id, isPublic: true },
    })

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
      error: 'Failed to fetch user snippets',
    })
  }
})

router.get('/:id/favorites', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { page = 1, limit = 20 } = req.query

    const pageNum = Number(page)
    const limitNum = Number(limit)
    const skip = (pageNum - 1) * limitNum

    const user = await prisma.user.findUnique({
      where: { id },
    })

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      })
      return
    }

    const favorites = await prisma.snippetFavorite.findMany({
      where: { userId: id },
      include: {
        snippet: {
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
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
    })

    const total = await prisma.snippetFavorite.count({
      where: { userId: id },
    })

    const formattedSnippets = favorites.map((fav: any) => ({
      ...fav.snippet,
      tags: fav.snippet.tags.map((st: any) => st.tag.name),
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
      error: 'Failed to fetch user favorites',
    })
  }
})

router.get('/:id/stats', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const user = await prisma.user.findUnique({
      where: { id },
    })

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      })
      return
    }

    const totalSnippets = await prisma.snippet.count({
      where: { authorId: id, isPublic: true },
    })

    const snippets = await prisma.snippet.findMany({
      where: { authorId: id },
      select: {
        forksCount: true,
        likesCount: true,
        viewsCount: true,
        language: true,
      },
    })

    const totalForks = snippets.reduce((sum, s) => sum + s.forksCount, 0)
    const totalLikes = snippets.reduce((sum, s) => sum + s.likesCount, 0)
    const totalViews = snippets.reduce((sum, s) => sum + s.viewsCount, 0)

    const languageDistribution: { language: string; count: number }[] = []
    const languageMap = new Map<string, number>()

    snippets.forEach((s) => {
      const count = languageMap.get(s.language) || 0
      languageMap.set(s.language, count + 1)
    })

    languageMap.forEach((count, language) => {
      languageDistribution.push({ language, count })
    })

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const viewStats = await prisma.viewStat.findMany({
      where: {
        snippet: { authorId: id },
        viewDate: { gte: thirtyDaysAgo },
      },
      select: {
        viewDate: true,
        viewCount: true,
      },
    })

    const viewsByDayMap = new Map<string, number>()

    viewStats.forEach((vs) => {
      const dateKey = vs.viewDate.toISOString().split('T')[0]
      const count = viewsByDayMap.get(dateKey) || 0
      viewsByDayMap.set(dateKey, count + vs.viewCount)
    })

    const viewsByDay: { date: string; count: number }[] = []
    for (let i = 29; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateKey = date.toISOString().split('T')[0]
      viewsByDay.push({
        date: dateKey,
        count: viewsByDayMap.get(dateKey) || 0,
      })
    }

    const stats: UserStats = {
      totalSnippets,
      totalForks,
      totalLikes,
      totalViews,
      viewsByDay,
      languageDistribution,
    }

    res.status(200).json({
      success: true,
      data: stats,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user stats',
    })
  }
})

router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { username, avatar, bio } = req.body

    const user = await prisma.user.findUnique({
      where: { id },
    })

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      })
      return
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        username,
        avatar,
        bio,
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

    res.status(200).json({
      success: true,
      data: updatedUser,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update user',
    })
  }
})

export default router
