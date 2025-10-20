import { StatsCard } from "@/components/dashboard/StatsCard";
import { TasksOverview } from "@/components/dashboard/TasksOverview";
import { ProjectProgress } from "@/components/dashboard/ProjectProgress";
import { DashboardFilters, DashboardFiltersState } from "@/components/dashboard/DashboardFilters";
import { CheckSquare, FolderKanban, Users, Clock, TrendingUp, Calendar, AlertTriangle, Briefcase, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useQuery } from '@tanstack/react-query';
import { dashboardQueries } from '@/lib/api/dashboard';
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthStore } from '@/lib/stores/auth';

export function ManagerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  // Filter state - default to manager's projects
  const [filters, setFilters] = useState<DashboardFiltersState>({
    // Could add managedOnly: true to filter to only managed projects
  });
  
  // Fetch dashboard data with filters
  const { data: stats, isLoading: statsLoading, error: statsError, refetch: refetchStats } = useQuery({
    ...dashboardQueries.stats(filters),
    refetchInterval: filters.refreshInterval || false,
  });
  
  const { data: deadlines, isLoading: deadlinesLoading, refetch: refetchDeadlines } = useQuery({
    ...dashboardQueries.deadlines(),
    refetchInterval: filters.refreshInterval || false,
  });
  
  // Auto-refresh effect
  useEffect(() => {
    if (filters.refreshInterval) {
      const interval = setInterval(() => {
        refetchStats();
        refetchDeadlines();
      }, filters.refreshInterval);
      
      return () => clearInterval(interval);
    }
  }, [filters.refreshInterval, refetchStats, refetchDeadlines]);
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <Briefcase className="h-8 w-8 text-green-600" />
          Manager Dashboard
        </h1>
        <p className="text-muted-foreground">
          Welcome {user?.name}! Here's an overview of your projects and team performance.
        </p>
      </div>
      
      {/* Dashboard Filters */}
      <DashboardFilters
        filters={filters}
        onFiltersChange={setFilters}
        showProjectFilter={true}
        showDateRange={true}
        showRefreshControls={true}
      />

      {/* Dashboard Content with Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="overview">My Projects Overview</TabsTrigger>
          <TabsTrigger value="team">Team Management</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          {/* Stats Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {statsLoading ? (
              // Loading skeletons
              Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="shadow-card">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-5 w-5" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-16 mb-2" />
                    <Skeleton className="h-3 w-24" />
                  </CardContent>
                </Card>
              ))
            ) : statsError ? (
              // Error state
              <div className="col-span-full">
                <Card className="shadow-card border-destructive">
                  <CardContent className="pt-6">
                    <p className="text-destructive">Failed to load dashboard statistics. Please try again.</p>
                  </CardContent>
                </Card>
              </div>
            ) : stats ? (
              // Real data - Manager sees project-focused stats
              <>
                <StatsCard
                  title="My Tasks"
                  value={stats.totalTasks}
                  description="across managed projects"
                  icon={CheckSquare}
                  trend={stats.trends.tasks}
                />
                <StatsCard
                  title="Active Projects"
                  value={stats.activeProjects}
                  description="under management"
                  icon={FolderKanban}
                  trend={{ value: Math.round(((stats.activeProjects / Math.max(stats.totalProjects, 1)) * 100)), isPositive: stats.activeProjects > 0 }}
                />
                <StatsCard
                  title="Team Members"
                  value={stats.teamMembers}
                  description="across your projects"
                  icon={Users}
                />
                <StatsCard
                  title="Project Completion"
                  value={`${stats.completionRate}%`}
                  description="average completion rate"
                  icon={TrendingUp}
                  trend={stats.trends.completedTasks}
                />
              </>
            ) : null}
          </div>

          {/* Main Content Grid */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left Column - Takes 2/3 width */}
            <div className="lg:col-span-2 space-y-6">
              <TasksOverview />
              
              {/* Manager Quick Actions */}
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Manager Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button 
                      className="flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left"
                      onClick={() => navigate('/projects/new')}
                    >
                      <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
                        <FolderKanban className="h-5 w-5 text-primary-foreground" />
                      </div>
                      <div>
                        <h4 className="font-medium">Create Project</h4>
                        <p className="text-sm text-muted-foreground">Start a new project</p>
                      </div>
                    </button>
                    
                    <button 
                      className="flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left"
                      onClick={() => navigate('/tasks/new')}
                    >
                      <div className="h-10 w-10 rounded-lg bg-blue-500 flex items-center justify-center">
                        <CheckSquare className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-medium">Assign Task</h4>
                        <p className="text-sm text-muted-foreground">Create and assign new tasks</p>
                      </div>
                    </button>
                    
                    <button 
                      className="flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left"
                      onClick={() => navigate('/meetings/new')}
                    >
                      <div className="h-10 w-10 rounded-lg bg-green-500 flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-medium">Schedule Meeting</h4>
                        <p className="text-sm text-muted-foreground">Plan team meetings</p>
                      </div>
                    </button>
                    
                    <button 
                      className="flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left"
                      onClick={() => navigate('/reports')}
                    >
                      <div className="h-10 w-10 rounded-lg bg-orange-500 flex items-center justify-center">
                        <Target className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-medium">View Reports</h4>
                        <p className="text-sm text-muted-foreground">Team performance reports</p>
                      </div>
                    </button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Takes 1/3 width */}
            <div className="space-y-6">
              <ProjectProgress />
              
              {/* Project-specific Upcoming Deadlines */}
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    My Project Deadlines
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {deadlinesLoading ? (
                    // Loading skeletons
                    Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                        <Skeleton className="h-3 w-3 rounded-full" />
                      </div>
                    ))
                  ) : deadlines && deadlines.length > 0 ? (
                    deadlines.slice(0, 5).map((deadline, index) => (
                      <div key={deadline.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                        <div>
                          <p className="font-medium text-sm">{deadline.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(deadline.date).toLocaleDateString()} • {deadline.type}
                            {deadline.project && ` • ${deadline.project}`}
                          </p>
                        </div>
                        <div className={`h-3 w-3 rounded-full ${
                          deadline.priority === "high" ? "bg-red-500" :
                          deadline.priority === "medium" ? "bg-yellow-500" : "bg-green-500"
                        }`} />
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-muted-foreground">No upcoming deadlines</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="team" className="space-y-6">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Performance Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Team Analytics</h3>
                <p className="text-muted-foreground mb-4">
                  Advanced team performance analytics for your managed projects.
                </p>
                <button 
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                  onClick={() => navigate('/reports')}
                >
                  View Detailed Reports
                </button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}