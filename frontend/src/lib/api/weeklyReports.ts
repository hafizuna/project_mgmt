import { apiClient } from './client';

// Types
export enum SubmissionStatus {
  DRAFT = 'Draft',
  SUBMITTED = 'Submitted',
  UNDER_REVIEW = 'UnderReview',
  APPROVED = 'Approved',
  NEEDS_REVISION = 'NeedsRevision',
  OVERDUE = 'Overdue'
}

export enum StressLevel {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  CRITICAL = 'Critical'
}

export enum Priority {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  CRITICAL = 'Critical'
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface WeeklyPlanGoal {
  id?: string;
  title: string;
  description?: string;
  priority: Priority;
  estimatedHours?: number;
}

export interface WeeklyPlanPriority {
  id?: string;
  task: string;
  importance: Priority;
  estimatedTime?: string;
}

export interface TimeAllocation {
  projectWork: number;
  meetings: number;
  administration: number;
  learning: number;
  other: number;
}

export interface WeeklyPlanBlocker {
  description: string;
  impact: Priority;
  supportNeeded?: string;
}

export interface WeeklyPlan {
  id: string;
  userId: string;
  orgId: string;
  templateId?: string;
  weekStart: string;
  weekEnd: string;
  goals: WeeklyPlanGoal[];
  priorities: WeeklyPlanPriority[];
  timeAllocation: TimeAllocation;
  focusAreas: string[];
  blockers?: WeeklyPlanBlocker[];
  status: SubmissionStatus;
  submittedAt?: string;
  isOverdue: boolean;
  createdAt: string;
  updatedAt: string;
  user?: User;
  template?: {
    name: string;
    type: string;
  };
  weeklyReport?: {
    id: string;
    status: SubmissionStatus;
    submittedAt?: string;
  };
  _count?: {
    comments: number;
  };
}

export interface WeeklyReportAchievement {
  goal: string;
  description?: string;
  completionLevel: number;
  impact: Priority;
}

export interface WeeklyReportGoalProgress {
  goalId?: string;
  title: string;
  planned: string;
  actual: string;
  completionPercentage: number;
  notes?: string;
}

export interface WeeklyReportBlocker {
  description: string;
  impact: Priority;
  resolved: boolean;
  resolution?: string;
}

export interface WeeklyReportSupport {
  type: 'Technical' | 'Resource' | 'Training' | 'Process' | 'Other';
  description: string;
  urgency: Priority;
}

export interface WeeklyReport {
  id: string;
  userId: string;
  orgId: string;
  templateId?: string;
  weeklyPlanId: string;
  weekStart: string;
  weekEnd: string;
  achievements: WeeklyReportAchievement[];
  goalsProgress: WeeklyReportGoalProgress[];
  actualTimeSpent: TimeAllocation;
  blockers?: WeeklyReportBlocker[];
  support?: WeeklyReportSupport[];
  learnings?: string[];
  nextWeekPrep?: string;
  productivityScore?: number;
  satisfactionScore?: number;
  stressLevel?: StressLevel;
  status: SubmissionStatus;
  submittedAt?: string;
  isOverdue: boolean;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  createdAt: string;
  updatedAt: string;
  user?: User;
  template?: {
    name: string;
    type: string;
  };
  weeklyPlan?: {
    id: string;
    goals: WeeklyPlanGoal[];
    priorities: WeeklyPlanPriority[];
    timeAllocation: TimeAllocation;
  };
  _count?: {
    comments: number;
  };
}

export interface CreateWeeklyPlanRequest {
  goals: WeeklyPlanGoal[];
  priorities: WeeklyPlanPriority[];
  timeAllocation: TimeAllocation;
  focusAreas: string[];
  blockers?: WeeklyPlanBlocker[];
}

export interface CreateWeeklyReportRequest {
  achievements: WeeklyReportAchievement[];
  goalsProgress: WeeklyReportGoalProgress[];
  actualTimeSpent: TimeAllocation;
  blockers?: WeeklyReportBlocker[];
  support?: WeeklyReportSupport[];
  learnings?: string[];
  nextWeekPrep?: string;
  productivityScore?: number;
  satisfactionScore?: number;
  stressLevel?: StressLevel;
}

export interface WeeklyPlansResponse {
  plans: WeeklyPlan[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface WeeklyReportsResponse {
  reports: WeeklyReport[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ReportFilters {
  page?: number;
  limit?: number;
  status?: SubmissionStatus;
  userId?: string;
  weekStart?: string;
  sortBy?: 'weekStart' | 'submittedAt' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface CurrentWeekStatus {
  weekStart: string;
  weekEnd: string;
  plan: {
    exists: boolean;
    status?: SubmissionStatus;
    submittedAt?: string;
    dueDate: string;
    isOverdue: boolean;
    canEdit: boolean;
  };
  report: {
    exists: boolean;
    status?: SubmissionStatus;
    submittedAt?: string;
    dueDate: string;
    isOverdue: boolean;
    canEdit: boolean;
    requiresPlan: boolean;
  };
}

export interface AdminDashboardData {
  weekStart: string;
  weekEnd: string;
  summary: {
    totalUsers: number;
    planSubmissions: number;
    reportSubmissions: number;
    planComplianceRate: number;
    reportComplianceRate: number;
    overduePlans: number;
    overdueReports: number;
  };
  userStatus: Array<{
    id: string;
    name: string;
    email: string;
    avatar?: string;
    role: string;
    plan: {
      exists: boolean;
      status?: SubmissionStatus;
      submittedAt?: string;
      isOverdue: boolean;
    };
    report: {
      exists: boolean;
      status?: SubmissionStatus;
      submittedAt?: string;
      isOverdue: boolean;
    };
  }>;
}

// Weekly Reports API functions
export const weeklyReportsApi = {
  // Get weekly plans with filtering
  getWeeklyPlans: async (filters: ReportFilters = {}): Promise<WeeklyPlansResponse> => {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString());
      }
    });

    const response = await apiClient.get(`/reports/weekly-plans?${params.toString()}`);
    return response;
  },

  // Get weekly reports with filtering
  getWeeklyReports: async (filters: ReportFilters = {}): Promise<WeeklyReportsResponse> => {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString());
      }
    });

    const response = await apiClient.get(`/reports/weekly-reports?${params.toString()}`);
    return response;
  },

  // Get specific weekly plan by ID
  getWeeklyPlan: async (id: string): Promise<WeeklyPlan> => {
    const response = await apiClient.get(`/reports/weekly-plans/${id}`);
    return response;
  },

  // Get specific weekly report by ID
  getWeeklyReport: async (id: string): Promise<WeeklyReport> => {
    const response = await apiClient.get(`/reports/weekly-reports/${id}`);
    return response;
  },

  // Create or update weekly plan
  createOrUpdateWeeklyPlan: async (data: CreateWeeklyPlanRequest): Promise<WeeklyPlan> => {
    const response = await apiClient.post('/reports/weekly-plans', data);
    return response;
  },

  // Create or update weekly report
  createOrUpdateWeeklyReport: async (data: CreateWeeklyReportRequest): Promise<WeeklyReport> => {
    const response = await apiClient.post('/reports/weekly-reports', data);
    return response;
  },

  // Submit weekly plan
  submitWeeklyPlan: async (id: string): Promise<WeeklyPlan> => {
    const response = await apiClient.post(`/reports/weekly-plans/${id}/submit`);
    return response;
  },

  // Submit weekly report
  submitWeeklyReport: async (id: string): Promise<WeeklyReport> => {
    const response = await apiClient.post(`/reports/weekly-reports/${id}/submit`);
    return response;
  },

  // Get current week status
  getCurrentWeekStatus: async (): Promise<CurrentWeekStatus> => {
    const response = await apiClient.get('/reports/current-week-status');
    return response;
  },

  // Get admin dashboard (Admin/Manager only)
  getAdminDashboard: async (weekStart?: string): Promise<AdminDashboardData> => {
    const params = new URLSearchParams();
    if (weekStart) {
      params.append('weekStart', weekStart);
    }
    
    const response = await apiClient.get(`/reports/admin/dashboard?${params.toString()}`);
    return response;
  },
};