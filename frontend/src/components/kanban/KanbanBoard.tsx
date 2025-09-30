import React from 'react'
import { DragDropContext, DropResult } from '@hello-pangea/dnd'
import { KanbanColumn } from './KanbanColumn'
import { toast } from 'sonner'

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

interface KanbanBoardProps {
  tasks: Task[]
  onTaskMove: (taskId: string, newStatus: string, newPosition: number) => Promise<void>
  onTaskClick: (task: Task) => void
  onAddTask?: (status?: string) => void
  isLoading?: boolean
  canEdit?: boolean
  currentUserId?: string
  userRole?: string // System role (Admin, Manager, Team)
  projectRole?: string // Project membership role (Owner, Manager, Member)
}

const COLUMNS = [
  { 
    id: 'TODO', 
    title: 'To Do', 
    bgColor: 'bg-gray-50', 
    borderColor: 'border-gray-200' 
  },
  { 
    id: 'IN_PROGRESS', 
    title: 'In Progress', 
    bgColor: 'bg-blue-50', 
    borderColor: 'border-blue-200' 
  },
  { 
    id: 'REVIEW', 
    title: 'Review', 
    bgColor: 'bg-yellow-50', 
    borderColor: 'border-yellow-200' 
  },
  { 
    id: 'ON_HOLD', 
    title: 'On Hold', 
    bgColor: 'bg-orange-50', 
    borderColor: 'border-orange-200' 
  },
  { 
    id: 'DONE', 
    title: 'Done', 
    bgColor: 'bg-green-50', 
    borderColor: 'border-green-200' 
  }
]

export function KanbanBoard({ 
  tasks, 
  onTaskMove, 
  onTaskClick, 
  onAddTask, 
  isLoading,
  canEdit = true,
  currentUserId,
  userRole,
  projectRole
}: KanbanBoardProps) {
  
  const onDragStart = () => {
    // Optional: Add vibration or sound feedback
    if (navigator.vibrate) {
      navigator.vibrate(50)
    }
  }

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) {
      return
    }

    const taskId = result.draggableId
    const sourceStatus = result.source.droppableId
    const destinationStatus = result.destination.droppableId
    const newPosition = result.destination.index

    // If dropped in the same position, do nothing
    if (
      sourceStatus === destinationStatus && 
      result.source.index === result.destination.index
    ) {
      return
    }

    try {
      // Optimistic update will be handled in the parent component
      await onTaskMove(taskId, destinationStatus, newPosition)
      
      // Success feedback
      const task = tasks.find(t => t.id === taskId)
      const column = COLUMNS.find(c => c.id === destinationStatus)
      
      if (task && column) {
        toast.success(
          `"${task.title}" moved to ${column.title}`, 
          {
            duration: 2000,
          }
        )
      }
    } catch (error) {
      console.error('Failed to move task:', error)
      toast.error('Failed to move task. Please try again.')
    }
  }

  // Group tasks by status
  const tasksByStatus = tasks.reduce((acc, task) => {
    if (!acc[task.status]) {
      acc[task.status] = []
    }
    acc[task.status].push(task)
    return acc
  }, {} as Record<string, Task[]>)

  // Sort tasks within each column by position if available
  Object.keys(tasksByStatus).forEach(status => {
    tasksByStatus[status].sort((a, b) => {
      // If tasks have position, sort by position, otherwise by creation date
      if ('position' in a && 'position' in b && a.position !== undefined && b.position !== undefined) {
        return (a.position as number) - (b.position as number)
      }
      return 0
    })
  })

  return (
    <div className="w-full">
      <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="flex gap-6 overflow-x-auto pb-6 px-1">
          {COLUMNS.map(column => (
            <KanbanColumn
              key={column.id}
              column={column}
              tasks={tasksByStatus[column.id] || []}
              onTaskClick={onTaskClick}
              onAddTask={onAddTask ? () => onAddTask(column.id) : undefined}
              isLoading={isLoading}
              canEdit={canEdit}
              currentUserId={currentUserId}
              userRole={userRole}
              projectRole={projectRole}
            />
          ))}
        </div>
      </DragDropContext>
      
      {/* Helpful text for users */}
      {!isLoading && tasks.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <div className="text-6xl mb-4">🎯</div>
          <h3 className="text-lg font-medium mb-2">No tasks in this project yet</h3>
          <p className="text-sm mb-4">
            Create your first task to get started with the Kanban board
          </p>
          {onAddTask && (
            <button
              onClick={() => onAddTask('TODO')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create First Task
            </button>
          )}
        </div>
      )}
    </div>
  )
}