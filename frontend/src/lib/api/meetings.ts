import { apiClient } from './client';

// User interface for attendee/assignee references
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

// Project interface for meeting references
export interface ProjectRef {
  id: string;
  name: string;
}

// Task interface for action item references
export interface TaskRef {
  id: string;
  title: string;
  status: string;
}

// Agenda item interface
export interface AgendaItem {
  title: string;
  description?: string;
  duration?: number;
}

// Meeting interface
export interface Meeting {
  id: string;
  orgId: string;
  projectId?: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  
  // Meeting Type and Location
  type: MeetingType;
  location?: string;
  meetingLink?: string;
  videoRoom?: string;
  
  // Meeting Content
  agenda?: AgendaItem[];
  notes?: string;
  recording?: string;
  
  // Status and Metadata
  status: MeetingStatus;
  actualStartTime?: string;
  actualEndTime?: string;
  
  createdById: string;
  createdAt: string;
  updatedAt: string;
  createdBy: User;
  project?: ProjectRef;
  attendees: MeetingAttendee[];
  actionItems?: MeetingActionItem[];
  _count?: {
    actionItems: number;
  };
}

// Meeting attendee interface
export interface MeetingAttendee {
  id: string;
  meetingId: string;
  userId: string;
  isRequired: boolean;
  status: AttendeeStatus;
  respondedAt?: string;
  actuallyAttended?: boolean;
  user: User;
}

// Meeting action item interface
export interface MeetingActionItem {
  id: string;
  meetingId: string;
  description: string;
  assigneeId?: string;
  dueDate?: string;
  status: ActionItemStatus;
  taskId?: string;
  projectId?: string;
  createdAt: string;
  assignee?: User;
  task?: TaskRef;
  project?: ProjectRef;
}

// Enums matching backend
export enum MeetingType {
  Online = 'Online',
  InPerson = 'InPerson',
  Hybrid = 'Hybrid'
}

export enum MeetingStatus {
  Scheduled = 'Scheduled',
  InProgress = 'InProgress', 
  Completed = 'Completed',
  Cancelled = 'Cancelled'
}

export enum AttendeeStatus {
  Pending = 'Pending',
  Accepted = 'Accepted',
  Declined = 'Declined',
  Tentative = 'Tentative'
}

export enum ActionItemStatus {
  Open = 'Open',
  InProgress = 'InProgress',
  Completed = 'Completed'
}

export enum TaskPriority {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
  Critical = 'Critical'
}

// Request interfaces
export interface CreateMeetingRequest {
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  type: MeetingType;
  location?: string;
  meetingLink?: string;
  projectId?: string;
  agenda?: AgendaItem[];
  attendeeIds?: string[];
}

export interface UpdateMeetingRequest {
  title?: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  type?: MeetingType;
  location?: string;
  meetingLink?: string;
  status?: MeetingStatus;
  agenda?: AgendaItem[];
  notes?: string;
  actualStartTime?: string;
  actualEndTime?: string;
}

export interface AddAttendeeRequest {
  userId: string;
  isRequired?: boolean;
}

export interface UpdateAttendanceRequest {
  status: AttendeeStatus;
}

export interface CreateActionItemRequest {
  description: string;
  assigneeId?: string;
  dueDate?: string;
  projectId?: string;
}

export interface UpdateActionItemRequest {
  description?: string;
  assigneeId?: string;
  dueDate?: string;
  status?: ActionItemStatus;
  projectId?: string;
}

export interface ConvertToTaskRequest {
  title?: string;
  priority?: TaskPriority;
  projectId: string;
}

// Response interfaces
export interface MeetingsResponse {
  meetings: Meeting[];
}

export interface MeetingResponse {
  meeting: Meeting;
}

export interface AttendeeResponse {
  attendee: MeetingAttendee;
}

export interface ActionItemResponse {
  actionItem: MeetingActionItem;
}

export interface ActionItemsResponse {
  actionItems: MeetingActionItem[];
}

export interface ConvertToTaskResponse {
  actionItem: MeetingActionItem;
  task: TaskRef;
}

// Filter interfaces
export interface MeetingFilters {
  project?: string;
  status?: MeetingStatus | 'all';
  upcoming?: boolean;
}

export interface ActionItemFilters {
  status?: ActionItemStatus | 'all';
}

// Meeting API functions
export const meetingsApi = {
  // Get all meetings with filters
  getMeetings: async (filters: MeetingFilters = {}): Promise<Meeting[]> => {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== 'all') {
        if (key === 'upcoming' && typeof value === 'boolean') {
          params.append(key, value.toString());
        } else {
          params.append(key, value.toString());
        }
      }
    });

    const response = await apiClient.get(`/meetings?${params.toString()}`);
    return response.meetings;
  },

  // Get single meeting by ID
  getMeeting: async (id: string): Promise<Meeting> => {
    const response = await apiClient.get(`/meetings/${id}`);
    return response.meeting;
  },

  // Create new meeting
  createMeeting: async (data: CreateMeetingRequest): Promise<Meeting> => {
    const response = await apiClient.post('/meetings', data);
    return response.meeting;
  },

  // Update meeting
  updateMeeting: async (id: string, data: UpdateMeetingRequest): Promise<Meeting> => {
    const response = await apiClient.put(`/meetings/${id}`, data);
    return response.meeting;
  },

  // Delete meeting
  deleteMeeting: async (id: string): Promise<void> => {
    await apiClient.delete(`/meetings/${id}`);
  },

  // Meeting attendee management
  addAttendee: async (meetingId: string, data: AddAttendeeRequest): Promise<MeetingAttendee> => {
    const response = await apiClient.post(`/meetings/${meetingId}/attendees`, data);
    return response.attendee;
  },

  updateAttendance: async (meetingId: string, attendeeId: string, data: UpdateAttendanceRequest): Promise<MeetingAttendee> => {
    const response = await apiClient.put(`/meetings/${meetingId}/attendees/${attendeeId}`, data);
    return response.attendee;
  },

  removeAttendee: async (meetingId: string, attendeeId: string): Promise<void> => {
    await apiClient.delete(`/meetings/${meetingId}/attendees/${attendeeId}`);
  },

  // Action item management
  getActionItems: async (meetingId: string, filters: ActionItemFilters = {}): Promise<MeetingActionItem[]> => {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== 'all') {
        params.append(key, value.toString());
      }
    });

    const response = await apiClient.get(`/meetings/${meetingId}/action-items?${params.toString()}`);
    return response.actionItems;
  },

  createActionItem: async (meetingId: string, data: CreateActionItemRequest): Promise<MeetingActionItem> => {
    const response = await apiClient.post(`/meetings/${meetingId}/action-items`, data);
    return response.actionItem;
  },

  updateActionItem: async (id: string, data: UpdateActionItemRequest): Promise<MeetingActionItem> => {
    const response = await apiClient.put(`/action-items/${id}`, data);
    return response.actionItem;
  },

  deleteActionItem: async (id: string): Promise<void> => {
    await apiClient.delete(`/action-items/${id}`);
  },

  convertActionItemToTask: async (id: string, data: ConvertToTaskRequest): Promise<ConvertToTaskResponse> => {
    const response = await apiClient.post(`/action-items/${id}/convert-to-task`, data);
    return response;
  },
};