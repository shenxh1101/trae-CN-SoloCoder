/**
 * This is a API server
 */

import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import authRoutes from './routes/auth.js'
import snippetRoutes from './routes/snippets.js'
import versionRoutes from './routes/versions.js'
import commentRoutes from './routes/comments.js'
import socialRoutes from './routes/social.js'
import userRoutes from './routes/users.js'
import templateRoutes from './routes/templates.js'
import runRoutes from './routes/run.js'
import shareRoutes from './routes/share.js'

// for esm mode
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// load env
dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

/**
 * API Routes
 */
app.use('/api/auth', authRoutes)
app.use('/api/snippets', snippetRoutes)
app.use('/api/versions', versionRoutes)
app.use('/api/comments', commentRoutes)
app.use('/api/social', socialRoutes)
app.use('/api/users', userRoutes)
app.use('/api/templates', templateRoutes)
app.use('/api/run', runRoutes)
app.use('/api/share', shareRoutes)

/**
 * health
 */
app.use(
  '/api/health',
  (req: Request, res: Response, next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

/**
 * error handler middleware
 */
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({
    success: false,
    error: 'Server internal error',
  })
})

/**
 * 404 handler
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app
