import { Router, type Request, type Response } from 'express'
import { CodeRunnerService } from '../services/CodeRunnerService.js'
import { codeTemplates } from '../mocks/templates.js'
import type { RunRequest, RunResponse, CodeTemplate, Language } from '@/shared/types'

const router = Router()

const SUPPORTED_LANGUAGES: Language[] = ['javascript', 'python', 'go', 'rust']

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { language, code, stdin } = req.body as RunRequest

    if (!language || !code) {
      res.status(400).json({
        success: false,
        error: 'Language and code are required',
      })
      return
    }

    if (!SUPPORTED_LANGUAGES.includes(language)) {
      res.status(400).json({
        success: false,
        error: `Unsupported language: ${language}. Supported languages: ${SUPPORTED_LANGUAGES.join(', ')}`,
      })
      return
    }

    const result: RunResponse = await CodeRunnerService.run({
      language,
      code,
      stdin: stdin || '',
    })

    res.status(200).json({
      success: true,
      data: result,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to run code',
    })
  }
})

router.get('/templates', async (req: Request, res: Response): Promise<void> => {
  try {
    const { language } = req.query

    let templates = codeTemplates

    if (language && SUPPORTED_LANGUAGES.includes(language as Language)) {
      templates = codeTemplates.filter((t) => t.language === language)
    }

    const responseTemplates: CodeTemplate[] = templates.map((t, index) => ({
      id: t.id || `template-${index}`,
      language: t.language,
      name: t.name,
      description: t.description,
      code: t.code,
      category: t.category || 'general',
    }))

    res.status(200).json({
      success: true,
      data: responseTemplates,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch templates',
    })
  }
})

export default router
