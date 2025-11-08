import React, { useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Calendar,
  User,
  MessageCircle,
  Send,
  Reply,
  MoreVertical
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { knowledgeApi } from '@/lib/knowledge-api'
import { 
  KnowledgeEntry, 
  KnowledgeComment, 
  CATEGORY_LABELS, 
  CATEGORY_COLORS 
} from '@/types/knowledge'
import { formatDistanceToNow, format } from 'date-fns'
import { useAuthStore } from '@/lib/stores/auth'

export default function KnowledgeDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  const [commentContent, setCommentContent] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')

  // Fetch knowledge entry
  const { data, isLoading, error } = useQuery({
    queryKey: ['knowledge', id],
    queryFn: () => knowledgeApi.getEntry(id!),
    enabled: !!id,
  })

  // Archive mutation
  const archiveMutation = useMutation({
    mutationFn: () => knowledgeApi.archiveEntry(id!),
    onSuccess: () => {
      toast.success('Knowledge entry archived successfully')
      queryClient.invalidateQueries({ queryKey: ['knowledge'] })
      navigate('/knowledge')
    },
    onError: (error) => {
      toast.error(`Failed to archive entry: ${error.message}`)
    },
  })

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: (content: string) => knowledgeApi.addComment(id!, { content }),
    onSuccess: () => {
      toast.success('Comment added successfully')
      queryClient.invalidateQueries({ queryKey: ['knowledge', id] })
      setCommentContent('')
    },
    onError: (error) => {
      toast.error(`Failed to add comment: ${error.message}`)
    },
  })

  // Add reply mutation
  const addReplyMutation = useMutation({
    mutationFn: ({ content, parentId }: { content: string, parentId: string }) => 
      knowledgeApi.addComment(id!, { content, parentId }),
    onSuccess: () => {
      toast.success('Reply added successfully')
      queryClient.invalidateQueries({ queryKey: ['knowledge', id] })
      setReplyContent('')
      setReplyTo(null)
    },
    onError: (error) => {
      toast.error(`Failed to add reply: ${error.message}`)
    },
  })

  const handleAddComment = () => {
    if (!commentContent.trim()) return
    addCommentMutation.mutate(commentContent)
  }

  const handleAddReply = (parentId: string) => {
    if (!replyContent.trim()) return
    addReplyMutation.mutate({ content: replyContent, parentId })
  }

  const handleArchive = () => {
    archiveMutation.mutate()
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-destructive mb-4">Error loading knowledge entry: {error.message}</p>
          <Button onClick={() => navigate('/knowledge')}>
            Back to Knowledge Base
          </Button>
        </div>
      </div>
    )
  }

  if (isLoading || !data) {
    return <KnowledgeDetailSkeleton />
  }

  const entry = data.entry
  const canEdit = user?.role === 'Admin' || entry.authorId === user?.id

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Header with back button */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate('/knowledge')} className="rounded-full">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-3">
                <Badge className={`${CATEGORY_COLORS[entry.category]} text-xs font-medium px-3 py-1`}>
                  {CATEGORY_LABELS[entry.category]}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                </span>
              </div>
            </div>

            {canEdit && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="rounded-full">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link to={`/knowledge/${entry.id}/edit`}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Entry
                    </Link>
                  </DropdownMenuItem>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Archive Entry
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Archive Knowledge Entry</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to archive this knowledge entry? 
                          It will be hidden from the main list but can be restored later.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleArchive}>Archive</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Title Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 dark:from-slate-100 dark:via-slate-300 dark:to-slate-100 bg-clip-text text-transparent mb-4">
            {entry.title}
          </h1>
          
          {/* Author info */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <Avatar className="h-12 w-12 ring-2 ring-primary/20">
              <AvatarImage src={entry.author.avatar || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">
                {entry.author.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="text-center">
              <p className="font-semibold text-foreground">{entry.author.name}</p>
              <p className="text-sm text-muted-foreground">
                {format(new Date(entry.createdAt), 'PPP')}
                {entry.updatedAt !== entry.createdAt && (
                  <span className="block">Updated {formatDistanceToNow(new Date(entry.updatedAt), { addSuffix: true })}</span>
                )}
              </p>
            </div>
          </div>

          {/* Tags */}
          {entry.tags.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              {entry.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="rounded-full px-3 py-1 text-xs font-medium">
                  #{tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {Object.entries(entry.content).map(([key, value], index) => {
            const isFullWidth = value.length > 200 || index === Object.entries(entry.content).length - 1
            return (
              <div 
                key={key} 
                className={`${isFullWidth ? 'lg:col-span-2' : ''} group`}
              >
                <Card className="h-full border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white via-slate-50/50 to-white dark:from-slate-800 dark:via-slate-800/50 dark:to-slate-800 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <CardHeader className="pb-3 relative">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-1 w-12 bg-gradient-to-r from-primary to-primary/50 rounded-full" />
                      <h3 className="font-bold text-base text-foreground tracking-wide">
                        {key.replace(/([A-Z])/g, ' $1')
                           .replace(/^./, str => str.toUpperCase())
                           .replace(/([a-z])([A-Z])/g, '$1 $2')}
                      </h3>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 relative">
                    <div className="prose prose-sm max-w-none text-foreground/90 leading-relaxed">
                      <div className="whitespace-pre-wrap font-medium text-sm leading-7">
                        {value}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )
          })}
        </div>

        {/* Comments Section */}
        <Card className="border-0 shadow-xl bg-gradient-to-br from-white via-slate-50/30 to-white dark:from-slate-800 dark:via-slate-800/50 dark:to-slate-800">
          <CardHeader className="pb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-gradient-to-br from-primary/20 to-primary/10">
                <MessageCircle className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-xl font-bold">
                Discussion ({entry.comments?.length || 0})
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Add Comment */}
            <div className="space-y-4">
              <div className="relative">
                <Textarea
                  placeholder="Share your thoughts or insights..."
                  value={commentContent}
                  onChange={(e) => setCommentContent(e.target.value)}
                  className="min-h-24 resize-none border-2 focus:border-primary/50 bg-background/50 backdrop-blur-sm"
                />
                <div className="absolute bottom-3 right-3">
                  <Button 
                    size="sm"
                    onClick={handleAddComment}
                    disabled={!commentContent.trim() || addCommentMutation.isPending}
                    className="rounded-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all duration-200"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {entry.comments && entry.comments.length > 0 ? (
              <div className="space-y-6">
                <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
                {entry.comments.map((comment) => (
                  <CommentItem
                    key={comment.id}
                    comment={comment}
                    onReply={(commentId) => setReplyTo(commentId)}
                    replyTo={replyTo}
                    replyContent={replyContent}
                    onReplyContentChange={setReplyContent}
                    onSubmitReply={handleAddReply}
                    onCancelReply={() => {
                      setReplyTo(null)
                      setReplyContent('')
                    }}
                    isSubmittingReply={addReplyMutation.isPending}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="p-4 rounded-full bg-muted/50 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <MessageCircle className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground font-medium mb-2">Start the conversation</p>
                <p className="text-sm text-muted-foreground/70">Be the first to share your thoughts and insights!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Comment Item Component
interface CommentItemProps {
  comment: KnowledgeComment
  onReply: (commentId: string) => void
  replyTo: string | null
  replyContent: string
  onReplyContentChange: (content: string) => void
  onSubmitReply: (commentId: string) => void
  onCancelReply: () => void
  isSubmittingReply: boolean
}

function CommentItem({
  comment,
  onReply,
  replyTo,
  replyContent,
  onReplyContentChange,
  onSubmitReply,
  onCancelReply,
  isSubmittingReply
}: CommentItemProps) {
  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={comment.author.avatar || undefined} />
          <AvatarFallback className="text-xs">
            {comment.author.name.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{comment.author.name}</span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
            </span>
          </div>
          <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onReply(comment.id)}
            className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
          >
            <Reply className="mr-1 h-3 w-3" />
            Reply
          </Button>
        </div>
      </div>

      {/* Reply Form */}
      {replyTo === comment.id && (
        <div className="ml-11 space-y-2">
          <Textarea
            placeholder="Write a reply..."
            value={replyContent}
            onChange={(e) => onReplyContentChange(e.target.value)}
            className="min-h-16 text-sm"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => onSubmitReply(comment.id)}
              disabled={!replyContent.trim() || isSubmittingReply}
            >
              <Send className="mr-1 h-3 w-3" />
              Reply
            </Button>
            <Button size="sm" variant="ghost" onClick={onCancelReply}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="ml-11 space-y-3">
          {comment.replies.map((reply) => (
            <div key={reply.id} className="flex gap-3">
              <Avatar className="h-6 w-6">
                <AvatarImage src={reply.author.avatar || undefined} />
                <AvatarFallback className="text-xs">
                  {reply.author.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{reply.author.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{reply.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Loading Skeleton
function KnowledgeDetailSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-8 w-96" />
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <Skeleton className="h-16 w-full" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    </div>
  )
}