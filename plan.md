# ICos PgMgmt - Project Management & Team Collaboration Platform

## Overview
A comprehensive project management and team collaboration platform built with a React (Vite) frontend and a Node.js backend, designed for deployment on a single Ubuntu server without external services like S3 or Redis.

## Tech Stack

### Frontend
- **Framework**: React 18 + Vite
- **Language**: TypeScript
- **Routing**: React Router v6
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**:
  - Server state: TanStack Query (React Query)
  - Client/UI state: Zustand (for UI state)
- **Forms & Validation**: React Hook Form + Zod
- **Authentication**: JWT-based auth (HTTP-only cookies or Authorization header) with role-aware route guards
- **Real-time**: Socket.IO client
- **Charts**: Recharts
- **Calendar**: react-big-calendar or FullCalendar
- **File Upload**: react-dropzone

### Backend
- **Framework**: NestJS with TypeScript
- **Database**: PostgreSQL 15+
- **ORM**: Prisma
- **Authentication**: JWT (access + refresh tokens)
- **File Storage**: Local filesystem
- **Background Jobs**: pg-boss (PostgreSQL-based queue)
- **Real-time**: Socket.IO
- **Email**: Nodemailer (SMTP)
- **Validation**: class-validator + class-transformer
- **API Documentation**: Swagger/OpenAPI

### Infrastructure (Ubuntu Server)
- **Web Server**: Nginx (reverse proxy + static files)
- **Process Manager**: systemd services
- **File Storage**: Local disk (`/var/collabsync/uploads`)
- **Backup**: pg_dump + cron
- **Logging**: systemd journal + rotating logs
- **Security**: UFW firewall + fail2ban

## Role-Based Access Control (RBAC)

### Admin
- **Full System Access**: Complete control over all organizational data
- **User Management**: Create, update, deactivate users; assign roles
- **Organization Settings**: Configure system settings, integrations, security
- **Project Oversight**: Access to all projects across the organization
- **Reporting Access**: All reports, analytics, and audit logs
- **System Administration**: Backup management, system health monitoring

### Manager
- **Project Management**: Create, manage, and oversee assigned projects
- **Team Leadership**: Manage team members within their projects
- **Resource Allocation**: Assign tasks, manage workloads, approve timesheets
- **Project Reporting**: Access to project-specific reports and analytics
- **Meeting Management**: Schedule and manage team meetings
- **Budget Oversight**: View project budgets and resource utilization

### Team
- **Task Execution**: View and update assigned tasks
- **Project Participation**: Update project statuses for projects they are members of (not view-only)
- **Time Tracking**: Log hours and submit timesheets
- **Collaboration**: Participate in discussions, meetings, and project activities
- **File Access**: Upload/download project-related files
- **Personal Dashboard**: View personal tasks, schedule, and notifications
- **Limited Reporting**: Access to personal productivity reports

## Core Features & Functionalities

### 1. Authentication & Authorization
- **User Registration/Login**: Email/password authentication
- **Role-Based Access Control**: Admin/Manager/Team permissions
- **JWT Token Management**: Access + refresh token rotation
- **Session Management**: Device tracking and session invalidation
- **Password Security**: bcrypt hashing, password complexity requirements
- **Account Recovery**: Password reset via email

### 2. Organization Management
- **Multi-tenant Architecture**: Support for multiple organizations
- **Organization Settings**: Branding, preferences, integrations (Admin only)
- **User Management**: Invite users, role assignment, deactivation (Admin/Manager)
- **Audit Logging**: Track sensitive actions and changes (Admin only)

### 3. Project Management
- **Project CRUD**: Create, read, update, delete projects
  - Admin: All projects (full control)
  - Manager: Owned/assigned projects (create/update/delete where owner/manager)
  - Team: Assigned projects (can update project status and contribute to tasks; limited edit rights)
- **Project Templates**: Predefined project structures (Admin/Manager)
- **Project Members**: Role-based access per project
- **Project Settings**: Custom fields, statuses, priorities (Manager+)
- **Project Dashboard**: Overview, progress, key metrics
- **Project Categories/Tags**: Organizational structure

### 4. Task Management
- **Task CRUD**: Full task lifecycle management
- **Task Properties**:
  - Title, description, status, priority, labels
  - Assignee, reporter, due date, estimated hours
  - Dependencies, subtasks, attachments
- **Task Board Views**:
  - Kanban Board: Drag & drop task management
  - List View: Tabular task display with sorting/filtering
  - Calendar View: Tasks by due date
- **Task Comments**: Threaded discussions with mentions
- **Task History**: Activity timeline and change tracking
- **Bulk Operations**: Multi-select task actions (Manager+)

### 5. Sprint/Iteration Management
- **Sprint Planning**: Create sprints with goals and capacity (Manager+)
- **Sprint Board**: Dedicated Kanban for sprint tasks
- **Sprint Reports**: Burndown charts, velocity tracking (Manager+)
- **Sprint Retrospectives**: Notes and improvement actions (Manager+)

### 6. Team Collaboration
- **@Mentions**: Notify team members in comments/tasks
- **Activity Feeds**: Real-time updates on projects/tasks
- **Team Directory**: Member profiles, skills, availability
- **Direct Messages**: Basic internal messaging
- **Notifications**:
  - In-app notifications with real-time updates
  - Email notifications (configurable per user)
  - Push notifications (web push API)

### 7. Meeting Management
- **Meeting Scheduling**: Create meetings with date/time
- **Attendee Management**: Required/optional attendees
- **Meeting Agenda**: Structured agenda items
- **Meeting Notes**: Collaborative note-taking during meetings
- **Action Items**: Convert notes to tasks with assignments
- **Calendar Integration**: ICS export for external calendars
- **Meeting History**: Past meeting records and outcomes
- **Access Control**:
  - Admin: All meetings
  - Manager: Project/team meetings
  - Team: Assigned meetings

### 8. Time Tracking & Timesheets
- **Time Entry**: Manual time logging against tasks
- **Timer Functionality**: Start/stop timers for active work
- **Timesheet Views**: Daily, weekly, monthly summaries
- **Time Approval Workflow**: Manager approval of submitted hours
- **Time Reports**: Detailed time analysis (Manager+)
- **Access Control**:
  - Admin: All time data
  - Manager: Team time data
  - Team: Personal time data only

### 9. Reporting & Analytics
- **Dashboard Widgets**: Customizable project/team dashboards
- **Project Health Reports**: Progress, blockers, risks (Manager+)
- **Team Performance Reports** (Manager+):
  - Workload distribution
  - Velocity tracking
  - Task completion rates
  - Time utilization
- **Burndown Charts**: Sprint and project progress
- **Custom Reports**: Flexible report builder (Admin only)
- **Export Capabilities**: PDF, CSV, Excel formats
- **Access Control**:
  - Admin: All organizational reports
  - Manager: Project/team reports
  - Team: Personal productivity reports

### 10. File Management
- **File Attachments**: Upload to tasks, comments, projects
- **File Organization**: Folder structure per project
- **File Versioning**: Track file changes over time
- **Access Control**: File permissions based on project access
- **File Preview**: Basic preview for common formats
- **Download Tracking**: Audit file access (Admin/Manager)

### 11. Search & Filtering
- **Global Search**: Search across accessible tasks, projects, comments
- **Advanced Filters**: Multi-criteria filtering
- **Saved Searches**: Bookmark common search queries
- **Search Suggestions**: Auto-complete and suggestions
- **Access Control**: Search results filtered by user permissions

### 12. Admin Panel (Admin Only)
- **User Management**: Create, update, delete users
- **Role Assignment**: Change user roles
- **System Settings**: Configure application settings
- **Audit Logs**: View all system activities
- **Backup Management**: Database backup controls
- **System Health**: Monitor application performance

## Data Model

### Core Entities

```sql
-- Organization (Multi-tenant support)
Organization {
  id: UUID
  name: String
  slug: String (unique)
  settings: JSON
  createdAt: DateTime
  updatedAt: DateTime
}

-- User Management with simplified roles
User {
  id: UUID
  orgId: UUID (FK)
  email: String (unique)
  name: String
  avatar: String?
  role: Enum (Admin, Manager, Team)
  isActive: Boolean
  lastLoginAt: DateTime?
  createdAt: DateTime
  updatedAt: DateTime
}

UserSession {
  id: UUID
  userId: UUID (FK)
  refreshToken: String
  deviceInfo: JSON
  expiresAt: DateTime
  createdAt: DateTime
}

-- Project Structure (Enhanced)
Project {
  id: UUID
  orgId: UUID (FK)
  ownerId: UUID (FK User) -- Must be Admin or Manager
  name: String
  description: String?
  startDate: DateTime? -- Enhanced with time support
  dueDate: DateTime?   -- Enhanced with time support (renamed from endDate)
  status: Enum (Active, Completed, Archived, OnHold) -- Enhanced with OnHold
  budget: Float? -- NEW: Budget tracking with currency support
  priority: Enum (Low, Medium, High, Critical) -- NEW: Project priority levels
  settings: JSON -- Flexible project configuration
  createdAt: DateTime
  updatedAt: DateTime
}

ProjectMember {
  id: UUID
  projectId: UUID (FK)
  userId: UUID (FK)
  role: Enum (Owner, Manager, Member) -- Project-level roles
  joinedAt: DateTime
  -- CONSTRAINT: Unique combination of projectId + userId
}

-- Sprint Management
Sprint {
  id: UUID
  projectId: UUID (FK)
  name: String
  goal: String?
  startDate: Date
  endDate: Date
  status: Enum (Planning, Active, Completed)
  createdBy: UUID (FK User) -- Must be Manager+
  createdAt: DateTime
  updatedAt: DateTime
}

-- Task Management (Enhanced)
Task {
  id: UUID
  projectId: UUID (FK)
  title: String
  description: String?
  status: Enum (Todo, InProgress, Review, Done)
  priority: Enum (Low, Medium, High, Critical)
  assigneeId: UUID? (FK User) -- Must be project member
  reporterId: UUID (FK User) -- Task creator
  estimate: Float? -- Estimated hours (renamed from estimatedHours)
  dueDate: DateTime?
  labels: String[] -- Array of task tags/labels
  position: Int? -- Task ordering within projects
  createdAt: DateTime
  updatedAt: DateTime
  -- NOTE: sprintId removed (will be added in Phase 5)
  -- NOTE: parentTaskId removed (subtasks will be separate feature)
}

TaskComment {
  id: UUID
  taskId: UUID (FK) -- Cascade delete when task removed
  authorId: UUID (FK User) -- Comment author
  content: String -- Rich text content
  parentId: UUID? (FK TaskComment) -- For threaded replies
  createdAt: DateTime
  updatedAt: DateTime
  -- NOTE: mentions field removed (will be enhanced later)
}

TaskHistory {
  id: UUID
  taskId: UUID (FK) -- Cascade delete when task removed
  userId: UUID (FK User) -- User who made the change
  action: Enum (CREATED, UPDATED, STATUS_CHANGED, ASSIGNED, UNASSIGNED, COMMENT_ADDED, DUE_DATE_CHANGED, PRIORITY_CHANGED, DESCRIPTION_CHANGED, TITLE_CHANGED)
  field: String? -- Which field was changed
  oldValue: String? -- Previous value (JSON serialized)
  newValue: String? -- New value (JSON serialized)
  description: String -- Human-readable change description
  createdAt: DateTime
  -- NOTE: Separate from audit logs (user-focused vs compliance-focused)
}

-- NOTE: TaskAttachment model not yet implemented (will be added with file upload functionality)

-- Meeting Management
Meeting {
  id: UUID
  projectId: UUID? (FK)
  orgId: UUID (FK)
  title: String
  description: String?
  startTime: DateTime
  endTime: DateTime
  location: String?
  meetingLink: String?
  agenda: JSON
  notes: String?
  createdById: UUID (FK User) -- Must be Manager+
  createdAt: DateTime
  updatedAt: DateTime
}

MeetingAttendee {
  id: UUID
  meetingId: UUID (FK)
  userId: UUID (FK)
  isRequired: Boolean
  status: Enum (Pending, Accepted, Declined)
  respondedAt: DateTime?
}

MeetingActionItem {
  id: UUID
  meetingId: UUID (FK)
  taskId: UUID? (FK Task)
  description: String
  assigneeId: UUID? (FK User)
  dueDate: Date?
  status: Enum (Open, InProgress, Completed)
  createdAt: DateTime
}

-- Time Tracking
TimeEntry {
  id: UUID
  taskId: UUID? (FK)
  projectId: UUID (FK)
  userId: UUID (FK)
  date: Date
  startTime: DateTime?
  endTime: DateTime?
  hours: Float
  description: String?
  isApproved: Boolean
  approvedBy: UUID? (FK User) -- Must be Manager+
  approvedAt: DateTime?
  createdAt: DateTime
  updatedAt: DateTime
}

-- Notifications
Notification {
  id: UUID
  userId: UUID (FK)
  type: String
  title: String
  message: String
  data: JSON
  readAt: DateTime?
  createdAt: DateTime
}

-- Audit & Reporting
AuditLog {
  id: UUID
  orgId: UUID (FK)
  userId: UUID (FK)
  action: String
  entityType: String
  entityId: UUID
  metadata: JSON
  ipAddress: String?
  userAgent: String?
  createdAt: DateTime
}

ReportSnapshot {
  id: UUID
  orgId: UUID (FK)
  type: String
  parameters: JSON
  data: JSON
  generatedAt: DateTime
  expiresAt: DateTime?
}
```

## API Design with Role-Based Access

### Authentication Endpoints
```
POST /auth/register        - User registration (Admin only for invites)
POST /auth/login           - User login
POST /auth/refresh         - Refresh access token
POST /auth/logout          - User logout
POST /auth/forgot-password - Password reset request
POST /auth/reset-password  - Password reset confirmation
GET  /auth/me              - Get current user info
PUT  /auth/me              - Update current user profile
```

### User Management
```
GET    /users              - List users (Admin: all, Manager: project members, Team: limited)
POST   /users              - Create user (Admin only)
GET    /users/:id          - Get user details (role-based visibility)
PUT    /users/:id          - Update user (Admin: all, Manager: project members, Self only)
DELETE /users/:id          - Deactivate user (Admin only)
PUT    /users/:id/role     - Change user role (Admin only)
```

### Project Management
```
GET    /projects           - List projects (role-based filtering)
POST   /projects           - Create project (Manager+ only)
GET    /projects/:id       - Get project details (access-controlled)
PUT    /projects/:id       - Update project (Owner/Manager+; Team may update status if member)
DELETE /projects/:id       - Delete project (Admin/Owner only)
GET    /projects/:id/members - Get project members
POST   /projects/:id/members - Add project member (Manager+ only)
PUT    /projects/:id/members/:userId - Update member role (Manager+ only)
DELETE /projects/:id/members/:userId - Remove member (Manager+ only)
```

### Task Management
```
GET    /projects/:id/tasks - List project tasks (access-controlled)
POST   /projects/:id/tasks - Create task (Manager+ or assigned members)
GET    /tasks/:id          - Get task details (access-controlled)
PUT    /tasks/:id          - Update task (assignee/reporter/Manager+)
DELETE /tasks/:id          - Delete task (Manager+ only)
POST   /tasks/:id/comments - Add comment (project members)
GET    /tasks/:id/comments - Get task comments (access-controlled)
POST   /tasks/:id/attachments - Upload attachment (project members)
GET    /tasks/:id/attachments - List attachments (access-controlled)
DELETE /attachments/:id    - Delete attachment (uploader/Manager+)
GET    /tasks/:id/history  - Get task history (Manager+)
```

### Meeting Management
```
GET    /meetings            - List meetings (access-controlled)
POST   /meetings            - Create meeting (Manager+ only)
GET    /meetings/:id        - Get meeting details (attendees/Manager+)
PUT    /meetings/:id        - Update meeting (creator/Manager+)
DELETE /meetings/:id        - Delete meeting (creator/Admin)
POST   /meetings/:id/attendees - Add attendee (creator/Manager+)
DELETE /meetings/:id/attendees/:userId - Remove attendee (creator/Manager+)
GET    /meetings/:id/ics    - Export to calendar (attendees)
```

### Time Tracking
```
GET    /timesheet           - Get timesheet (role-based scope)
POST   /timesheet/entries   - Log time entry (Team+)
PUT    /timesheet/entries/:id - Update time entry (owner/Manager+)
DELETE /timesheet/entries/:id - Delete time entry (owner/Manager+)
POST   /timesheet/submit    - Submit timesheet for approval (Team)
POST   /timesheet/approve   - Approve timesheet (Manager+)
GET    /timesheet/reports   - Time reports (Manager+)
```

### Reporting (Role-based access)
```
GET    /reports/dashboard   - Dashboard metrics (role-filtered)
GET    /reports/workload    - Team workload report (Manager+)
GET    /reports/velocity    - Sprint velocity report (Manager+)
GET    /reports/burndown    - Sprint burndown data (Manager+)
GET    /reports/time        - Time tracking reports (Manager+)
GET    /reports/audit       - Audit reports (Admin only)
POST   /reports/export      - Export report data (Manager+)
```

### Admin Panel (Admin Only)
```
GET    /admin/users         - Admin user management
GET    /admin/system        - System health and settings
GET    /admin/audit         - Full audit logs
GET    /admin/backups       - Backup management
POST   /admin/backup        - Create backup
```

## Frontend Architecture (React + Vite)

### Directory Structure
```
src/
├── pages/                 # Route components for React Router (e.g., Projects, Tasks)
│   ├── Admin/            # Admin-only pages (Users, System, Audit)
│   ├── Projects/
│   │   ├── ProjectDetail.tsx
│   │   └── ProjectsList.tsx
│   ├── Tasks/
│   ├── Meetings/
│   ├── Reports/
│   ├── Timesheet/
│   ├── Team/
│   ├── Auth/
│   │   ├── Login.tsx
│   │   └── Register.tsx (optional if invite-based)
│   └── Dashboard.tsx
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── admin/             # Admin-specific components
│   ├── dashboard/         # Dashboard-specific components
│   ├── projects/          # Project-related components
│   ├── tasks/             # Task management components
│   ├── meetings/          # Meeting components
│   ├── common/            # Shared components
│   └── layout/            # Layout components (Sidebar, Header)
├── lib/
│   ├── api/               # API client and types (axios/fetch wrappers)
│   ├── auth/              # Auth utilities (token handling, guards)
│   ├── hooks/             # Custom React hooks
│   ├── stores/            # Zustand stores
│   ├── utils/             # Utility functions
│   └── validations/       # Zod schemas
├── types/                 # TypeScript types
├── styles/                # Global styles and Tailwind config
└── main.tsx               # App bootstrap with Router and QueryClient
```

### Role-Based Component Protection

#### Route Protection
```typescript
// lib/auth/permissions.ts
export const PERMISSIONS = {
  ADMIN: {
    users: ['create', 'read', 'update', 'delete'],
    projects: ['create', 'read', 'update', 'delete'],
    reports: ['create', 'read', 'update', 'delete'],
    system: ['read', 'update'],
    audit: ['read']
  },
  MANAGER: {
    users: ['read'],
    projects: ['create', 'read', 'update'],
    tasks: ['create', 'read', 'update', 'delete'],
    reports: ['read', 'create'],
    meetings: ['create', 'read', 'update', 'delete']
  },
  TEAM: {
    tasks: ['read', 'update'],
    projects: ['read'],
    timesheet: ['create', 'read', 'update']
  }
}

// components/auth/RoleGuard.tsx
export function RoleGuard({ 
  roles, 
  children, 
  fallback 
}: {
  roles: ('Admin' | 'Manager' | 'Team')[]
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  const { user } = useAuth()
  
  if (!user || !roles.includes(user.role)) {
    return fallback || null
  }
  
  return <>{children}</>
}
```

#### Component Usage
```typescript
// Usage in components
<RoleGuard roles={['Admin', 'Manager']}>
  <Button onClick={handleDeleteProject}>Delete Project</Button>
</RoleGuard>

<RoleGuard roles={['Admin']}>
  <AdminPanel />
</RoleGuard>
```

### Key Components

#### Authentication
- `LoginForm` - User login interface
- `RegisterForm` - User registration (Admin invite only)
- `ProtectedRoute` - Route protection wrapper
- `RoleGuard` - Role-based component access

#### Admin Components (Admin Only)
- `UserManagement` - Create, edit, delete users
- `SystemSettings` - Application configuration
- `AuditLog` - System audit trail
- `BackupManagement` - Database backup controls

#### Project Management
- `ProjectBoard` - Kanban board interface
- `ProjectList` - List view of projects
- `ProjectCard` - Individual project display
- `ProjectForm` - Create/edit project form (Manager+)
- `ProjectMembers` - Member management interface (Manager+)

#### Task Management
- `TaskCard` - Individual task display
- `TaskDetail` - Task detail modal/drawer
- `TaskForm` - Create/edit task form
- `TaskBoard` - Drag & drop Kanban board
- `TaskList` - Tabular task view
- `CommentSection` - Task comments and discussions

#### Meeting Management (Manager+)
- `MeetingCalendar` - Calendar view of meetings
- `MeetingForm` - Create/edit meeting form
- `MeetingDetail` - Meeting details and notes
- `AttendeeList` - Meeting attendee management

#### Reporting (Role-based)
- `DashboardWidget` - Customizable dashboard widgets
- `ReportChart` - Chart components for reports
- `ReportFilters` - Report filtering interface
- `ExportButton` - Report export functionality

## Backend Architecture (NestJS)

### Module Structure
```
src/
├── auth/                  # Authentication module
│   ├── guards/           # JWT, Role guards
│   ├── strategies/       # JWT strategy
│   ├── decorators/       # Role decorators
│   └── auth.service.ts
├── users/                # User management
├── admin/                # Admin-only functionality
├── organizations/        # Organization management
├── projects/            # Project management
├── tasks/               # Task management
├── sprints/             # Sprint management
├── meetings/            # Meeting management
├── timesheet/           # Time tracking
├── notifications/       # Notification system
├── files/               # File upload/download
├── reports/             # Reporting module
├── search/              # Search functionality
├── common/              # Shared utilities
│   ├── decorators/      # Custom decorators
│   ├── filters/         # Exception filters
│   ├── guards/          # Custom guards
│   ├── interceptors/    # Response interceptors
│   └── pipes/           # Validation pipes
├── database/            # Database configuration
└── main.ts
```

### Role-Based Access Control Implementation

#### Role Guard
```typescript
// auth/guards/roles.guard.ts
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ])
    
    if (!requiredRoles) {
      return true
    }

    const { user } = context.switchToHttp().getRequest()
    return requiredRoles.some((role) => user.role === role)
  }
}

// auth/decorators/roles.decorator.ts
export const Roles = (...roles: Role[]) => SetMetadata('roles', roles)
```

#### Controller Example
```typescript
// projects/projects.controller.ts
@Controller('projects')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProjectsController {
  
  @Get()
  @Roles('Admin', 'Manager', 'Team')
  async getProjects(@Request() req) {
    // Filter projects based on user role
    return this.projectsService.findAllForUser(req.user)
  }

  @Post()
  @Roles('Admin', 'Manager')
  async createProject(@Body() createProjectDto: CreateProjectDto) {
    return this.projectsService.create(createProjectDto)
  }

  @Delete(':id')
  @Roles('Admin')
  async deleteProject(@Param('id') id: string) {
    return this.projectsService.remove(id)
  }
}
```

### Service Layer Role Filtering

```typescript
// projects/projects.service.ts
@Injectable()
export class ProjectsService {
  
  async findAllForUser(user: User): Promise<Project[]> {
    switch (user.role) {
      case 'Admin':
        return this.prisma.project.findMany({
          where: { orgId: user.orgId }
        })
      
      case 'Manager':
        return this.prisma.project.findMany({
          where: {
            orgId: user.orgId,
            OR: [
              { ownerId: user.id },
              { members: { some: { userId: user.id } } }
            ]
          }
        })
      
      case 'Team':
        return this.prisma.project.findMany({
          where: {
            orgId: user.orgId,
            members: { some: { userId: user.id } }
          }
        })
    }
  }
}
```

## Deployment Architecture

### Server Setup (Ubuntu)

#### 1. System Preparation
```bash
# Create application user
sudo adduser --system --group --home /srv/collabsync collabsync

# Create directories
sudo mkdir -p /srv/collabsync/{api,web,logs}
sudo mkdir -p /var/collabsync/uploads
sudo mkdir -p /var/log/collabsync
sudo mkdir -p /var/backups/collabsync

# Set permissions
sudo chown -R collabsync:collabsync /srv/collabsync /var/collabsync /var/log/collabsync
```

#### 2. PostgreSQL Setup
```bash
# Install PostgreSQL
sudo apt update && sudo apt install postgresql postgresql-contrib

# Create database and user
sudo -u postgres createuser -P collabsync
sudo -u postgres createdb -O collabsync collabsync_prod

# Configure pg_hba.conf for local connections
```

#### 3. Node.js Setup
```bash
# Install Node.js 18+ via NodeSource
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally (alternative to systemd)
sudo npm install -g pm2
```

#### 4. Nginx Configuration
```nginx
server {
    listen 80;
    server_name collabsync.company.local;
    client_max_body_size 50M;

    # Frontend (Vite SPA build)
    root /srv/collabsync/web;
    index index.html;

    # SPA routing: always fall back to index.html
    location / {
        try_files $uri /index.html;
    }

    # Protected file serving
    location /protected/ {
        internal;
        alias /var/collabsync/uploads/;
        expires 1h;
        add_header Cache-Control "private, no-transform";
    }

    # API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:4000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Socket.IO
    location /socket.io/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### 5. Environment Configuration

**Backend** (`.env`):
```env
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://collabsync:{{DB_PASSWORD}}@localhost:5432/collabsync_prod
JWT_SECRET={{JWT_SECRET}}
JWT_REFRESH_SECRET={{JWT_REFRESH_SECRET}}
FILE_UPLOAD_DIR=/var/collabsync/uploads
MAX_FILE_SIZE=52428800
ALLOWED_FILE_TYPES=pdf,doc,docx,xls,xlsx,ppt,pptx,jpg,jpeg,png,gif
CORS_ORIGINS=https://collabsync.company.local
APP_BASE_URL=https://collabsync.company.local
SMTP_HOST={{SMTP_HOST}}
SMTP_PORT={{SMTP_PORT}}
SMTP_USER={{SMTP_USER}}
SMTP_PASS={{SMTP_PASS}}
SMTP_FROM=noreply@company.local
```

**Frontend** (`.env`):
```env
VITE_API_URL=https://collabsync.company.local/api
VITE_WS_URL=https://collabsync.company.local
```

## Security Considerations

### Role-Based Security
- **Route Protection**: All routes protected by role-based middleware
- **Component Security**: UI elements hidden/shown based on user roles
- **API Security**: Endpoint access controlled by role guards
- **Data Filtering**: Database queries filtered by user permissions

### Application Security
- **Input Validation**: All inputs validated with Zod schemas
- **SQL Injection Prevention**: Prisma ORM with parameterized queries
- **XSS Prevention**: Output encoding, Content Security Policy
- **CSRF Protection**: CSRF tokens for state-changing operations
- **Authentication**: Secure JWT implementation with refresh tokens
- **File Upload Security**: Type validation, size limits, virus scanning
- **Rate Limiting**: API endpoint protection

## Phase-wise Development Plan

### ✅ Phase 1: Foundation & Authentication (Weeks 1-2) - COMPLETED
- [x] Project setup (React (Vite) frontend, Node.js/Express backend)
- [x] Database schema design and Prisma setup
- [x] Authentication system with JWT (access + refresh tokens)
- [x] Role-based access control implementation (Admin/Manager/Team)
- [x] Basic UI framework with shadcn/ui components and Tailwind CSS
- [x] User registration/login with secure authentication flow
- [x] Protected routes with role-based access guards
- [x] Zustand state management for authentication

**Completed Features:**
- JWT-based authentication with automatic token refresh
- Role-based route protection (Admin, Manager, Team)
- Login/logout functionality with proper session management
- Secure password hashing with bcrypt
- Database seed script with default admin user and organization
- Environment-based configuration

### ✅ Phase 2: User & Organization Management (Weeks 3-4) - COMPLETED
- [x] Admin panel for user management with CRUD operations
- [x] Organization settings and configuration management
- [x] Role assignment and management (Admin only)
- [x] User dashboard with role-based navigation
- [x] Comprehensive audit logging system
- [x] User status management (active/inactive)
- [x] Organization settings with JSON configuration storage

**Completed Features:**
- **User Management**: Complete admin interface for user CRUD operations
  - Create new users with role assignment
  - Update user details and roles
  - Activate/deactivate users
  - Role-based user filtering and pagination
  - User search functionality
- **Organization Settings**: Admin interface for organizational configuration
  - Organization profile management
  - System preferences and settings
  - Usage statistics tracking
- **Audit Logging**: Comprehensive activity tracking
  - User action logging (login, logout, CRUD operations)
  - Role change tracking
  - Status change monitoring
  - Filterable audit trail with pagination
  - Admin-only audit log access
- **API Client Architecture**: Clean API client structure with proper error handling
- **Fixed Issues**: Resolved audit logs display and user listing functionality

### ✅ Phase 3: Project Management (Weeks 5-6) - COMPLETED
- [x] Project CRUD operations (Manager+)
- [x] Project member management
- [x] Role-based project access control
- [ ] File upload functionality
- [x] Project dashboard and overview

**Completed Features:**
- **Project CRUD Operations**: Complete project management interface
  - Create projects (Manager+ only) with comprehensive form validation
  - Read/view projects with role-based filtering (Admin: all projects, Manager: owned/assigned projects, Team: assigned projects)
  - Update projects with role-based permissions (owners/managers can edit, team members can update status if project member)
  - Delete projects (Admin/Project owners only)
  - Advanced project filtering and search functionality
- **Project Member Management**: Full team collaboration features
  - Add project members with role assignment (Owner/Manager/Member)
  - Update member roles (Project managers+ only)
  - Remove project members (Project managers+ only)
  - Real-time member list updates
  - Role-based member visibility and management
- **Role-Based Access Control**: Comprehensive permission system
  - Project-level access controls integrated with user roles
  - Admin: Full access to all organizational projects
  - Manager: Access to owned/assigned projects with full management rights
  - Team: Access to assigned projects with contribution rights (can update project status, participate in tasks)
  - Dynamic UI components that show/hide based on user permissions
- **Project Dashboard**: Rich project overview interface
  - Project details view with comprehensive information display
  - Project member management interface
  - Task integration showing project tasks in project detail view
  - Project statistics and progress tracking
  - Role-based action buttons and management interface

**Database Schema Enhancements:**
- Added Meeting-specific fields and models for robust meeting management:
  - Meeting: `type`, `location`, `meetingLink`, `videoRoom`, `status`, `actualStartTime`, `actualEndTime`, `recording`, `agenda`, `notes`
  - MeetingAttendee: attendance tracking with `isRequired`, `status`, `respondedAt`, `actuallyAttended`
  - MeetingActionItem: actionable follow-ups with optional `taskId` linking and status lifecycle
- New enums: `MeetingType`, `MeetingStatus`, `AttendeeStatus`, `ActionItemStatus`
- Backend API updated to auto-generate `videoRoom` for online/hybrid meetings and update `status` lifecycle
- **Project Model Enhanced Fields**:
  - `budget: Float?` - Project budget tracking with currency formatting
  - `priority: ProjectPriority` - Project priority levels (Low, Medium, High, Critical)
  - `status: ProjectStatus` - Enhanced project status (Active, Completed, Archived, OnHold)
  - `startDate: DateTime?` - Project start date with calendar integration
  - `dueDate: DateTime?` - Project due date with deadline tracking
  - `settings: Json?` - Flexible project-specific configuration storage
- **ProjectMember Model**:
  - Enhanced role system with `ProjectMemberRole` enum (Owner, Manager, Member)
  - `joinedAt: DateTime` - Member joining timestamp tracking
  - Unique constraint on `[projectId, userId]` to prevent duplicate memberships
- **New Enums Added**:
  - `ProjectStatus`: Active, Completed, Archived, OnHold
  - `ProjectPriority`: Low, Medium, High, Critical
  - `ProjectMemberRole`: Owner, Manager, Member

**API Endpoints Implemented**:
- `GET /api/projects` - List projects with role-based filtering
- `POST /api/projects` - Create project (Manager+ only)
- `GET /api/projects/:id` - Get project details with access control
- `PUT /api/projects/:id` - Update project with role-based permissions
- `DELETE /api/projects/:id` - Delete project (Admin/Owner only)
- `GET /api/projects/:id/members` - Get project members
- `POST /api/projects/:id/members` - Add project member (Manager+ only)
- `PUT /api/projects/:id/members/:userId` - Update member role (Manager+ only)
- `DELETE /api/projects/:id/members/:userId` - Remove member (Manager+ only)

### ✅ Phase 4: Task Management (Weeks 7-8) - COMPLETED
- [x] Task CRUD with role-based permissions
- [ ] Kanban board implementation
- [x] Task comments and mentions
- [x] Task history and activity feeds
- [x] Basic task filtering and search

**Completed Features:**
- **Task CRUD Operations**: Complete task lifecycle management
  - Create tasks within projects (Project members with write access)
  - Read/view tasks with comprehensive detail view including assignee, reporter, project context
  - Update tasks with granular field-level permissions (assignee/reporter/managers can edit)
  - Delete tasks (Manager+ only)
  - Task assignment/unassignment with project member validation
  - Status updates with real-time UI feedback
- **Task Comments System**: Full threaded discussion capability
  - Add comments to tasks with rich text support
  - Threaded replies (2 levels deep) for organized discussions
  - Edit/delete own comments with proper permissions
  - Real-time comment updates with optimistic UI
  - User avatars and timestamps for all comments
  - @mentions capability ready (backend support implemented)
- **Task History & Activity Timeline**: Comprehensive change tracking
  - Automatic activity logging for all task changes (separate from audit logs)
  - Human-readable activity descriptions with before/after values
  - Chronological timeline grouped by date
  - Visual activity indicators with color-coded icons
  - Field-level change tracking (status, assignee, priority, due date, etc.)
  - User attribution for all changes
- **Task Management Features**:
  - Advanced task filtering and search within projects
  - Task assignment to project members with validation
  - Priority levels (Low, Medium, High, Critical) with visual indicators
  - Due date management with calendar integration
  - Task labels/tags system for organization
  - Estimated hours tracking for project planning
  - Task position/ordering for custom organization
- **Project Integration**: Seamless task-project relationship
  - Tasks displayed within project detail pages
  - Project-based task filtering and navigation
  - Task creation pre-populated with project context
  - Project member validation for task assignments

**Database Schema Enhancements:**
- **Task Model Enhanced Fields**:
  - `estimate: Float?` - Estimated hours for task completion
  - `dueDate: DateTime?` - Task deadline with calendar integration
  - `labels: String[]` - Array of task tags/labels for organization
  - `position: Int?` - Task ordering within projects
  - `priority: TaskPriority` - Task priority levels (Low, Medium, High, Critical)
  - `status: TaskStatus` - Task status (Todo, InProgress, Review, Done)
- **TaskComment Model** (New): Threaded comments system
  - `content: String` - Comment content with rich text support
  - `parentId: String?` - Parent comment ID for threading
  - `authorId: String` - Comment author with user relationship
  - Cascade delete when task is removed
  - Created/updated timestamps for version tracking
- **TaskHistory Model** (New): Activity tracking system
  - `action: TaskHistoryAction` - Specific action type for categorization
  - `field: String?` - Which field was changed
  - `oldValue: String?` - Previous value (JSON serialized)
  - `newValue: String?` - New value (JSON serialized)
  - `description: String` - Human-readable change description
  - Separate from audit logs (user-focused vs compliance-focused)
- **New Enums Added**:
  - `TaskStatus`: Todo, InProgress, Review, Done
  - `TaskPriority`: Low, Medium, High, Critical
  - `TaskHistoryAction`: CREATED, UPDATED, STATUS_CHANGED, ASSIGNED, UNASSIGNED, COMMENT_ADDED, DUE_DATE_CHANGED, PRIORITY_CHANGED, DESCRIPTION_CHANGED, TITLE_CHANGED

**API Endpoints Implemented**:
- `GET /api/projects/:projectId/tasks` - List project tasks with filtering and pagination
- `POST /api/projects/:projectId/tasks` - Create task in project
- `GET /api/tasks/:id` - Get task details with full context
- `PUT /api/tasks/:id` - Update task with field-level change tracking
- `DELETE /api/tasks/:id` - Delete task (Manager+ only)
- `PUT /api/tasks/:id/assign` - Assign/unassign task to team members
- `GET /api/tasks/:taskId/comments` - Get task comments with threading
- `POST /api/tasks/:taskId/comments` - Add comment or reply
- `PUT /api/comments/:commentId` - Update comment (author only)
- `DELETE /api/comments/:commentId` - Delete comment (author only)
- `GET /api/tasks/:taskId/history` - Get task activity timeline

**Frontend Components Implemented**:
- **Task Management Pages**: TasksList, TaskForm, TaskDetail with full CRUD
- **Task Comments Component**: Threaded discussion interface with edit/delete
- **Task History Component**: Visual activity timeline with change tracking
- **Project Integration**: Tasks displayed in project detail pages
- **Role-Based UI**: Components show/hide based on user permissions
- **Real-time Updates**: Optimistic UI updates for better user experience

### ⏭️ Phase 5: Sprint/Iteration Management - SKIPPED

**Why We're Skipping This Phase:**
Sprint Management is primarily designed for **software development projects** using Agile/Scrum methodologies. Since this project management system will be used across various industries and project types (marketing campaigns, construction projects, event planning, business operations, etc.), sprint-based workflow would not be universally applicable.

**Alternative Approach:**
Instead of sprints, the current **milestone-based project management** with flexible task organization provides better versatility for different types of projects:
- **Marketing Projects**: Campaign phases, launch dates, deliverable milestones
- **Construction Projects**: Foundation, framing, electrical, finishing phases
- **Event Planning**: Planning phase, vendor coordination, execution, post-event analysis
- **Business Operations**: Quarterly goals, monthly objectives, weekly deliverables

**Future Consideration:**
Sprint functionality can be added later as an **optional project template** for software development teams, while keeping the core system flexible for all project types.

### ✅ Phase 5: Meeting Management & Video Collaboration (Weeks 9-10) - COMPLETED
- [x] Comprehensive meeting management system (Manager+)
- [x] Video meeting integration with Jitsi Meet
- [x] Meeting scheduling and attendee management
- [x] Action item tracking and task conversion
- [x] Network access configuration for multi-computer testing
- [x] Meeting status tracking and real-time updates
- [x] Share meeting functionality
- [x] Meeting history and notes management

**Completed Features:**
- **Video Meeting Integration**: Full-featured video conferencing using Jitsi Meet
- **Meeting Management**: Complete CRUD operations for meeting lifecycle
- **Network Access**: Multi-computer testing support with CORS and external access
- **Meeting Controls**: Real-time video controls, screen sharing, and collaboration tools
- **Action Item System**: Convert meeting discussions into trackable tasks

**Detailed Implementation:**

**1. Video Meeting Integration (Jitsi Meet)**
- **Embedded Video Conferencing**: Full Jitsi Meet integration directly in the application
- **No External Authentication**: Configured to bypass Jitsi's authentication requirements
- **Room Generation**: Automatic unique room creation for each meeting
- **Video Quality**: 720p default with adaptive quality settings
- **Meeting Controls**: Built-in mute, video toggle, screen sharing, fullscreen, and hang-up
- **Real-time Status**: Automatic meeting status updates (Scheduled → In Progress → Completed)
- **Share Functionality**: Native Web Share API integration with clipboard fallback
- **Cross-Platform**: Works on desktop and mobile browsers without downloads

**2. Meeting Management System**
- **Meeting Types**: Support for Online, In-Person, and Hybrid meetings
- **Comprehensive Scheduling**: Date/time, location, external links, and agenda management
- **Attendee Management**: Required/optional attendees with status tracking (Pending, Accepted, Declined, Tentative)
- **Role-Based Access**: 
  - Manager+: Create, edit, delete meetings
  - Team: View and join assigned meetings
  - Admin: Full access to all organizational meetings
- **Meeting Lifecycle**: Status tracking from Scheduled through completion
- **Action Items**: Create trackable follow-up tasks directly from meetings
- **Meeting History**: Complete record of all meetings with notes and outcomes

**3. Network Access & Multi-Computer Testing**
- **CORS Configuration**: Backend configured for external network access
- **Environment Management**: Separate configurations for local and network development
- **Firewall Setup**: Automatic port configuration for external access
- **IP-Based Access**: Dynamic IP detection and configuration
- **Multi-User Testing**: Support for testing with users on different computers
- **Testing Scripts**: Automated verification of network setup and connectivity

**4. Advanced Video Features**
- **Authentication Bypass**: Configured to eliminate "waiting for authenticated user" delays
- **Lobby Disabled**: Direct meeting access without lobby restrictions
- **Error Recovery**: Automatic handling of common Jitsi connection issues
- **Video Display**: Full container video display (700px height) without white space
- **Meeting Persistence**: Meeting rooms persist for duration of scheduled meeting
- **Custom Branding**: ProjectFlow branding within video interface

**API Endpoints Implemented:**
- `GET /api/meetings` - List meetings with role-based filtering and query support
- `POST /api/meetings` - Create meeting (Manager+ only) with auto video room generation
- `GET /api/meetings/:id` - Get meeting details with attendee and action item data
- `PUT /api/meetings/:id` - Update meeting (creator/Manager+ only)
- `DELETE /api/meetings/:id` - Delete meeting (creator/Admin only)
- `GET /api/meetings/:id/attendees` - Get meeting attendees with status
- `POST /api/meetings/:id/attendees` - Add attendee to meeting
- `PUT /api/meetings/:id/attendees/:userId` - Update attendee status
- `DELETE /api/meetings/:id/attendees/:userId` - Remove attendee
- `GET /api/meetings/:id/action-items` - Get meeting action items
- `POST /api/meetings/:id/action-items` - Create action item from meeting
- `PUT /api/action-items/:id` - Update action item status
- `POST /api/action-items/:id/convert-to-task` - Convert action item to project task

**Frontend Components Implemented:**
- **Meeting Pages**: MeetingsList, MeetingForm, MeetingDetail with full CRUD interface
- **Video Meeting Component**: VideoMeeting with embedded Jitsi integration
- **Meeting Calendar**: Calendar view showing all user meetings
- **Attendee Management**: Add/remove attendees with role validation
- **Action Items**: Create and track follow-up actions from meetings
- **Share Meeting**: Native sharing with fallback to clipboard copy
- **Meeting Controls**: Real-time video controls with status feedback
- **Meeting History**: Complete audit trail of meeting activities

**Network Configuration Files Created:**
- `.env.local` - Local development configuration
- `.env.network` - Network access configuration (IP: 100.115.92.202)
- `test-network-setup.sh` - Automated network connectivity verification
- `vite.config.ts` - Updated for multi-environment support
- `package.json` - Added network-specific build and dev scripts

**Documentation Created:**
- `docs/VIDEO_MEETING_INTEGRATION.md` - Complete video meeting setup guide
- `docs/VIDEO_MEETING_TROUBLESHOOTING.md` - Issue resolution guide
- `docs/MULTI_COMPUTER_TESTING_GUIDE.md` - Network testing procedures

**What are Collaboration Features?**
Collaboration features enable teams to communicate, coordinate, and work together effectively in real-time:

**Real-time Updates:**
- **Purpose**: Instant updates without page refresh
- **Example**: When someone updates a task status, all team members see the change immediately
- **Benefits**: Reduces conflicts, improves coordination, enhances user experience

**Meeting Management:**
- **Purpose**: Organize team meetings, track agendas, and convert discussions into actionable tasks
- **Features**: Meeting scheduling, attendee management, note-taking, action item creation
- **Benefits**: Better meeting organization, clear follow-up actions, meeting history tracking

**Notification System:**
- **Purpose**: Keep team members informed about important changes and deadlines
- **Types**: In-app notifications, email alerts, browser push notifications
- **Benefits**: Improved communication, reduced missed deadlines, better task awareness

**Implementation Plan:**

**1. Real-time Updates (Socket.IO)**

**Backend Implementation:**
- **Install Dependencies**: `socket.io`, `@nestjs/websockets`
- **WebSocket Gateway**:
  ```typescript
  @WebSocketGateway({
    cors: { origin: process.env.FRONTEND_URL },
    namespace: '/ws'
  })
  export class RealtimeGateway {
    @WebSocketServer() server: Server;
    
    // Join project room for updates
    @SubscribeMessage('join-project')
    handleJoinProject(client: Socket, projectId: string) {
      client.join(`project-${projectId}`);
    }
    
    // Emit task updates to project members
    emitTaskUpdate(projectId: string, taskUpdate: any) {
      this.server.to(`project-${projectId}`).emit('task-updated', taskUpdate);
    }
  }
  ```
- **Integration Points**: Emit events when tasks/projects are updated

**Frontend Implementation:**
- **Socket.IO Client**: Connect to backend WebSocket
- **Real-time Hooks**:
  ```typescript
  // hooks/useRealtime.ts
  export function useRealtime(projectId: string) {
    useEffect(() => {
      socket.emit('join-project', projectId);
      socket.on('task-updated', handleTaskUpdate);
      return () => socket.off('task-updated');
    }, [projectId]);
  }
  ```
- **Live Updates**: Update UI when receiving WebSocket events

**2. Meeting Management System**

**Database Schema:**
- **Meeting Model** (New):
  ```sql
  Meeting {
    id: UUID
    projectId: UUID? (FK) -- Optional project association
    orgId: UUID (FK) -- Organization-wide meetings
    title: String
    description: String?
    startTime: DateTime
    endTime: DateTime
    location: String? -- Physical location
    meetingLink: String? -- Video conference link
    agenda: JSON -- Structured agenda items
    notes: String? -- Meeting notes
    status: Enum (Scheduled, InProgress, Completed, Cancelled)
    createdById: UUID (FK User) -- Must be Manager+
    createdAt: DateTime
    updatedAt: DateTime
  }
  ```
- **MeetingAttendee Model** (New):
  ```sql
  MeetingAttendee {
    id: UUID
    meetingId: UUID (FK)
    userId: UUID (FK)
    isRequired: Boolean -- Required vs optional attendee
    status: Enum (Pending, Accepted, Declined, Tentative)
    respondedAt: DateTime?
  }
  ```
- **MeetingActionItem Model** (New):
  ```sql
  MeetingActionItem {
    id: UUID
    meetingId: UUID (FK)
    taskId: UUID? (FK Task) -- Link to created task
    description: String
    assigneeId: UUID? (FK User)
    dueDate: DateTime?
    status: Enum (Open, InProgress, Completed)
    createdAt: DateTime
  }
  ```

**Frontend Components:**
- **Meeting Pages**: `MeetingsList`, `MeetingForm`, `MeetingDetail`
- **Meeting Components**: `MeetingCalendar`, `AttendeeList`, `AgendaEditor`
- **Integration**: `ActionItemToTaskConverter`

**3. Notification System**

**Database Schema:**
- **Notification Model** (New):
  ```sql
  Notification {
    id: UUID
    userId: UUID (FK)
    type: Enum (TASK_ASSIGNED, TASK_DUE_SOON, MEETING_REMINDER, PROJECT_UPDATE, COMMENT_MENTION)
    title: String
    message: String
    data: JSON -- Additional context data
    entityType: String? -- Related entity (Task, Project, Meeting)
    entityId: UUID? -- Related entity ID
    isRead: Boolean @default(false)
    readAt: DateTime?
    createdAt: DateTime
  }
  ```

**Notification Types to Implement:**
- **Task Notifications**: Assignment, status changes, due date reminders
- **Project Notifications**: Project updates, new members, status changes
- **Meeting Notifications**: Meeting reminders, agenda updates, action items
- **Comment Notifications**: @mentions, replies to comments

**Frontend Implementation:**
- **Notification Center**: Dropdown with unread notifications
- **Real-time Notifications**: Toast notifications for immediate alerts
- **Email Integration**: Backend service for email notifications

**4. Team Collaboration Tools**

**Features to Implement:**
- **Enhanced @Mentions**: Tag users in comments with notifications
- **Activity Feeds**: Real-time activity streams for projects
- **User Presence**: Show who's online and working on what
- **Quick Chat**: Basic messaging for urgent communication

**Implementation Priority:**
1. **Week 1**: Real-time updates (Socket.IO) + Basic notifications
2. **Week 2**: Meeting management system + Enhanced notifications
3. **Week 3**: Team collaboration tools + @mentions
4. **Week 4**: Polish, testing, and integration

**Technology Stack Additions:**
- **Backend**: Socket.IO, Nodemailer (email), node-cron (scheduling)
- **Frontend**: Socket.IO client, React Query for real-time sync
- **Infrastructure**: Redis (optional, for Socket.IO scaling)

### 🚧 Phase 6: Real-time Collaboration & Notifications (Weeks 11-12) - NEXT
- [ ] Real-time updates (Socket.IO) for tasks and projects
- [ ] Comprehensive notification system (in-app + email)
- [ ] Enhanced @mentions in comments with notifications
- [ ] Activity feeds for projects and teams
- [ ] User presence indicators and online status
- [ ] Push notifications for critical updates

### Phase 7: Time Tracking & Timesheets (Weeks 13-14)
- [ ] Time entry and tracking against tasks
- [ ] Timer functionality for active work
- [ ] Timesheet management and approval workflow
- [ ] Manager approval system for submitted hours
- [ ] Time reporting and analytics (Manager+)
- [ ] Integration with task estimates and project budgets

### ✅ Phase 8: Reporting & Analytics (Weeks 15-16) - COMPLETED
- [x] Role-based reporting system with dashboards
- [x] Team performance reports (Manager+)
- [x] Project health and progress dashboards
- [x] Time utilization and budget tracking reports
- [x] Export functionality (PDF, CSV, Excel)
- [x] Custom report builder (Admin)
- [x] Automated report scheduling and delivery

**Completed Features:**
- **Dynamic Dashboard System**: Real-time dashboard with statistics, progress tracking, and trend analysis
  - Role-based dashboard filtering (Admin: all org data, Manager: managed projects, Team: assigned projects)
  - Real-time statistics: total tasks, active projects, team members, upcoming deadlines
  - Interactive project progress bars with task status breakdown visualization
  - Recent activity feed with user attribution and timestamps
  - Overdue task tracking with priority indicators
- **Advanced Analytics Components**: Chart-based data visualization and reporting
  - Project performance charts showing task completion trends
  - Team productivity metrics with workload distribution
  - Task status distribution charts with interactive legends
  - Time-based progress tracking with burndown analytics
  - Priority-based task analysis with visual indicators
- **Enhanced Dashboard Features**: Interactive filtering and real-time updates
  - Date range filtering for time-based analytics
  - Project-specific filtering for focused analysis
  - Auto-refresh functionality with configurable intervals
  - Export capabilities for reports and analytics data
  - Responsive design optimized for different screen sizes
- **Backend Analytics Engine**: Sophisticated data aggregation and calculation
  - Complex SQL queries for real-time metrics calculation
  - Weighted project progress calculation based on task status
  - User productivity metrics with role-based access control
  - Trend analysis with historical data comparison
  - Performance optimized queries with proper indexing

### Phase 9: Production Readiness (Weeks 17-18)
- [ ] Security hardening and penetration testing
- [ ] Comprehensive testing (unit, integration, E2E)
- [ ] Documentation completion
- [ ] Deployment automation
- [ ] Monitoring and alerting setup
- [ ] User training materials and onboarding

## Success Metrics

### Technical Metrics
- **Performance**: Page load time < 2s, API response time < 200ms
- **Reliability**: 99.9% uptime, zero data loss
- **Security**: Zero security vulnerabilities, comprehensive audit logs
- **Scalability**: Support for 100+ concurrent users

### Role-specific Success Metrics

#### Admin Success Metrics
- Complete system visibility and control
- Efficient user and role management
- Comprehensive audit trail access
- System health monitoring capabilities

#### Manager Success Metrics
- 30% improvement in project delivery times
- Effective team workload distribution
- Accurate project progress tracking
- Streamlined approval workflows

#### Team Success Metrics
- 50% reduction in task tracking overhead
- Improved collaboration and communication
- Clear visibility into personal productivity
- Simplified time tracking and reporting

## Future Enhancements

### Short-term (3-6 months)
- [ ] Mobile application (React Native)
- [ ] Advanced role permissions (custom roles)
- [ ] Integration with external tools (Slack, Teams)
- [ ] Advanced project templates
- [ ] Resource capacity planning

### Medium-term (6-12 months)
- [ ] AI-powered project insights
- [ ] Advanced workflow automation
- [ ] Multi-language support
- [ ] Advanced search with full-text indexing
- [ ] Custom field types and forms

### Long-term (12+ months)
- [ ] Enterprise SSO integration
- [ ] Advanced analytics and machine learning
- [ ] Third-party plugin marketplace
- [ ] Multi-region deployment
- [ ] Advanced compliance features

This comprehensive plan provides a complete roadmap for developing CollabSync HQ with the simplified Admin/Manager/Team role structure, ensuring clear access control and appropriate functionality for each user type.
