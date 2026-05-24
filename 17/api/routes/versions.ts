import { Router, type Request, type Response } from 'express'
import prisma from '../lib/prisma.js'
import type { SnippetVersion } from '@/shared/types'

const router = Router()

function incrementVersion(version: string, type: 'major' | 'minor' | 'patch' = 'patch'): string {
  const parts = version.split('.').map(Number)
  if (parts.length !== 3) return '1.0.0'

  if (type === 'major') {
    return `${parts[0] + 1}.0.0`
  } else if (type === 'minor') {
    return `${parts[0]}.${parts[1] + 1}.0`
  } else {
    return `${parts[0]}.${parts[1]}.${parts[2] + 1}`
  }
}

router.get('/snippet/:snippetId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { snippetId } = req.params

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

    const versions = await prisma.snippetVersion.findMany({
      where: { snippetId },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    res.status(200).json({
      success: true,
      data: versions,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch versions',
    })
  }
})

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const version = await prisma.snippetVersion.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
    })

    if (!version) {
      res.status(404).json({
        success: false,
        error: 'Version not found',
      })
      return
    }

    res.status(200).json({
      success: true,
      data: version,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch version',
    })
  }
})

router.post('/snippet/:snippetId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { snippetId } = req.params
    const { label, code, language, createdById, versionType = 'patch' } = req.body

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

    const lastVersion = await prisma.snippetVersion.findFirst({
      where: { snippetId },
      orderBy: { createdAt: 'desc' },
    })

    const newVersion = lastVersion
      ? incrementVersion(lastVersion.version, versionType)
      : '1.0.0'

    const version = await prisma.snippetVersion.create({
      data: {
        snippetId,
        version: newVersion,
        label: label || `Version ${newVersion}`,
        code: code || snippet.code,
        language: language || snippet.language,
        createdById,
      },
      include: {
        createdBy: {
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
      data: version,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to create version',
    })
  }
})

router.post('/:id/restore', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const version = await prisma.snippetVersion.findUnique({
      where: { id },
    })

    if (!version) {
      res.status(404).json({
        success: false,
        error: 'Version not found',
      })
      return
    }

    const snippet = await prisma.snippet.update({
      where: { id: version.snippetId },
      data: {
        code: version.code,
        language: version.language,
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

    const formattedSnippet = {
      ...snippet,
      tags: snippet.tags.map((st: any) => st.tag.name),
    }

    res.status(200).json({
      success: true,
      data: formattedSnippet,
      message: `Restored to version ${version.version}`,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to restore version',
    })
  }
})

router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const version = await prisma.snippetVersion.findUnique({
      where: { id },
    })

    if (!version) {
      res.status(404).json({
        success: false,
        error: 'Version not found',
      })
      return
    }

    const versionsCount = await prisma.snippetVersion.count({
      where: { snippetId: version.snippetId },
    })

    if (versionsCount <= 1) {
      res.status(400).json({
        success: false,
        error: 'Cannot delete the only version',
      })
      return
    }

    await prisma.snippetVersion.delete({ where: { id } })

    res.status(200).json({
      success: true,
      message: 'Version deleted successfully',
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to delete version',
    })
  }
})

export default router
