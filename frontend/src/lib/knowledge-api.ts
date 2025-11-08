import { 
  KnowledgeEntry, 
  KnowledgeListResponse, 
  KnowledgeTemplates,
  KnowledgeComment,
  CreateKnowledgeEntryRequest,
  UpdateKnowledgeEntryRequest,
  KnowledgeFilters,
  CreateCommentRequest
} from '@/types/knowledge'
import { apiClient } from './api/client'

export const knowledgeApi = {
  // Get templates
  getTemplates: async (): Promise<{ templates: KnowledgeTemplates }> => {
    return apiClient.get('/knowledge/templates')
  },

  // List knowledge entries
  getEntries: async (filters: KnowledgeFilters = {}): Promise<KnowledgeListResponse> => {
    const searchParams = new URLSearchParams()
    
    if (filters.search) searchParams.append('search', filters.search)
    if (filters.category) searchParams.append('category', filters.category)
    if (filters.author) searchParams.append('author', filters.author)
    if (filters.tags) searchParams.append('tags', filters.tags)
    if (filters.page) searchParams.append('page', filters.page.toString())
    if (filters.limit) searchParams.append('limit', filters.limit.toString())

    const query = searchParams.toString()
    return apiClient.get(`/knowledge${query ? `?${query}` : ''}`)
  },

  // Get single knowledge entry
  getEntry: async (id: string): Promise<{ entry: KnowledgeEntry }> => {
    return apiClient.get(`/knowledge/${id}`)
  },

  // Create knowledge entry
  createEntry: async (data: CreateKnowledgeEntryRequest): Promise<{ entry: KnowledgeEntry }> => {
    return apiClient.post('/knowledge', data)
  },

  // Update knowledge entry
  updateEntry: async (
    id: string, 
    data: UpdateKnowledgeEntryRequest
  ): Promise<{ entry: KnowledgeEntry }> => {
    return apiClient.put(`/knowledge/${id}`, data)
  },

  // Archive knowledge entry
  archiveEntry: async (id: string): Promise<{ message: string }> => {
    return apiClient.delete(`/knowledge/${id}`)
  },

  // Get comments for entry
  getComments: async (entryId: string): Promise<{ comments: KnowledgeComment[] }> => {
    return apiClient.get(`/knowledge/${entryId}/comments`)
  },

  // Add comment to entry
  addComment: async (
    entryId: string, 
    data: CreateCommentRequest
  ): Promise<{ comment: KnowledgeComment }> => {
    return apiClient.post(`/knowledge/${entryId}/comments`, data)
  },
}
