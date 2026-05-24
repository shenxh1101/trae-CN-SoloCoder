import { Router, type Request, type Response } from 'express'
import prisma from '../lib/prisma.js'
import type { CodeTemplate, Language } from '@/shared/types'

const router = Router()

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { language, category, page = 1, limit = 50 } = req.query

    const pageNum = Number(page)
    const limitNum = Number(limit)
    const skip = (pageNum - 1) * limitNum

    const where: any = {}

    if (language) {
      where.language = language as Language
    }

    if (category) {
      where.category = category as string
    }

    const templates = await prisma.codeTemplate.findMany({
      where,
      orderBy: [
        { category: 'asc' },
        { name: 'asc' },
      ],
      skip,
      take: limitNum,
    })

    const total = await prisma.codeTemplate.count({ where })

    res.status(200).json({
      success: true,
      data: templates,
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
      error: 'Failed to fetch templates',
    })
  }
})

router.get('/categories', async (req: Request, res: Response): Promise<void> => {
  try {
    const { language } = req.query

    const where: any = {}

    if (language) {
      where.language = language as Language
    }

    const templates = await prisma.codeTemplate.findMany({
      where,
      select: { category: true },
      distinct: ['category'],
    })

    const categories = templates
      .map((t) => t.category)
      .filter((c): c is string => c !== null && c !== undefined)
      .sort()

    res.status(200).json({
      success: true,
      data: categories,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch categories',
    })
  }
})

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const template = await prisma.codeTemplate.findUnique({
      where: { id },
    })

    if (!template) {
      res.status(404).json({
        success: false,
        error: 'Template not found',
      })
      return
    }

    res.status(200).json({
      success: true,
      data: template,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch template',
    })
  }
})

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, code, language, category } = req.body

    if (!name || !code || !language) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields',
      })
      return
    }

    const template = await prisma.codeTemplate.create({
      data: {
        name,
        description,
        code,
        language,
        category,
      },
    })

    res.status(201).json({
      success: true,
      data: template,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to create template',
    })
  }
})

router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { name, description, code, language, category } = req.body

    const existingTemplate = await prisma.codeTemplate.findUnique({
      where: { id },
    })

    if (!existingTemplate) {
      res.status(404).json({
        success: false,
        error: 'Template not found',
      })
      return
    }

    const template = await prisma.codeTemplate.update({
      where: { id },
      data: {
        name,
        description,
        code,
        language,
        category,
      },
    })

    res.status(200).json({
      success: true,
      data: template,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update template',
    })
  }
})

router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const existingTemplate = await prisma.codeTemplate.findUnique({
      where: { id },
    })

    if (!existingTemplate) {
      res.status(404).json({
        success: false,
        error: 'Template not found',
      })
      return
    }

    await prisma.codeTemplate.delete({ where: { id } })

    res.status(200).json({
      success: true,
      message: 'Template deleted successfully',
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to delete template',
    })
  }
})

export default router
