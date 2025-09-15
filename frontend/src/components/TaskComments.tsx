import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, Edit3, Trash2, Reply, MoreVertical } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { toast } from 'sonner';
import { taskCommentsApi, TaskComment } from '../lib/api/taskComments';
import { useAuthStore } from '../lib/stores/auth';

interface TaskCommentsProps {
  taskId: string;
}

interface CommentItemProps {
  comment: TaskComment;
  onUpdate: (commentId: string, content: string) => void;
  onDelete: (commentId: string) => void;
  onReply: (parentId: string, content: string) => void;
  currentUserId?: string;
  level?: number;
}

const CommentItem: React.FC<CommentItemProps> = ({ 
  comment, 
  onUpdate, 
  onDelete, 
  onReply, 
  currentUserId,
  level = 0 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const canEdit = currentUserId === comment.authorId;
  const marginLeft = level * 24; // Indent replies

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim()) return;
    
    try {
      setIsSubmitting(true);
      await onUpdate(comment.id, editContent.trim());
      setIsEditing(false);
      toast.success('Comment updated');
    } catch (error) {
      toast.error('Failed to update comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelEdit = () => {
    setEditContent(comment.content);
    setIsEditing(false);
  };

  const handleSubmitReply = async () => {
    if (!replyContent.trim()) return;
    
    try {
      setIsSubmitting(true);
      await onReply(comment.id, replyContent.trim());
      setReplyContent('');
      setIsReplying(false);
      toast.success('Reply added');
    } catch (error) {
      toast.error('Failed to add reply');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-3" style={{ marginLeft: `${marginLeft}px` }}>
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Avatar className="w-8 h-8">
            <AvatarImage src={`https://avatar.vercel.sh/${comment.author.email}`} />
            <AvatarFallback className="text-xs">
              {getInitials(comment.author.name)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{comment.author.name}</span>
                <span className="text-xs text-gray-500">{formatDate(comment.createdAt)}</span>
                {comment.updatedAt !== comment.createdAt && (
                  <span className="text-xs text-gray-400">(edited)</span>
                )}
              </div>
              
              {canEdit && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <MoreVertical className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setIsEditing(true)}>
                      <Edit3 className="w-3 h-3 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                          <Trash2 className="w-3 h-3 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Comment</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this comment? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => onDelete(comment.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            
            {isEditing ? (
              <div className="space-y-2">
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="min-h-[80px]"
                  disabled={isSubmitting}
                />
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    onClick={handleSaveEdit}
                    disabled={isSubmitting || !editContent.trim()}
                  >
                    Save
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={handleCancelEdit}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                {level < 2 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-500 hover:text-gray-700 p-0 h-auto"
                    onClick={() => setIsReplying(!isReplying)}
                  >
                    <Reply className="w-3 h-3 mr-1" />
                    Reply
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
        
        {isReplying && (
          <div className="mt-3 ml-11">
            <div className="space-y-2">
              <Textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Write a reply..."
                className="min-h-[80px]"
                disabled={isSubmitting}
              />
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={handleSubmitReply}
                  disabled={isSubmitting || !replyContent.trim()}
                >
                  <Send className="w-3 h-3 mr-1" />
                  Reply
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setIsReplying(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Render replies */}
      {comment.replies?.length > 0 && (
        <div className="space-y-3">
          {comment.replies.map(reply => (
            <CommentItem
              key={reply.id}
              comment={reply}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onReply={onReply}
              currentUserId={currentUserId}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const TaskComments: React.FC<TaskCommentsProps> = ({ taskId }) => {
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuthStore();

  const fetchComments = async () => {
    try {
      setLoading(true);
      const commentsData = await taskCommentsApi.getTaskComments(taskId);
      setComments(commentsData);
    } catch (error) {
      toast.error('Failed to load comments');
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [taskId]);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    
    try {
      setSubmitting(true);
      await taskCommentsApi.addComment(taskId, { content: newComment.trim() });
      setNewComment('');
      await fetchComments(); // Refresh comments
      toast.success('Comment added');
    } catch (error) {
      toast.error('Failed to add comment');
      console.error('Error adding comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateComment = async (commentId: string, content: string) => {
    await taskCommentsApi.updateComment(commentId, { content });
    await fetchComments(); // Refresh comments
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await taskCommentsApi.deleteComment(commentId);
      await fetchComments(); // Refresh comments
      toast.success('Comment deleted');
    } catch (error) {
      toast.error('Failed to delete comment');
      console.error('Error deleting comment:', error);
    }
  };

  const handleAddReply = async (parentId: string, content: string) => {
    await taskCommentsApi.addComment(taskId, { content, parentId });
    await fetchComments(); // Refresh comments
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                <div className="h-16 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add Comment */}
      <div className="space-y-3">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          className="min-h-[100px]"
          disabled={submitting}
        />
        <div className="flex justify-end">
          <Button 
            onClick={handleAddComment}
            disabled={submitting || !newComment.trim()}
          >
            <Send className="w-4 h-4 mr-2" />
            {submitting ? 'Adding...' : 'Add Comment'}
          </Button>
        </div>
      </div>

      {/* Comments List */}
      {comments.length === 0 ? (
        <div className="text-center py-8">
          <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No comments yet</p>
          <p className="text-sm text-gray-400">Be the first to comment on this task</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map(comment => (
            <CommentItem
              key={comment.id}
              comment={comment}
              onUpdate={handleUpdateComment}
              onDelete={handleDeleteComment}
              onReply={handleAddReply}
              currentUserId={user?.id}
            />
          ))}
        </div>
      )}
    </div>
  );
};