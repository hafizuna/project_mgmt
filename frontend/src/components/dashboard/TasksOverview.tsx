import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, Clock, User } from "lucide-react";
import { useQuery } from '@tanstack/react-query';
import { dashboardQueries } from '@/lib/api/dashboard';
import { Skeleton } from "@/components/ui/skeleton";


const statusColors = {
  todo: "bg-muted text-muted-foreground",
  "in-progress": "bg-info text-info-foreground",
  completed: "bg-success text-success-foreground",
};

const priorityColors = {
  high: "border-l-priority-high",
  medium: "border-l-priority-medium",
  low: "border-l-priority-low",
};

export function TasksOverview() {
  const { data: tasks, isLoading, error } = useQuery(dashboardQueries.tasks())

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Recent Tasks</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          // Loading skeletons
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-4 rounded-lg border-l-4 bg-card border-l-muted">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-64" />
                </div>
                <Skeleton className="h-6 w-20" />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <div className="flex items-center gap-1">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-2 w-16 rounded-full" />
                  <Skeleton className="h-3 w-8" />
                </div>
              </div>
            </div>
          ))
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-destructive">Failed to load tasks</p>
          </div>
        ) : tasks && tasks.length > 0 ? (
          tasks.map((task) => (
            <div
              key={task.id}
              className={`p-4 rounded-lg border-l-4 bg-card hover:shadow-sm transition-shadow ${
                priorityColors[task.priority]
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="font-medium text-foreground mb-1">{task.title}</h4>
                  <p className="text-sm text-muted-foreground">{task.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">Project: {task.project}</p>
                </div>
                <Badge className={statusColors[task.status]} variant="secondary">
                  {task.status.replace("-", " ")}
                </Badge>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                  {task.assignee && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <User className="h-4 w-4" />
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                          {task.assignee.initials}
                        </AvatarFallback>
                      </Avatar>
                      <span>{task.assignee.name}</span>
                    </div>
                  )}

                  {task.deadline && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(task.deadline).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-16 bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium">{task.progress}%</span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No active tasks found</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
