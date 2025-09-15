import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, Clock, User } from "lucide-react";

interface Task {
  id: string;
  title: string;
  description: string;
  status: "todo" | "in-progress" | "completed";
  priority: "high" | "medium" | "low";
  assignee: {
    name: string;
    avatar?: string;
    initials: string;
  };
  deadline: string;
  progress: number;
}

const mockTasks: Task[] = [
  {
    id: "1",
    title: "Design System Update",
    description: "Update the design system components",
    status: "in-progress",
    priority: "high",
    assignee: { name: "Sarah Wilson", initials: "SW" },
    deadline: "2024-03-15",
    progress: 75,
  },
  {
    id: "2",
    title: "API Integration",
    description: "Integrate the new payment API",
    status: "todo",
    priority: "medium",
    assignee: { name: "Mike Johnson", initials: "MJ" },
    deadline: "2024-03-18",
    progress: 0,
  },
  {
    id: "3",
    title: "User Testing",
    description: "Conduct user testing sessions",
    status: "completed",
    priority: "low",
    assignee: { name: "Emma Davis", initials: "ED" },
    deadline: "2024-03-12",
    progress: 100,
  },
];

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
  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Recent Tasks</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {mockTasks.map((task) => (
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
              </div>
              <Badge className={statusColors[task.status]} variant="secondary">
                {task.status.replace("-", " ")}
              </Badge>
            </div>

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <User className="h-4 w-4" />
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={task.assignee.avatar} />
                    <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                      {task.assignee.initials}
                    </AvatarFallback>
                  </Avatar>
                  <span>{task.assignee.name}</span>
                </div>

                <div className="flex items-center gap-1 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{task.deadline}</span>
                </div>
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
        ))}
      </CardContent>
    </Card>
  );
}