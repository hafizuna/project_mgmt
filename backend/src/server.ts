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
import { dashboardRouter } from './routes/dashboard.js'
import weeklyReportsRouter from './routes/weeklyReports.js'
import notificationsRoutes from './routes/notifications.js'
import schedulerRoutes from './routes/scheduler.js'
import { knowledgeRouter } from './routes/knowledge.js'
import { TaskScheduler } from './services/TaskScheduler.js'

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

// CORS configuration
const corsOrigins = ENV.CORS_ORIGINS ? 
  ENV.CORS_ORIGINS.split(',').map(s => s.trim()) : 
  ['http://localhost:3000', 'http://localhost:5173']

app.use(cors({ 
  origin: corsOrigins, 
  credentials: true 
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
app.use('/api/dashboard', dashboardRouter)
app.use('/api/reports', weeklyReportsRouter)
app.use('/api/notifications', notificationsRoutes)
app.use('/api/scheduler', schedulerRoutes)
app.use('/api/knowledge', knowledgeRouter)

// Root
app.get('/api', (_req, res) => {
  res.json({ ok: true, service: 'collabsync backend', version: '0.1.0' })
})

const port = parseInt(ENV.PORT, 10)

app.listen(port, async () => {
  console.log(`API listening on http://localhost:${port}`)
  
  // Initialize task scheduler for report notifications
  try {
    const taskScheduler = TaskScheduler.getInstance()
    
    // Initialize report settings for all organizations
    await taskScheduler.initializeAllReportSettings()
    
    // Start scheduled tasks
    taskScheduler.initialize()
    
    console.log('📋 Task scheduler initialized successfully')
  } catch (error) {
    console.error('❌ Failed to initialize task scheduler:', error)
  }
})

