import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MainLayout } from "./components/layout/MainLayout";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import Login from "./pages/Auth/Login";
import UserManagement from "./pages/Admin/UserManagement";
import OrganizationSettings from "./pages/Admin/OrganizationSettings";
import AdminReports from "./pages/Admin/AdminReports";
import AuditLogs from "./pages/Admin/AuditLogs";
import { ProjectsList, ProjectDetail, ProjectForm } from "./pages/Projects";
import { TasksList, TaskForm, TaskDetail as TaskDetailPage } from "./pages/Tasks";
import KanbanBoard from "./pages/Tasks/KanbanBoard";
import Meetings from "./pages/Meetings";
import CreateMeeting from "./pages/CreateMeeting";
import MeetingDetail from "./pages/MeetingDetail";
import EditMeeting from "./pages/EditMeeting";
import Reports from "./pages/Reports/Reports";
import { Team } from "./pages/Team";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import { NotificationCenter, NotificationPreferences, NotificationDemo } from "./components/notifications";
import { NotificationTest } from "./components/notifications/NotificationTest";
import { KnowledgeList, KnowledgeDetail, KnowledgeForm } from "./pages/Knowledge";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner
        position="top-right"
        toastOptions={{
          duration: 5000,
          style: {
            background: 'hsl(var(--background))',
            border: '1px solid hsl(var(--border))',
            color: 'hsl(var(--foreground))',
          },
        }}
      />
<BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route 
              path="admin/users" 
              element={
                <ProtectedRoute requiredRoles={['Admin']}>
                  <UserManagement />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="admin/organization" 
              element={
                <ProtectedRoute requiredRoles={['Admin']}>
                  <OrganizationSettings />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="admin/reports" 
              element={
                <ProtectedRoute requiredRoles={['Admin']}>
                  <AdminReports />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="admin/audit" 
              element={
                <ProtectedRoute requiredRoles={['Admin']}>
                  <AuditLogs />
                </ProtectedRoute>
              } 
            />
            
            {/* Projects Routes */}
            <Route path="projects" element={<ProjectsList />} />
            <Route path="projects/new" element={<ProjectForm />} />
            <Route path="projects/:id" element={<ProjectDetail />} />
            <Route path="projects/:id/edit" element={<ProjectForm />} />
            
            {/* Tasks Routes */}
            <Route path="tasks" element={<TasksList />} />
            <Route path="tasks/board" element={<KanbanBoard />} />
            <Route path="tasks/new" element={<TaskForm />} />
            <Route path="tasks/:id" element={<TaskDetailPage />} />
            <Route path="tasks/:id/edit" element={<TaskForm />} />
            
            {/* Meetings Routes */}
            <Route path="meetings" element={<Meetings />} />
            <Route path="meetings/new" element={<CreateMeeting />} />
            <Route path="meetings/:id" element={<MeetingDetail />} />
            <Route path="meetings/:id/edit" element={<EditMeeting />} />
            
            {/* Reports Routes */}
            <Route path="reports" element={<Reports />} />
            
            {/* Knowledge Base Routes */}
            <Route path="knowledge" element={<KnowledgeList />} />
            <Route path="knowledge/new" element={<KnowledgeForm />} />
            <Route path="knowledge/:id" element={<KnowledgeDetail />} />
            <Route path="knowledge/:id/edit" element={<KnowledgeForm />} />
            
            {/* Team Routes - Admin Only */}
            <Route 
              path="team" 
              element={
                <ProtectedRoute requiredRoles={['Admin']}>
                  <Team />
                </ProtectedRoute>
              } 
            />
            
            {/* Notification Routes */}
            <Route path="notifications" element={<NotificationCenter />} />
            <Route path="notifications/preferences" element={<NotificationPreferences />} />
            <Route path="notifications/demo" element={<NotificationDemo />} />
            <Route path="notifications/test" element={<NotificationTest />} />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
