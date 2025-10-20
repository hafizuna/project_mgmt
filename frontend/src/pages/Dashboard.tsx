import { useAuthStore } from '@/lib/stores/auth';
import { AdminDashboard } from '@/components/dashboard/AdminDashboard';
import { ManagerDashboard } from '@/components/dashboard/ManagerDashboard';
import { TeamDashboard } from '@/components/dashboard/TeamDashboard';

export default function Dashboard() {
  const { user } = useAuthStore();
  
  // Route to appropriate dashboard based on user role
  switch (user?.role) {
    case 'Admin':
      return <AdminDashboard />;
    case 'Manager':
      return <ManagerDashboard />;
    case 'Team':
      return <TeamDashboard />;
    default:
      // Fallback for unknown roles
      return <TeamDashboard />;
  }
}
