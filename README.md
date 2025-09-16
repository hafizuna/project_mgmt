# ICos PgMgmt - Project Management & Team Collaboration Platform

A comprehensive project management and team collaboration platform built with React (Vite) frontend and Node.js/Express backend, featuring embedded video meetings with Jitsi Meet integration.

## ✨ Features

- **👥 Role-Based Access Control**: Admin, Manager, and Team roles with appropriate permissions
- **📊 Project Management**: Complete project lifecycle with member management
- **✅ Task Management**: Full task CRUD with comments, history, and status tracking
- **📹 Video Meetings**: Embedded Jitsi Meet for seamless video conferencing
- **📅 Meeting Management**: Comprehensive scheduling with action items and follow-ups
- **🔐 Secure Authentication**: JWT-based with refresh token rotation
- **📱 Responsive Design**: Works on desktop and mobile devices

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ 
- **PostgreSQL** 15+
- **Git**

### 🔧 Setup on New Computer

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd project_mgmt
   ```

2. **Run the automated setup**
   ```bash
   ./setup-new-env.sh
   ```

3. **Manual setup alternative:**
   ```bash
   # Backend setup
   cd backend
   npm install
   npx prisma generate  # ← This fixes the missing types error!
   npx prisma migrate dev
   
   # Frontend setup  
   cd ../frontend
   npm install
   ```

### 🗄️ Database Setup

1. **Create PostgreSQL database**
   ```bash
   sudo -u postgres createuser -P your_username
   sudo -u postgres createdb -O your_username your_database_name
   ```

2. **Configure environment**
   ```bash
   # Create backend/.env
   DATABASE_URL="postgresql://username:password@localhost:5432/database_name"
   JWT_SECRET="your-super-secret-jwt-key"
   JWT_REFRESH_SECRET="your-super-secret-refresh-key"
   ```

### 🚀 Development

**Start both services:**

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend  
cd frontend
npm run dev
```

**Access the application:**
- Frontend: http://localhost:8080
- Backend API: http://localhost:4000/api

### 🌐 Network Testing (Multi-Computer)

To test with multiple computers on the same network:

```bash
# Backend (runs on all interfaces)
cd backend && npm run dev

# Frontend (network mode)
cd frontend && npm run dev:network

# Test connectivity
./test-network-setup.sh
```

Access from other computers: `http://YOUR_IP:8081`

## 🔐 Default Login

After setup, login with:
- **Email**: admin@company.local
- **Password**: admin123
- **Role**: Admin

## 📋 User Roles

### 👑 Admin
- Full system access and user management
- All project and organizational oversight
- System settings and audit logs

### 👨‍💼 Manager  
- Create and manage projects
- Team leadership and resource allocation
- Project reporting and meeting management

### 👥 Team
- Task execution and project participation
- Time tracking and collaboration
- Personal productivity tracking

## 🎯 Current Implementation Status

### ✅ Completed Phases

- **Phase 1**: Foundation & Authentication
- **Phase 2**: User & Organization Management  
- **Phase 3**: Project Management
- **Phase 4**: Task Management
- **Phase 5**: Meeting Management & Video Collaboration

### 🚧 Next: Real-time Collaboration & Notifications

## 📹 Video Meetings

The platform includes embedded Jitsi Meet for video conferencing:

- **No Downloads Required**: Works directly in browser
- **Meeting Controls**: Mute, video toggle, screen sharing, fullscreen
- **Role-Based Access**: Manager+ can create, Team members can join
- **Action Items**: Convert meeting discussions to trackable tasks
- **Share Functionality**: Easy meeting link sharing

## 🛠️ Tech Stack

### Frontend
- React 18 + TypeScript + Vite
- Tailwind CSS + shadcn/ui components
- Zustand (state management)
- React Query (server state)
- React Hook Form + Zod validation

### Backend
- Node.js + Express + TypeScript
- PostgreSQL + Prisma ORM
- JWT authentication
- Role-based access control

### Infrastructure
- Local file storage
- Environment-based configuration
- CORS enabled for development

## 📚 Documentation

- `docs/VIDEO_MEETING_INTEGRATION.md` - Video meeting setup
- `docs/VIDEO_MEETING_TROUBLESHOOTING.md` - Common issues  
- `docs/MULTI_COMPUTER_TESTING_GUIDE.md` - Network testing
- `plan.md` - Complete development plan and progress

## 🐛 Troubleshooting

### Common Issues

1. **"ProjectPriority not found" Error**
   ```bash
   cd backend
   npx prisma generate  # Regenerate Prisma client
   ```

2. **Database Connection Error**
   - Check PostgreSQL is running
   - Verify DATABASE_URL in backend/.env
   - Run `npx prisma migrate dev`

3. **Port Already in Use**
   - Backend: Change PORT in backend/.env
   - Frontend: Vite will auto-increment port

4. **Video Meeting Issues**
   - Check browser permissions for camera/microphone
   - See troubleshooting guide in docs/

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License.

---

**Need Help?** Check the documentation in the `docs/` folder or create an issue.