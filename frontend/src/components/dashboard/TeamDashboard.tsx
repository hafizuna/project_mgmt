import { StatsCard } from "@/components/dashboard/StatsCard";
import { TasksOverview } from "@/components/dashboard/TasksOverview";
import { ProjectProgress } from "@/components/dashboard/ProjectProgress";
import { CheckSquare, FolderKanban, Users, Clock, TrendingUp, Calendar, AlertTriangle, User, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useQuery } from '@tanstack/react-query';
import { dashboardQueries } from '@/lib/api/dashboard';
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/stores/auth';

export function TeamDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  // Fetch dashboard data filtered to user's assigned tasks/projects
  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery({
    ...dashboardQueries.stats({ assignedToMe: true }), // Filter to user's assignments
    refetchInterval: 30000, // Refresh every 30 seconds
  });
  
  const { data: deadlines, isLoading: deadlinesLoading } = useQuery({
    ...dashboardQueries.deadlines({ assignedToMe: true }),
    refetchInterval: 30000,
  });
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <User className="h-8 w-8 text-purple-600" />
          My Dashboard
        </h1>
        <p className="text-muted-foreground">
          Welcome {user?.name}! Here's an overview of your assigned tasks and projects.
        </p>
      </div>
      
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
          // Real data - Team member sees personal stats
          <>
            <StatsCard
              title="My Tasks"
              value={stats.totalTasks}
              description="assigned to me"
              icon={CheckSquare}
              trend={stats.trends.tasks}
            />
            <StatsCard
              title="Active Projects"
              value={stats.activeProjects}
              description="I'm involved in"
              icon={FolderKanban}
              trend={{ value: Math.round(((stats.activeProjects / Math.max(stats.totalProjects, 1)) * 100)), isPositive: stats.activeProjects > 0 }}
            />
            <StatsCard
              title="Completion Rate"
              value={`${stats.completionRate}%`}
              description="of my tasks completed"
              icon={TrendingUp}
              trend={stats.trends.completedTasks}
            />
            <StatsCard
              title="This Week"
              value={stats.weeklyTasks || 0}
              description="tasks due this week"
              icon={Calendar}
            />
          </>
        ) : null}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Takes 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          <TasksOverview />
          
          {/* Personal Quick Actions */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                <button 
                  className="flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left"
                  onClick={() => navigate('/tasks')}
                >
                  <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
                    <CheckSquare className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <h4 className="font-medium">View My Tasks</h4>
                    <p className="text-sm text-muted-foreground">See all assigned tasks</p>
                  </div>
                </button>
                
                <button 
                  className="flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left"
                  onClick={() => navigate('/projects')}
                >
                  <div className="h-10 w-10 rounded-lg bg-blue-500 flex items-center justify-center">
                    <FolderKanban className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-medium">My Projects</h4>
                    <p className="text-sm text-muted-foreground">View project details</p>
                  </div>
                </button>
                
                <button 
                  className="flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left"
                  onClick={() => navigate('/meetings')}
                >
                  <div className="h-10 w-10 rounded-lg bg-green-500 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-medium">My Meetings</h4>
                    <p className="text-sm text-muted-foreground">Upcoming meetings</p>
                  </div>
                </button>
                
                <button 
                  className="flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left"
                  onClick={() => navigate('/tasks/board')}
                >
                  <div className="h-10 w-10 rounded-lg bg-purple-500 flex items-center justify-center">
                    <Star className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-medium">Kanban Board</h4>
                    <p className="text-sm text-muted-foreground">Visual task management</p>
                  </div>
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Personal Performance */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Personal Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{stats?.completionRate || 0}%</div>
                    <div className="text-sm text-muted-foreground">Completion Rate</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{stats?.onTimeCompletion || 0}%</div>
                    <div className="text-sm text-muted-foreground">On-Time Delivery</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{stats?.activeProjects || 0}</div>
                    <div className="text-sm text-muted-foreground">Active Projects</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Takes 1/3 width */}
        <div className="space-y-6">
          <ProjectProgress />
          
          {/* My Upcoming Deadlines */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                My Upcoming Deadlines
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
                // Backend now filters to only show deadlines for assigned tasks/projects
                deadlines
                  .slice(0, 5)
                  .map((deadline, index) => (
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

          {/* Quick Tips */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Star className="h-5 w-5" />
                Tips for Success
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Stay Organized</p>
                <p className="text-xs text-blue-600 dark:text-blue-400">Use the Kanban board to track your task progress visually.</p>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <p className="text-sm font-medium text-green-700 dark:text-green-300">Communicate</p>
                <p className="text-xs text-green-600 dark:text-green-400">Update task comments to keep your team informed.</p>
              </div>
              <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Plan Ahead</p>
                <p className="text-xs text-purple-600 dark:text-purple-400">Check your upcoming deadlines regularly.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}