import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Clock, 
  Users, 
  AlertCircle,
  CheckCircle,
  Activity
} from "lucide-react";
import { useQuery } from '@tanstack/react-query';
import { dashboardQueries } from '@/lib/api/dashboard';

// Mock chart component (in a real app, you'd use recharts, chart.js, etc.)
function SimpleBarChart({ data, className }: { data: Array<{name: string; value: number}>; className?: string }) {
  const maxValue = Math.max(...data.map(d => d.value));
  
  return (
    <div className={`space-y-2 ${className}`}>
      {data.map((item, index) => (
        <div key={index} className="flex items-center gap-3">
          <div className="w-16 text-sm text-muted-foreground">{item.name}</div>
          <div className="flex-1 flex items-center gap-2">
            <Progress value={(item.value / maxValue) * 100} className="h-2" />
            <span className="text-sm font-medium w-8">{item.value}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function TaskVelocityChart({ className }: { className?: string }) {
  const { data: velocityData, isLoading, error } = useQuery(dashboardQueries.velocityAnalytics());

  if (isLoading) {
    return (
      <Card className={`shadow-card ${className}`}>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Task Velocity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-16 h-3 bg-muted animate-pulse rounded" />
              <div className="flex-1 h-2 bg-muted animate-pulse rounded" />
              <div className="w-8 h-3 bg-muted animate-pulse rounded" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error || !velocityData) {
    return (
      <Card className={`shadow-card ${className}`}>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Task Velocity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Failed to load velocity data</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`shadow-card ${className}`}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Task Velocity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <SimpleBarChart data={velocityData.weeklyData} />
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          {velocityData.trend.isPositive ? (
            <TrendingUp className="h-4 w-4 text-green-500" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-500" />
          )}
          <span>Average: {velocityData.average} tasks/week</span>
          <span className="ml-auto">
            {velocityData.trend.isPositive ? '+' : '-'}{velocityData.trend.percentage}% trend
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function TeamProductivity({ className }: { className?: string }) {
  const { data: teamData, isLoading, error } = useQuery(dashboardQueries.teamAnalytics());

  const statusColors = {
    excellent: 'text-green-500',
    good: 'text-blue-500', 
    warning: 'text-yellow-500',
    critical: 'text-red-500'
  };

  return (
    <Card className={`shadow-card ${className}`}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Users className="h-5 w-5" />
          Team Productivity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-muted animate-pulse rounded-full" />
                <div className="space-y-1">
                  <div className="w-20 h-4 bg-muted animate-pulse rounded" />
                  <div className="w-16 h-3 bg-muted animate-pulse rounded" />
                </div>
              </div>
              <div className="w-16 h-4 bg-muted animate-pulse rounded" />
            </div>
          ))
        ) : error || !teamData ? (
          <p className="text-muted-foreground text-center py-4">Failed to load team data</p>
        ) : teamData.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">No team members found</p>
        ) : (
          teamData.map((member) => (
            <div key={member.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-primary-foreground">
                    {member.name[0]}
                  </span>
                </div>
                <div>
                  <div className="font-medium">{member.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {member.tasksCompleted} tasks completed • {member.efficiency}% efficiency
                  </div>
                  {member.overdueTasks > 0 && (
                    <div className="text-xs text-red-500">
                      {member.overdueTasks} overdue
                    </div>
                  )}
                </div>
              </div>
              <div className={`font-medium ${statusColors[member.status]}`}>
                {member.status}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function ProjectHealthMatrix({ className }: { className?: string }) {
  const { data: projects } = useQuery(dashboardQueries.projects());

  const healthColors = {
    excellent: 'bg-green-500',
    good: 'bg-blue-500',
    warning: 'bg-yellow-500', 
    critical: 'bg-red-500'
  };

  // Mock health calculation
  const projectsWithHealth = projects?.map(project => ({
    ...project,
    health: project.progress > 80 ? 'excellent' :
           project.progress > 60 ? 'good' :
           project.progress > 30 ? 'warning' : 'critical'
  })) || [];

  return (
    <Card className={`shadow-card ${className}`}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Target className="h-5 w-5" />
          Project Health Matrix
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {projectsWithHealth.map((project) => (
          <div key={project.id} className="flex items-center justify-between p-3 rounded-lg border">
            <div className="flex items-center gap-3">
              <div 
                className={`w-3 h-3 rounded-full ${healthColors[project.health as keyof typeof healthColors]}`}
              />
              <div>
                <div className="font-medium">{project.name}</div>
                <div className="text-xs text-muted-foreground">
                  {project.tasksCompleted}/{project.totalTasks} tasks • {project.progress}%
                </div>
              </div>
            </div>
            <Badge 
              variant="secondary"
              className={project.health === 'critical' ? 'bg-red-100 text-red-700' :
                        project.health === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                        project.health === 'good' ? 'bg-blue-100 text-blue-700' :
                        'bg-green-100 text-green-700'}
            >
              {project.health}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function PerformanceMetrics({ className }: { className?: string }) {
  const { data: metrics, isLoading, error } = useQuery(dashboardQueries.performanceAnalytics());

  const iconMap = {
    'Completion Rate': CheckCircle,
    'Team Utilization': Activity,
    'On-time Delivery': Clock
  };

  return (
    <Card className={`shadow-card ${className}`}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Performance Metrics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-muted animate-pulse rounded" />
                  <div className="w-24 h-4 bg-muted animate-pulse rounded" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-8 bg-muted animate-pulse rounded" />
                  <div className="w-12 h-4 bg-muted animate-pulse rounded" />
                </div>
              </div>
              <div className="w-full h-2 bg-muted animate-pulse rounded" />
            </div>
          ))
        ) : error || !metrics ? (
          <p className="text-muted-foreground text-center py-4">Failed to load performance data</p>
        ) : (
          metrics.map((metric, index) => {
            const isAboveTarget = metric.value >= metric.target;
            const IconComponent = iconMap[metric.label as keyof typeof iconMap] || Activity;
            
            return (
              <div key={index} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <IconComponent className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{metric.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">{metric.value}%</span>
                    <div className="flex items-center gap-1 text-sm">
                      {metric.trend.isPositive ? (
                        <TrendingUp className="h-3 w-3 text-green-500" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-red-500" />
                      )}
                      <span className={metric.trend.isPositive ? 'text-green-500' : 'text-red-500'}>
                        {metric.trend.value}%
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Target: {metric.target}%</span>
                    <span>{isAboveTarget ? '✓ Above target' : '! Below target'}</span>
                  </div>
                  <Progress 
                    value={metric.value} 
                    className="h-2" 
                  />
                  <div className="relative">
                    <div 
                      className="absolute top-0 w-0.5 h-4 bg-yellow-500"
                      style={{ left: `${metric.target}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

function RiskAnalysis({ className }: { className?: string }) {
  const { data: risks, isLoading, error } = useQuery(dashboardQueries.riskAnalytics());

  const severityColors = {
    high: 'bg-red-100 text-red-700 border-red-200',
    medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    low: 'bg-blue-100 text-blue-700 border-blue-200'
  };

  const getIconForRisk = (title: string) => {
    if (title.includes('overdue')) return AlertCircle;
    if (title.includes('unassigned')) return Users;
    if (title.includes('deadline')) return Clock;
    return AlertCircle;
  };

  return (
    <Card className={`shadow-card ${className}`}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Risk Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-3 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-4 h-4 bg-muted animate-pulse rounded" />
                <div className="w-32 h-4 bg-muted animate-pulse rounded" />
                <div className="w-16 h-4 bg-muted animate-pulse rounded ml-auto" />
              </div>
              <div className="w-48 h-3 bg-muted animate-pulse rounded" />
            </div>
          ))
        ) : error || !risks ? (
          <p className="text-muted-foreground text-center py-4">Failed to load risk data</p>
        ) : (
          risks.map((risk, index) => {
            const IconComponent = getIconForRisk(risk.title);
            
            return (
              <div 
                key={index} 
                className={`p-3 rounded-lg border ${severityColors[risk.severity]}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <IconComponent className="h-4 w-4" />
                  <span className="font-medium">{risk.title}</span>
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {risk.severity}
                  </Badge>
                </div>
                <p className="text-sm opacity-80">{risk.impact}</p>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

export function AdvancedAnalytics() {
  return (
    <div className="space-y-6">
      {/* Performance Overview */}
      <div className="grid gap-6 lg:grid-cols-2">
        <TaskVelocityChart />
        <PerformanceMetrics />
      </div>
      
      {/* Team and Project Analysis */}
      <div className="grid gap-6 lg:grid-cols-3">
        <TeamProductivity />
        <ProjectHealthMatrix />
        <RiskAnalysis />
      </div>
    </div>
  );
}