import { apiClient } from './client';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  settings?: {
    allowProjectCreation?: boolean;
    defaultTaskPriority?: 'Low' | 'Medium' | 'High';
    requireTaskDescription?: boolean;
    maxProjectMembers?: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationUsage {
  totalUsers: number;
  activeProjects: number;
  totalProjects: number;
  openTasks: number;
  totalTasks: number;
}

export interface OrganizationUpdateData {
  name?: string;
  settings?: {
    allowProjectCreation?: boolean;
    defaultTaskPriority?: 'Low' | 'Medium' | 'High';
    requireTaskDescription?: boolean;
    maxProjectMembers?: number;
  };
}

export interface InviteUserData {
  email: string;
  name: string;
  role: 'Admin' | 'Manager' | 'Team';
}

export const organizationApi = {
  // Get current organization
  getOrganization: async (): Promise<Organization> => {
    const response = await apiClient.get('/organization');
    return response.organization;
  },

  // Update organization
  updateOrganization: async (data: OrganizationUpdateData): Promise<Organization> => {
    const response = await apiClient.put('/organization', data);
    return response.organization;
  },

  // Get organization usage statistics
  getUsage: async (): Promise<OrganizationUsage> => {
    const response = await apiClient.get('/organization/usage');
    return response.usage;
  },

  // Invite a user to the organization
  inviteUser: async (data: InviteUserData): Promise<{ message: string; user: any }> => {
    const response = await apiClient.post('/organization/invite', data);
    return response;
  },
};
