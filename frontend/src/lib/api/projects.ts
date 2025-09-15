import { apiClient } from './client';

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  startDate?: string;
  endDate?: string;
  budget?: number;
  orgId?: string;
  ownerId?: string;
  owner?: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  createdAt: string;
  updatedAt: string;
  members?: ProjectMember[];
  tasks?: any[];
  _count?: {
    members: number;
    tasks: number;
  };
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: ProjectRole;
  joinedAt: string;
  user: {
    id: string;
    email: string;
    name: string;
    avatar?: string;
    role: string;
    isActive: boolean;
  };
}

export enum ProjectStatus {
  PLANNING = 'PLANNING',
  IN_PROGRESS = 'IN_PROGRESS',
  ON_HOLD = 'ON_HOLD',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export enum ProjectPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum ProjectRole {
  Owner = 'Owner',
  Manager = 'Manager', 
  Member = 'Member'
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  startDate?: string;
  endDate?: string;
  budget?: number;
}

export interface UpdateProjectRequest extends Partial<CreateProjectRequest> {}

export interface ProjectsResponse {
  projects: Project[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ProjectFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: ProjectStatus | 'all';
  priority?: ProjectPriority | 'all';
  sortBy?: 'name' | 'status' | 'priority' | 'startDate' | 'endDate' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface AddMemberRequest {
  userId: string;
  role: ProjectRole;
}

export interface UpdateMemberRequest {
  role: ProjectRole;
}

// Projects API functions
export const projectsApi = {
  // Get all projects with filters
  getProjects: async (filters: ProjectFilters = {}): Promise<ProjectsResponse> => {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== 'all') {
        params.append(key, value.toString());
      }
    });

    const response = await apiClient.get(`/projects?${params.toString()}`);
    return response;
  },

  // Get single project by ID
  getProject: async (id: string): Promise<Project> => {
    const response = await apiClient.get(`/projects/${id}`);
    return response.project;
  },

  // Create new project
  createProject: async (data: CreateProjectRequest): Promise<Project> => {
    const response = await apiClient.post('/projects', data);
    return response.project;
  },

  // Update project
  updateProject: async (id: string, data: UpdateProjectRequest): Promise<Project> => {
    const response = await apiClient.put(`/projects/${id}`, data);
    return response.project;
  },

  // Delete project
  deleteProject: async (id: string): Promise<void> => {
    await apiClient.delete(`/projects/${id}`);
  },

  // Project member management
  getProjectMembers: async (projectId: string): Promise<ProjectMember[]> => {
    const response = await apiClient.get(`/projects/${projectId}/members`);
    return response.members;
  },

  addProjectMember: async (projectId: string, data: AddMemberRequest): Promise<ProjectMember> => {
    const response = await apiClient.post(`/projects/${projectId}/members`, data);
    return response.member;
  },

  updateProjectMember: async (projectId: string, userId: string, data: UpdateMemberRequest): Promise<ProjectMember> => {
    const response = await apiClient.put(`/projects/${projectId}/members/${userId}`, data);
    return response.member;
  },

  removeProjectMember: async (projectId: string, userId: string): Promise<void> => {
    await apiClient.delete(`/projects/${projectId}/members/${userId}`);
  },
};
