import { apiClient } from './client';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Manager' | 'Team';
  isActive: boolean;
  avatar?: string;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserPagination {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface UsersResponse {
  users: User[];
  pagination: UserPagination;
}

export interface UserResponse {
  user: User & {
    org: {
      id: string;
      name: string;
      slug?: string;
    };
    projects?: Array<{
      id: string;
      name: string;
      status: string;
    }>;
    sessions?: Array<{
      id: string;
      deviceInfo?: string;
      createdAt: string;
      expiresAt: string;
    }>;
  };
}

export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  role: 'Admin' | 'Manager' | 'Team';
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  role?: 'Admin' | 'Manager' | 'Team';
  isActive?: boolean;
}

export interface UsersFilters {
  page?: number;
  limit?: number;
  search?: string;
  role?: 'Admin' | 'Manager' | 'Team';
  isActive?: boolean;
}

export const usersApi = {
  // Get users with filtering and pagination (Admin only)
  getUsers: async (filters: UsersFilters = {}): Promise<UsersResponse> => {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });

    const response = await apiClient.get(`/users?${params.toString()}`);
    return response;
  },

  // Get all users in organization (for adding to projects, etc.)
  getOrganizationUsers: async (): Promise<{ users: User[] }> => {
    const response = await apiClient.get('/users/organization');
    return response;
  },

  // Get a specific user by ID
  getUser: async (userId: string): Promise<UserResponse> => {
    const response = await apiClient.get(`/users/${userId}`);
    return response;
  },

  // Create a new user
  createUser: async (userData: CreateUserRequest): Promise<UserResponse> => {
    const response = await apiClient.post('/users', userData);
    return response;
  },

  // Update a user
  updateUser: async (userId: string, userData: UpdateUserRequest): Promise<UserResponse> => {
    const response = await apiClient.put(`/users/${userId}`, userData);
    return response;
  },

  // Deactivate a user
  deactivateUser: async (userId: string): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/users/${userId}`);
    return response;
  },

  // Reactivate a user
  reactivateUser: async (userId: string): Promise<UserResponse & { message: string }> => {
    const response = await apiClient.post(`/users/${userId}/reactivate`);
    return response;
  },
};

// Helper functions for user data
export const userHelpers = {
  // Get user initials for avatar
  getInitials: (name: string): string => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  },

  // Get role badge variant for styling
  getRoleBadgeVariant: (role: string) => {
    switch (role) {
      case 'Admin': return 'destructive';
      case 'Manager': return 'default';
      case 'Team': return 'secondary';
      default: return 'outline';
    }
  },

  // Get status badge variant
  getStatusBadgeVariant: (isActive: boolean) => {
    return isActive ? 'default' : 'secondary';
  },

  // Format last login date
  formatLastLogin: (lastLoginAt?: string): string => {
    if (!lastLoginAt) return 'Never';
    return new Date(lastLoginAt).toLocaleDateString();
  },

  // Format created date
  formatCreatedDate: (createdAt: string): string => {
    return new Date(createdAt).toLocaleDateString();
  },

  // Get role display name
  getRoleDisplayName: (role: string): string => {
    switch (role) {
      case 'Team': return 'Team Member';
      case 'Manager': return 'Manager';
      case 'Admin': return 'Administrator';
      default: return role;
    }
  },

  // Get role description
  getRoleDescription: (role: string): string => {
    switch (role) {
      case 'Admin': return 'Full access to all features and user management';
      case 'Manager': return 'Can manage projects and team members';
      case 'Team': return 'Basic access to assigned projects and tasks';
      default: return '';
    }
  },
};
