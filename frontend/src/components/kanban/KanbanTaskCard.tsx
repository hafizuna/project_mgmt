import React from 'react'
import { Draggable } from '@hello-pangea/dnd'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Calendar, User, Clock, Lock } from 'lucide-react'

interface Task {
  id: string
  title: string
  description?: string
  status: string
  priority: string
  assignee?: {
    id: string
    name: string
    email: string
    avatar?: string
  }
  dueDate?: string
  labels?: string[]
  estimate?: number
}

interface KanbanTaskCardProps {
  task: Task
  index: number
  onClick: () => void
  canEdit?: boolean
  currentUserId?: string
}

const priorityColors = {
  LOW: 'bg-gray-100 text-gray-800 border-gray-200',
  MEDIUM: 'bg-blue-100 text-blue-800 border-blue-200',
  HIGH: 'bg-orange-100 text-orange-800 border-orange-200',
  CRITICAL: 'bg-red-100 text-red-800 border-red-200'
}

interface TaskCardContentProps {
  task: Task
  getInitials: (name: string) => string
  formatDate: (dateString: string) => string
  isOverdue: (dueDate?: string) => boolean
  readonly: boolean
}

function TaskCardContent({ task, getInitials, formatDate, isOverdue, readonly }: TaskCardContentProps) {
  return (
    <div className={`space-y-3 ${readonly ? 'opacity-80' : ''}`}>
      {/* Task Title */}
      <h3 className="font-medium text-sm line-clamp-2 leading-tight">
        {task.title}
      </h3>

      {/* Priority Badge */}
      <Badge 
        className={`text-xs ${priorityColors[task.priority as keyof typeof priorityColors]} border`}
      >
        {task.priority}
      </Badge>

      {/* Task Details */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        {/* Assignee */}
        {task.assignee && (
          <div className="flex items-center gap-1">
            <Avatar className="h-5 w-5">
              <AvatarImage src={task.assignee.avatar} />
              <AvatarFallback className="text-xs">
                {getInitials(task.assignee.name)}
              </AvatarFallback>
            </Avatar>
          </div>
        )}

        {/* Due Date */}
        {task.dueDate && (
          <div className={`flex items-center gap-1 ${
            isOverdue(task.dueDate) ? 'text-red-600' : ''
          }`}>
            <Calendar className="h-3 w-3" />
            <span>{formatDate(task.dueDate)}</span>
          </div>
        )}
      </div>

      {/* Estimate */}
      {task.estimate && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{task.estimate}h</span>
        </div>
      )}

      {/* Labels */}
      {task.labels && task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {task.labels.slice(0, 2).map((label, idx) => (
            <Badge key={idx} variant="outline" className="text-xs px-1 py-0 h-5">
              {label}
            </Badge>
          ))}
          {task.labels.length > 2 && (
            <Badge variant="outline" className="text-xs px-1 py-0 h-5">
              +{task.labels.length - 2}
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}

export function KanbanTaskCard({ task, index, onClick, canEdit = true, currentUserId }: KanbanTaskCardProps) {
  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false
    return new Date(dueDate) < new Date()
  }

  const isAssignedToCurrentUser = task.assignee?.id === currentUserId
  const canUserEdit = canEdit && (isAssignedToCurrentUser || canEdit)

  // If task can't be edited, render as a static card
  if (!canUserEdit) {
    return (
      <Card
        className="cursor-pointer transition-all hover:shadow-sm opacity-75 border-dashed"
        onClick={onClick}
      >
        <CardContent className="p-4 relative">
          {/* Read-only indicator */}
          <div className="absolute top-2 right-2">
            <Lock className="h-3 w-3 text-muted-foreground" />
          </div>
          <TaskCardContent 
            task={task} 
            getInitials={getInitials} 
            formatDate={formatDate} 
            isOverdue={isOverdue} 
            readonly={true}
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Draggable draggableId={task.id} index={index} isDragDisabled={!canUserEdit}>
      {(provided, snapshot) => (
        <Card
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`cursor-pointer transition-all hover:shadow-md ${
            snapshot.isDragging ? 'shadow-lg rotate-1 scale-105' : ''
          } ${isAssignedToCurrentUser ? 'ring-2 ring-blue-200' : ''}`}
          onClick={onClick}
        >
          <CardContent className="p-4">
            <TaskCardContent 
              task={task} 
              getInitials={getInitials} 
              formatDate={formatDate} 
              isOverdue={isOverdue} 
              readonly={false}
            />
          </CardContent>
        </Card>
      )}
    </Draggable>
  )
}