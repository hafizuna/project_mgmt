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
import { taskCommentsRouter } from './routes/taskComments.js'
import { meetingsRouter } from './routes/meetings.js'
import { meetingAttendeesRouter } from './routes/meetingAttendees.js'
import { actionItemsRouter } from './routes/actionItems.js'

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

// CORS configuration - allow external access for testing
const corsOrigins = ENV.CORS_ORIGINS ? 
  ENV.CORS_ORIGINS.split(',').map(s => s.trim()) : 
  true // Allow all origins for development

app.use(cors({ 
  origin: corsOrigins, 
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}))
app.use(morgan(ENV.NODE_ENV === 'production' ? 'combined' : 'dev'))

// Routes
app.use('/api/health', healthRouter)
app.use('/api/auth', authRouter)
app.use('/api/users', usersRouter)
app.use('/api/organization', organizationRouter)
app.use('/api/audit-logs', auditLogsRouter)
app.use('/api/projects', projectsRouter)
app.use('/api', tasksRouter)
app.use('/api', taskCommentsRouter)
app.use('/api', meetingsRouter)
app.use('/api', meetingAttendeesRouter)
app.use('/api', actionItemsRouter)

// Root
app.get('/api', (_req, res) => {
  res.json({ ok: true, service: 'collabsync backend', version: '0.1.0' })
})

const port = parseInt(ENV.PORT, 10)

// Listen on all interfaces to allow external connections
app.listen(port, '0.0.0.0', () => {
  console.log(`API listening on http://0.0.0.0:${port}`)
  console.log(`External access: http://[YOUR_IP]:${port}`)
  console.log('For external testing, use your computer\'s IP address')
})

