import { apiClient } from './client';

export interface TaskComment {
  id: string;
  content: string;
  taskId: string;
  authorId: string;
  parentId?: string;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  replies: TaskComment[];
}

export interface TaskHistoryEntry {
  id: string;
  taskId: string;
  userId: string;
  action: string;
  field?: string;
  oldValue?: string;
  newValue?: string;
  description: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
}

export interface CreateCommentRequest {
  content: string;
  parentId?: string; // For replies
}

export interface UpdateCommentRequest {
  content: string;
}

export interface CommentsResponse {
  comments: TaskComment[];
}

export interface HistoryResponse {
  history: TaskHistoryEntry[];
}

// Task Comments API functions
export const taskCommentsApi = {
  // Get all comments for a task
  getTaskComments: async (taskId: string): Promise<TaskComment[]> => {
    const response = await apiClient.get<CommentsResponse>(`/tasks/${taskId}/comments`);
    return response.comments;
  },

  // Add a comment to a task
  addComment: async (taskId: string, data: CreateCommentRequest): Promise<TaskComment> => {
    const response = await apiClient.post(`/tasks/${taskId}/comments`, data);
    return response.comment;
  },

  // Update a comment
  updateComment: async (commentId: string, data: UpdateCommentRequest): Promise<TaskComment> => {
    const response = await apiClient.put(`/comments/${commentId}`, data);
    return response.comment;
  },

  // Delete a comment
  deleteComment: async (commentId: string): Promise<void> => {
    await apiClient.delete(`/comments/${commentId}`);
  },

  // Get task history/activity timeline
  getTaskHistory: async (taskId: string): Promise<TaskHistoryEntry[]> => {
    const response = await apiClient.get<HistoryResponse>(`/tasks/${taskId}/history`);
    return response.history;
  }
};