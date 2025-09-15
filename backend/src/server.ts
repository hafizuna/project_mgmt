import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { z } from 'zod'
import { healthRouter } from './routes/health.js'
import { authRouter } from './routes/auth.js'
import { usersRouter } from './routes/users.js'
import { organizationRouter } from './routes/organization.js'
import { auditLogsRouter } from './routes/auditLogs.js'
import { projectsRouter } from './routes/projects.js'
import { tasksRouter } from './routes/tasks.js'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().default('4000'),
  CORS_ORIGINS: z.string().optional(),
})

const parsed = envSchema.safeParse(process.env)
if (!parsed.success) {
  console.error('Invalid environment:', parsed.error.flatten())
  process.exit(1)
}
const ENV = parsed.data

const app = express()

app.use(helmet())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

const corsOrigins = (ENV.CORS_ORIGINS?.split(',') || ['*']).map(s => s.trim())
app.use(cors({ origin: corsOrigins, credentials: true }))
app.use(morgan(ENV.NODE_ENV === 'production' ? 'combined' : 'dev'))

// Routes
app.use('/api/health', healthRouter)
app.use('/api/auth', authRouter)
app.use('/api/users', usersRouter)
app.use('/api/organization', organizationRouter)
app.use('/api/audit-logs', auditLogsRouter)
app.use('/api/projects', projectsRouter)
app.use('/api', tasksRouter)

// Root
app.get('/api', (_req, res) => {
  res.json({ ok: true, service: 'collabsync backend', version: '0.1.0' })
})

const port = parseInt(ENV.PORT, 10)
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`)
})

