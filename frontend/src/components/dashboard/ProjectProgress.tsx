import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { FolderKanban, Users } from "lucide-react";
import { useQuery } from '@tanstack/react-query';
import { dashboardQueries } from '@/lib/api/dashboard';
import { Skeleton } from "@/components/ui/skeleton";
import { EnhancedProgressBar } from './EnhancedProgressBar';


const statusColors = {
  active: "bg-success text-success-foreground",
  planning: "bg-warning text-warning-foreground",
  completed: "bg-info text-info-foreground",
  "on-hold": "bg-muted text-muted-foreground",
};

export function ProjectProgress() {
  const { data: projects, isLoading, error } = useQuery(dashboardQueries.projects())

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <FolderKanban className="h-5 w-5" />
          Active Projects
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          // Loading skeletons
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-56" />
                </div>
                <Skeleton className="h-6 w-16" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-8" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4" />
                  <div className="flex -space-x-2">
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <Skeleton className="h-6 w-6 rounded-full" />
                  </div>
                </div>
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-destructive">Failed to load projects</p>
          </div>
        ) : projects && projects.length > 0 ? (
          projects.map((project) => (
            <div key={project.id} className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium text-foreground">{project.name}</h4>
                  <p className="text-sm text-muted-foreground">{project.description}</p>
                </div>
                <Badge className={statusColors[project.status]} variant="secondary">
                  {project.status}
                </Badge>
              </div>

              <EnhancedProgressBar
                progress={project.progress}
                tasksCompleted={project.tasksCompleted}
                totalTasks={project.totalTasks}
                taskBreakdown={project.taskBreakdown}
                showDetailed={project.totalTasks > 0 && project.taskBreakdown !== undefined}
              />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div className="flex -space-x-2">
                    {project.teamMembers.slice(0, 3).map((member, index) => (
                      <Avatar key={index} className="h-6 w-6 border-2 border-background">
                        <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                          {member.initials}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {project.teamMembers.length > 3 && (
                      <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                        <span className="text-xs text-muted-foreground">
                          +{project.teamMembers.length - 3}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-sm text-muted-foreground">
                  {project.tasksCompleted}/{project.totalTasks} tasks
                </div>
              </div>

              {project.deadline && (
                <div className="text-xs text-muted-foreground">
                  Due: {new Date(project.deadline).toLocaleDateString()}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No active projects found</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
