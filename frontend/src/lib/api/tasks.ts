import { apiClient } from './client';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  estimate?: number;
  dueDate?: string;
  labels: string[];
  position?: number;
  projectId: string;
  assigneeId?: string;
  reporterId: string;
  createdAt: string;
  updatedAt: string;
  assignee?: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  reporter?: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  project?: {
    id: string;
    name: string;
    status: string;
  };
}

export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  REVIEW = 'REVIEW',
  DONE = 'DONE'
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  estimate?: number;
  dueDate?: string;
  labels?: string[];
  position?: number;
}

export interface UpdateTaskRequest extends Partial<CreateTaskRequest> {}

export interface TasksResponse {
  tasks: Task[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface TaskFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: TaskStatus | 'all';
  priority?: TaskPriority | 'all';
  assigneeId?: string | 'all';
  sortBy?: 'title' | 'status' | 'priority' | 'dueDate' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface AssignTaskRequest {
  assigneeId?: string;
}

// Tasks API functions
export const tasksApi = {
  // Get tasks for a specific project
  getProjectTasks: async (projectId: string, filters: TaskFilters = {}): Promise<TasksResponse> => {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== 'all') {
        params.append(key, value.toString());
      }
    });

    const response = await apiClient.get(`/projects/${projectId}/tasks?${params.toString()}`);
    return response;
  },

  // Get single task by ID
  getTask: async (id: string): Promise<Task> => {
    const response = await apiClient.get(`/tasks/${id}`);
    return response.task;
  },

  // Create new task in a project
  createTask: async (projectId: string, data: CreateTaskRequest): Promise<Task> => {
    const response = await apiClient.post(`/projects/${projectId}/tasks`, data);
    return response.task;
  },

  // Update task
  updateTask: async (id: string, data: UpdateTaskRequest): Promise<Task> => {
    const response = await apiClient.put(`/tasks/${id}`, data);
    return response.task;
  },

  // Delete task
  deleteTask: async (id: string): Promise<void> => {
    await apiClient.delete(`/tasks/${id}`);
  },

  // Assign or unassign task
  assignTask: async (id: string, data: AssignTaskRequest): Promise<Task> => {
    const response = await apiClient.put(`/tasks/${id}/assign`, data);
    return response.task;
  },
};