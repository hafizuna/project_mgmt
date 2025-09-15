import { StatsCard } from "@/components/dashboard/StatsCard";
import { TasksOverview } from "@/components/dashboard/TasksOverview";
import { ProjectProgress } from "@/components/dashboard/ProjectProgress";
import { CheckSquare, FolderKanban, Users, Clock, TrendingUp, Calendar, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here's what's happening with your projects today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Tasks"
          value={247}
          description="from last month"
          icon={CheckSquare}
          trend={{ value: 12, isPositive: true }}
        />
        <StatsCard
          title="Active Projects"
          value={8}
          description="in progress"
          icon={FolderKanban}
          trend={{ value: 2, isPositive: true }}
        />
        <StatsCard
          title="Team Members"
          value={24}
          description="across all projects"
          icon={Users}
        />
        <StatsCard
          title="Hours Logged"
          value="1,247"
          description="this week"
          icon={Clock}
          trend={{ value: 8, isPositive: true }}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Takes 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          <TasksOverview />
          
          {/* Quick Actions */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                <button className="flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left">
                  <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
                    <CheckSquare className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <h4 className="font-medium">Create Task</h4>
                    <p className="text-sm text-muted-foreground">Add a new task to your project</p>
                  </div>
                </button>
                
                <button className="flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left">
                  <div className="h-10 w-10 rounded-lg bg-info flex items-center justify-center">
                    <FolderKanban className="h-5 w-5 text-info-foreground" />
                  </div>
                  <div>
                    <h4 className="font-medium">New Project</h4>
                    <p className="text-sm text-muted-foreground">Start a new project</p>
                  </div>
                </button>
                
                <button className="flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left">
                  <div className="h-10 w-10 rounded-lg bg-success flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-success-foreground" />
                  </div>
                  <div>
                    <h4 className="font-medium">Schedule Meeting</h4>
                    <p className="text-sm text-muted-foreground">Plan a team meeting</p>
                  </div>
                </button>
                
                <button className="flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left">
                  <div className="h-10 w-10 rounded-lg bg-warning flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-warning-foreground" />
                  </div>
                  <div>
                    <h4 className="font-medium">View Reports</h4>
                    <p className="text-sm text-muted-foreground">Check project analytics</p>
                  </div>
                </button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Takes 1/3 width */}
        <div className="space-y-6">
          <ProjectProgress />
          
          {/* Upcoming Deadlines */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Upcoming Deadlines
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { title: "Website Launch", date: "Mar 15", priority: "high" },
                { title: "API Documentation", date: "Mar 18", priority: "medium" },
                { title: "User Testing Report", date: "Mar 22", priority: "low" },
              ].map((deadline, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div>
                    <p className="font-medium text-sm">{deadline.title}</p>
                    <p className="text-xs text-muted-foreground">{deadline.date}</p>
                  </div>
                  <div className={`h-3 w-3 rounded-full ${
                    deadline.priority === "high" ? "bg-priority-high" :
                    deadline.priority === "medium" ? "bg-priority-medium" : "bg-priority-low"
                  }`} />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}