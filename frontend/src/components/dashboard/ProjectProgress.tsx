import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { FolderKanban, Users } from "lucide-react";

interface Project {
  id: string;
  name: string;
  description: string;
  progress: number;
  status: "active" | "planning" | "completed" | "on-hold";
  teamMembers: Array<{
    name: string;
    initials: string;
    avatar?: string;
  }>;
  tasksCompleted: number;
  totalTasks: number;
  deadline: string;
}

const mockProjects: Project[] = [
  {
    id: "1",
    name: "Website Redesign",
    description: "Complete overhaul of the company website",
    progress: 68,
    status: "active",
    teamMembers: [
      { name: "Alice Smith", initials: "AS" },
      { name: "Bob Wilson", initials: "BW" },
      { name: "Carol Davis", initials: "CD" },
    ],
    tasksCompleted: 17,
    totalTasks: 25,
    deadline: "2024-04-15",
  },
  {
    id: "2",
    name: "Mobile App Development",
    description: "Native mobile app for iOS and Android",
    progress: 42,
    status: "active",
    teamMembers: [
      { name: "David Brown", initials: "DB" },
      { name: "Emma Johnson", initials: "EJ" },
    ],
    tasksCompleted: 8,
    totalTasks: 19,
    deadline: "2024-05-30",
  },
  {
    id: "3",
    name: "Database Migration",
    description: "Migrate legacy database to new infrastructure",
    progress: 85,
    status: "active",
    teamMembers: [
      { name: "Frank Wilson", initials: "FW" },
      { name: "Grace Lee", initials: "GL" },
      { name: "Henry Davis", initials: "HD" },
      { name: "Ivy Chen", initials: "IC" },
    ],
    tasksCompleted: 22,
    totalTasks: 26,
    deadline: "2024-03-20",
  },
];

const statusColors = {
  active: "bg-success text-success-foreground",
  planning: "bg-warning text-warning-foreground",
  completed: "bg-info text-info-foreground",
  "on-hold": "bg-muted text-muted-foreground",
};

export function ProjectProgress() {
  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <FolderKanban className="h-5 w-5" />
          Active Projects
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {mockProjects.map((project) => (
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

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{project.progress}%</span>
              </div>
              <Progress value={project.progress} className="h-2" />
            </div>

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
          </div>
        ))}
      </CardContent>
    </Card>
  );
}