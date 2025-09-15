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
import AuditLogs from "./pages/Admin/AuditLogs";
import { ProjectsList, ProjectDetail, ProjectForm } from "./pages/Projects";
import { TasksList, TaskForm, TaskDetail as TaskDetailPage } from "./pages/Tasks";
import ProtectedRoute from "./components/auth/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
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
            <Route path="tasks/new" element={<TaskForm />} />
            <Route path="tasks/:id" element={<TaskDetailPage />} />
            <Route path="tasks/:id/edit" element={<TaskForm />} />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
