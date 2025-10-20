import { apiClient } from './client'

// Dashboard Statistics Types
export interface DashboardStats {
  totalTasks: number
  completedTasks: number
  overdueTasks: number
  completionRate: number
  activeProjects: number
  totalProjects: number
  teamMembers: number
  recentMeetings: number
  upcomingMeetings: number
  trends: {
    tasks: {
      value: number
      isPositive: boolean
    }
    completedTasks: {
      value: number
      isPositive: boolean
    }
  }
}

// Project Progress Types
export interface DashboardProject {
  id: string
  name: string
  description: string
  status: 'active' | 'planning' | 'completed' | 'on-hold'
  progress: number
  tasksCompleted: number
  totalTasks: number
  taskBreakdown?: {
    todo: number
    inProgress: number
    review: number
    done: number
  }
  deadline: string | null
  teamMembers: Array<{
    name: string
    initials: string
    id: string
  }>
}

// Task Types
export interface DashboardTask {
  id: string
  title: string
  description: string
  status: 'todo' | 'in-progress' | 'completed'
  priority: 'high' | 'medium' | 'low'
  assignee: {
    name: string
    initials: string
    id: string
  } | null
  deadline: string | null
  progress: number
  project: string
}

// Deadline Types
export interface DashboardDeadline {
  id: string
  title: string
  date: string
  priority: 'high' | 'medium' | 'low'
  type: 'task' | 'meeting'
  project: string | null
}

// Activity Types
export interface DashboardActivity {
  id: string
  action: string
  description: string
  user: string
  createdAt: string
  metadata: any
}

// Analytics Types
export interface TeamMember {
  id: string
  name: string
  avatar?: string
  tasksCompleted: number
  totalTasks: number
  efficiency: number
  status: 'excellent' | 'good' | 'warning' | 'critical'
  overdueTasks: number
}

export interface VelocityData {
  weeklyData: Array<{
    name: string
    value: number
    date: string
  }>
  average: number
  trend: {
    percentage: number
    direction: 'up' | 'down'
    isPositive: boolean
  }
}

export interface PerformanceMetric {
  label: string
  value: number
  target: number
  trend: {
    value: number
    isPositive: boolean
  }
}

export interface RiskItem {
  title: string
  severity: 'high' | 'medium' | 'low'
  impact: string
  count: number
}

// Query Parameters
export interface DashboardQueryParams {
  dateFrom?: string
  dateTo?: string
  projectId?: string
  assignedToMe?: boolean
}

class DashboardAPI {
  /**
   * Get overall dashboard statistics
   */
  async getStats(params?: DashboardQueryParams): Promise<DashboardStats> {
    const searchParams = new URLSearchParams()
    if (params?.dateFrom) searchParams.set('dateFrom', params.dateFrom)
    if (params?.dateTo) searchParams.set('dateTo', params.dateTo)
    if (params?.projectId) searchParams.set('projectId', params.projectId)
    if (params?.assignedToMe) searchParams.set('assignedToMe', params.assignedToMe.toString())

    const query = searchParams.toString()
    const url = query ? `/dashboard/stats?${query}` : '/dashboard/stats'
    
    return await apiClient.get(url)
  }

  /**
   * Get project progress data
   */
  async getProjects(params?: DashboardQueryParams): Promise<DashboardProject[]> {
    const searchParams = new URLSearchParams()
    if (params?.dateFrom) searchParams.set('dateFrom', params.dateFrom)
    if (params?.dateTo) searchParams.set('dateTo', params.dateTo)
    if (params?.projectId) searchParams.set('projectId', params.projectId)
    if (params?.assignedToMe) searchParams.set('assignedToMe', params.assignedToMe.toString())

    const query = searchParams.toString()
    const url = query ? `/dashboard/projects?${query}` : '/dashboard/projects'
    
    return await apiClient.get(url)
  }

  /**
   * Get recent and priority tasks
   */
  async getTasks(params?: DashboardQueryParams): Promise<DashboardTask[]> {
    const searchParams = new URLSearchParams()
    if (params?.dateFrom) searchParams.set('dateFrom', params.dateFrom)
    if (params?.dateTo) searchParams.set('dateTo', params.dateTo)
    if (params?.projectId) searchParams.set('projectId', params.projectId)
    if (params?.assignedToMe) searchParams.set('assignedToMe', params.assignedToMe.toString())

    const query = searchParams.toString()
    const url = query ? `/dashboard/tasks?${query}` : '/dashboard/tasks'
    
    return await apiClient.get(url)
  }

  /**
   * Get upcoming deadlines (tasks and meetings)
   */
  async getDeadlines(params?: DashboardQueryParams): Promise<DashboardDeadline[]> {
    const searchParams = new URLSearchParams()
    if (params?.dateFrom) searchParams.set('dateFrom', params.dateFrom)
    if (params?.dateTo) searchParams.set('dateTo', params.dateTo)
    if (params?.projectId) searchParams.set('projectId', params.projectId)
    if (params?.assignedToMe) searchParams.set('assignedToMe', params.assignedToMe.toString())

    const query = searchParams.toString()
    const url = query ? `/dashboard/deadlines?${query}` : '/dashboard/deadlines'
    
    return await apiClient.get(url)
  }

  /**
   * Get recent activity feed
   */
  async getActivity(): Promise<DashboardActivity[]> {
    return await apiClient.get('/dashboard/activity')
  }

  /**
   * Get team productivity analytics
   */
  async getTeamAnalytics(): Promise<TeamMember[]> {
    return await apiClient.get('/dashboard/analytics/team')
  }

  /**
   * Get task velocity analytics
   */
  async getVelocityAnalytics(): Promise<VelocityData> {
    return await apiClient.get('/dashboard/analytics/velocity')
  }

  /**
   * Get performance metrics
   */
  async getPerformanceAnalytics(): Promise<PerformanceMetric[]> {
    return await apiClient.get('/dashboard/analytics/performance')
  }

  /**
   * Get risk analysis
   */
  async getRiskAnalytics(): Promise<RiskItem[]> {
    return await apiClient.get('/dashboard/analytics/risks')
  }
}

export const dashboardAPI = new DashboardAPI()

// Hook-like functions for easier integration with React Query
export const dashboardQueries = {
  stats: (params?: DashboardQueryParams) => ({
    queryKey: ['dashboard', 'stats', params],
    queryFn: () => dashboardAPI.getStats(params),
  }),
  
  projects: (params?: DashboardQueryParams) => ({
    queryKey: ['dashboard', 'projects', params],
    queryFn: () => dashboardAPI.getProjects(params),
  }),
  
  tasks: (params?: DashboardQueryParams) => ({
    queryKey: ['dashboard', 'tasks', params],
    queryFn: () => dashboardAPI.getTasks(params),
  }),
  
  deadlines: (params?: DashboardQueryParams) => ({
    queryKey: ['dashboard', 'deadlines', params],
    queryFn: () => dashboardAPI.getDeadlines(params),
  }),
  
  activity: () => ({
    queryKey: ['dashboard', 'activity'],
    queryFn: () => dashboardAPI.getActivity(),
  }),
  
  // Analytics queries
  teamAnalytics: () => ({
    queryKey: ['dashboard', 'analytics', 'team'],
    queryFn: () => dashboardAPI.getTeamAnalytics(),
  }),
  
  velocityAnalytics: () => ({
    queryKey: ['dashboard', 'analytics', 'velocity'],
    queryFn: () => dashboardAPI.getVelocityAnalytics(),
  }),
  
  performanceAnalytics: () => ({
    queryKey: ['dashboard', 'analytics', 'performance'],
    queryFn: () => dashboardAPI.getPerformanceAnalytics(),
  }),
  
  riskAnalytics: () => ({
    queryKey: ['dashboard', 'analytics', 'risks'],
    queryFn: () => dashboardAPI.getRiskAnalytics(),
  }),
}