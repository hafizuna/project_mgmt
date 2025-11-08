export type KnowledgeCategory = 
  | 'MARKET_RESEARCH'
  | 'COMPETITOR_ANALYSIS' 
  | 'CUSTOMER_INSIGHTS'
  | 'LESSONS_LEARNED'

export type KnowledgeStatus = 'Draft' | 'Published' | 'Archived'

export interface KnowledgeEntry {
  id: string
  orgId: string
  authorId: string
  title: string
  category: KnowledgeCategory
  content: Record<string, string> // Template-specific structured content
  tags: string[]
  status: KnowledgeStatus
  createdAt: string
  updatedAt: string
  author: {
    id: string
    name: string
    email: string
    avatar?: string | null
  }
  comments?: KnowledgeComment[]
  _count?: {
    comments: number
  }
}

export interface KnowledgeComment {
  id: string
  entryId: string
  authorId: string
  content: string
  parentId?: string | null
  createdAt: string
  updatedAt: string
  author: {
    id: string
    name: string
    avatar?: string | null
  }
  replies?: KnowledgeComment[]
}

export interface KnowledgeTemplate {
  name: string
  fields: Record<string, TemplateField>
}

export interface TemplateField {
  type: 'text' | 'textarea'
  label: string
  required: boolean
}

export interface KnowledgeTemplates {
  MARKET_RESEARCH: KnowledgeTemplate
  COMPETITOR_ANALYSIS: KnowledgeTemplate
  CUSTOMER_INSIGHTS: KnowledgeTemplate
  LESSONS_LEARNED: KnowledgeTemplate
}

export interface KnowledgeListResponse {
  entries: KnowledgeEntry[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

export interface CreateKnowledgeEntryRequest {
  title: string
  category: KnowledgeCategory
  content: Record<string, string>
  tags?: string[]
  status?: KnowledgeStatus
}

export interface UpdateKnowledgeEntryRequest {
  title?: string
  category?: KnowledgeCategory
  content?: Record<string, string>
  tags?: string[]
  status?: KnowledgeStatus
}

export interface KnowledgeFilters {
  search?: string
  category?: KnowledgeCategory
  author?: string
  tags?: string
  page?: number
  limit?: number
}

export interface CreateCommentRequest {
  content: string
  parentId?: string
}

// Category display mappings
export const CATEGORY_LABELS: Record<KnowledgeCategory, string> = {
  MARKET_RESEARCH: 'Market Research',
  COMPETITOR_ANALYSIS: 'Competitor Analysis',
  CUSTOMER_INSIGHTS: 'Customer Insights',
  LESSONS_LEARNED: 'Lessons Learned',
}

export const CATEGORY_COLORS: Record<KnowledgeCategory, string> = {
  MARKET_RESEARCH: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  COMPETITOR_ANALYSIS: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  CUSTOMER_INSIGHTS: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  LESSONS_LEARNED: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
}