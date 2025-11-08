import React, { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { 
  Search, 
  Plus, 
  Filter, 
  Calendar,
  User,
  MessageCircle,
  BookOpen,
  Eye,
  Edit
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { knowledgeApi } from '@/lib/knowledge-api'
import { 
  KnowledgeEntry, 
  KnowledgeCategory, 
  CATEGORY_LABELS, 
  CATEGORY_COLORS,
  KnowledgeFilters
} from '@/types/knowledge'
import { formatDistanceToNow } from 'date-fns'
import { useAuthStore } from '@/lib/stores/auth'

export default function KnowledgeList() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuthStore()
  
  // Get filters from URL params
  const filters: KnowledgeFilters = {
    search: searchParams.get('search') || '',
    category: (searchParams.get('category') as KnowledgeCategory) || undefined,
    page: parseInt(searchParams.get('page') || '1'),
    limit: parseInt(searchParams.get('limit') || '10')
  }

  const [localSearch, setLocalSearch] = useState(filters.search || '')

  // Fetch knowledge entries
  const { data, isLoading, error } = useQuery({
    queryKey: ['knowledge', filters],
    queryFn: () => knowledgeApi.getEntries(filters),
  })

  // Update URL params when filters change
  const updateFilters = (newFilters: Partial<KnowledgeFilters>) => {
    const params = new URLSearchParams(searchParams)
    
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value) {
        params.set(key, value.toString())
      } else {
        params.delete(key)
      }
    })
    
    setSearchParams(params)
  }

  // Handle search with debounce
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      updateFilters({ search: localSearch, page: 1 })
    }, 500)

    return () => clearTimeout(debounceTimer)
  }, [localSearch])

  // Handle category filter change
  const handleCategoryChange = (category: string) => {
    updateFilters({ 
      category: category === 'all' ? undefined : category as KnowledgeCategory,
      page: 1 
    })
  }

  // Handle page change
  const handlePageChange = (page: number) => {
    updateFilters({ page })
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">Error loading knowledge base: {error.message}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Knowledge Base</h1>
          <p className="text-muted-foreground">
            Centralized repository for insights, research, and lessons learned
          </p>
        </div>
        <Link to="/knowledge/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Entry
          </Button>
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search entries..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filters.category || 'all'} onValueChange={handleCategoryChange}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : data?.entries.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No entries found</h3>
            <p className="text-muted-foreground text-center mb-4">
              {filters.search || filters.category 
                ? 'No entries match your current filters.' 
                : 'Start building your knowledge base by creating your first entry.'}
            </p>
            <Link to="/knowledge/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create First Entry
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {data?.entries.map((entry) => (
            <KnowledgeEntryCard key={entry.id} entry={entry} currentUser={user} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && data.pagination.totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            {data.pagination.hasPrevPage && (
              <PaginationItem>
                <PaginationPrevious 
                  onClick={() => handlePageChange(filters.page! - 1)}
                  className="cursor-pointer"
                />
              </PaginationItem>
            )}
            
            {[...Array(data.pagination.totalPages)].map((_, i) => {
              const page = i + 1
              if (
                page === 1 || 
                page === data.pagination.totalPages ||
                Math.abs(page - filters.page!) <= 2
              ) {
                return (
                  <PaginationItem key={page}>
                    <PaginationLink
                      onClick={() => handlePageChange(page)}
                      isActive={page === filters.page}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                )
              } else if (
                page === filters.page! - 3 || 
                page === filters.page! + 3
              ) {
                return <span key={page} className="px-2">...</span>
              }
              return null
            })}
            
            {data.pagination.hasNextPage && (
              <PaginationItem>
                <PaginationNext 
                  onClick={() => handlePageChange(filters.page! + 1)}
                  className="cursor-pointer"
                />
              </PaginationItem>
            )}
          </PaginationContent>
        </Pagination>
      )}
    </div>
  )
}

// Knowledge Entry Card Component
interface KnowledgeEntryCardProps {
  entry: KnowledgeEntry
  currentUser: any
}

function KnowledgeEntryCard({ entry, currentUser }: KnowledgeEntryCardProps) {
  const canEdit = currentUser?.role === 'Admin' || entry.authorId === currentUser?.id

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge className={CATEGORY_COLORS[entry.category]}>
                {CATEGORY_LABELS[entry.category]}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
              </span>
            </div>
            <CardTitle className="mb-2">
              <Link 
                to={`/knowledge/${entry.id}`}
                className="hover:text-primary transition-colors"
              >
                {entry.title}
              </Link>
            </CardTitle>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <Avatar className="h-4 w-4">
                  <AvatarImage src={entry.author.avatar || undefined} />
                  <AvatarFallback className="text-xs">
                    {entry.author.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span>{entry.author.name}</span>
              </div>
              {entry._count && entry._count.comments > 0 && (
                <div className="flex items-center gap-1">
                  <MessageCircle className="h-3 w-3" />
                  <span>{entry._count.comments}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to={`/knowledge/${entry.id}`}>
              <Button variant="ghost" size="sm">
                <Eye className="h-4 w-4" />
              </Button>
            </Link>
            {canEdit && (
              <Link to={`/knowledge/${entry.id}/edit`}>
                <Button variant="ghost" size="sm">
                  <Edit className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </CardHeader>
      
      {entry.tags.length > 0 && (
        <CardContent>
          <div className="flex flex-wrap gap-1">
            {entry.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  )
}