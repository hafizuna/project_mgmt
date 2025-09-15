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

-- Project Structure
Project {
  id: UUID
  orgId: UUID (FK)
  name: String
  description: String?
  status: Enum (Active, Completed, Archived)
  startDate: Date?
  dueDate: Date?
  ownerId: UUID (FK User) -- Must be Admin or Manager
  settings: JSON
  createdAt: DateTime
  updatedAt: DateTime
}

ProjectMember {
  id: UUID
  projectId: UUID (FK)
  userId: UUID (FK)
  role: Enum (Owner, Manager, Member) -- Project-level roles
  joinedAt: DateTime
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

-- Task Management
Task {
  id: UUID
  projectId: UUID (FK)
  sprintId: UUID? (FK)
  title: String
  description: String?
  status: Enum (Todo, InProgress, Review, Done)
  priority: Enum (Low, Medium, High, Critical)
  assigneeId: UUID? (FK User)
  reporterId: UUID (FK User)
  estimatedHours: Float?
  dueDate: DateTime?
  labels: String[]
  parentTaskId: UUID? (FK Task - for subtasks)
  position: Int (for ordering)
  createdAt: DateTime
  updatedAt: DateTime
}

TaskComment {
  id: UUID
  taskId: UUID (FK)
  userId: UUID (FK)
  content: String
  mentions: UUID[] (User IDs)
  parentCommentId: UUID? (FK - for threading)
  createdAt: DateTime
  updatedAt: DateTime
}

TaskAttachment {
  id: UUID
  taskId: UUID (FK)
  userId: UUID (FK)
  filename: String
  originalName: String
  path: String
  size: Int
  mimeType: String
  createdAt: DateTime
}

TaskHistory {
  id: UUID
  taskId: UUID (FK)
  userId: UUID (FK)
  action: String
  field: String?
  oldValue: String?
  newValue: String?
  createdAt: DateTime
}

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

### 🚧 Phase 3: Project Management (Weeks 5-6) - IN PROGRESS
- [ ] Project CRUD operations (Manager+)
- [ ] Project member management
- [ ] Role-based project access control
- [ ] File upload functionality
- [ ] Project dashboard and overview

### Phase 4: Task Management (Weeks 7-8)
- [ ] Task CRUD with role-based permissions
- [ ] Kanban board implementation
- [ ] Task comments and mentions
- [ ] Task history and activity feeds
- [ ] Basic task filtering and search

### Phase 5: Sprint Management (Weeks 9-10)
- [ ] Sprint creation and management (Manager+)
- [ ] Sprint boards and task assignment
- [ ] Sprint reports and burndown charts
- [ ] Sprint retrospective tools

### Phase 6: Collaboration Features (Weeks 11-12)
- [ ] Real-time updates (Socket.IO)
- [ ] Meeting management system (Manager+)
- [ ] Notification system (in-app + email)
- [ ] Team collaboration tools
- [ ] Basic messaging functionality

### Phase 7: Time Tracking (Weeks 13-14)
- [ ] Time entry and tracking
- [ ] Timesheet management and approval workflow
- [ ] Manager approval system
- [ ] Time reporting and analytics

### Phase 8: Reporting & Analytics (Weeks 15-16)
- [ ] Role-based reporting system
- [ ] Team performance reports (Manager+)
- [ ] Project health dashboards
- [ ] Export functionality (PDF, CSV)
- [ ] Custom report builder (Admin)

### Phase 9: Advanced Features (Weeks 17-18)
- [ ] Advanced search and filtering
- [ ] File versioning and management
- [ ] Integration capabilities
- [ ] Mobile responsiveness optimization
- [ ] Performance optimization

### Phase 10: Production Readiness (Weeks 19-20)
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
