import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface TaskBreakdown {
  todo: number;
  inProgress: number;
  review: number;
  done: number;
}

interface EnhancedProgressBarProps {
  progress: number;
  tasksCompleted: number;
  totalTasks: number;
  taskBreakdown?: TaskBreakdown;
  showDetailed?: boolean;
  className?: string;
}

export function EnhancedProgressBar({
  progress,
  tasksCompleted,
  totalTasks,
  taskBreakdown,
  showDetailed = false,
  className
}: EnhancedProgressBarProps) {
  if (!showDetailed || !taskBreakdown) {
    // Simple progress bar
    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium">{progress}%</span>
        </div>
        <Progress value={progress} className="h-2" />
        <div className="text-xs text-muted-foreground text-right">
          {tasksCompleted}/{totalTasks} tasks completed
        </div>
      </div>
    );
  }

  // Enhanced progress bar with breakdown
  const totalBreakdownTasks = Object.values(taskBreakdown).reduce((sum, count) => sum + count, 0);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Progress</span>
        <span className="font-medium">{progress}%</span>
      </div>
      
      {/* Main progress bar */}
      <Progress value={progress} className="h-3" />
      
      {/* Detailed breakdown */}
      <div className="space-y-2">
        {/* Status breakdown bars */}
        <div className="flex gap-1 h-1">
          {/* Todo section */}
          {taskBreakdown.todo > 0 && (
            <div 
              className="bg-muted rounded-sm"
              style={{ width: `${(taskBreakdown.todo / totalBreakdownTasks) * 100}%` }}
              title={`${taskBreakdown.todo} todo tasks`}
            />
          )}
          
          {/* In Progress section */}
          {taskBreakdown.inProgress > 0 && (
            <div 
              className="bg-blue-400 rounded-sm"
              style={{ width: `${(taskBreakdown.inProgress / totalBreakdownTasks) * 100}%` }}
              title={`${taskBreakdown.inProgress} in progress tasks`}
            />
          )}
          
          {/* Review section */}
          {taskBreakdown.review > 0 && (
            <div 
              className="bg-yellow-400 rounded-sm"
              style={{ width: `${(taskBreakdown.review / totalBreakdownTasks) * 100}%` }}
              title={`${taskBreakdown.review} in review tasks`}
            />
          )}
          
          {/* Done section */}
          {taskBreakdown.done > 0 && (
            <div 
              className="bg-green-500 rounded-sm"
              style={{ width: `${(taskBreakdown.done / totalBreakdownTasks) * 100}%` }}
              title={`${taskBreakdown.done} completed tasks`}
            />
          )}
        </div>
        
        {/* Status legend */}
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {taskBreakdown.todo > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-muted rounded-sm" />
              <span>{taskBreakdown.todo} Todo</span>
            </div>
          )}
          {taskBreakdown.inProgress > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-blue-400 rounded-sm" />
              <span>{taskBreakdown.inProgress} Active</span>
            </div>
          )}
          {taskBreakdown.review > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-yellow-400 rounded-sm" />
              <span>{taskBreakdown.review} Review</span>
            </div>
          )}
          {taskBreakdown.done > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-sm" />
              <span>{taskBreakdown.done} Done</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}