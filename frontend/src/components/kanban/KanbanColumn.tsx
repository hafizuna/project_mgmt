import React from 'react'
import { Droppable } from '@hello-pangea/dnd'
import { KanbanTaskCard } from './KanbanTaskCard'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

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

interface KanbanColumnProps {
  column: {
    id: string
    title: string
    bgColor: string
    borderColor: string
  }
  tasks: Task[]
  onTaskClick: (task: Task) => void
  onAddTask?: () => void
  isLoading?: boolean
  canEdit?: boolean
  currentUserId?: string
  userRole?: string // System role (Admin, Manager, Team)
  projectRole?: string // Project membership role (Owner, Manager, Member)
}

export function KanbanColumn({ 
  column, 
  tasks, 
  onTaskClick, 
  onAddTask, 
  isLoading,
  canEdit = true,
  currentUserId,
  userRole,
  projectRole
}: KanbanColumnProps) {
  return (
    <div className="flex-shrink-0 w-80">
      <Card className={`${column.bgColor} ${column.borderColor} border-2 h-full`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {column.title}
              <Badge variant="secondary" className="h-6 px-2 text-xs">
                {tasks.length}
              </Badge>
            </CardTitle>
            {onAddTask && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={onAddTask}
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0 flex-1">
          <Droppable droppableId={column.id}>
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`min-h-[200px] transition-colors rounded-md p-2 ${
                  snapshot.isDraggingOver ? 'bg-white/50 ring-2 ring-primary/20' : ''
                }`}
              >
                <div className="space-y-3">
                  {isLoading ? (
                    // Loading skeleton
                    Array.from({ length: 3 }).map((_, index) => (
                      <div key={index} className="animate-pulse">
                        <Card>
                          <CardContent className="p-4">
                            <div className="space-y-2">
                              <div className="h-4 bg-gray-200 rounded"></div>
                              <div className="h-3 bg-gray-150 rounded w-3/4"></div>
                              <div className="h-6 bg-gray-100 rounded w-1/2"></div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    ))
                  ) : tasks.length === 0 ? (
                    // Empty state
                    <div className="text-center py-8 text-muted-foreground">
                      <div className="text-4xl mb-2">📋</div>
                      <div className="text-sm">No tasks yet</div>
                      {column.id === 'TODO' && onAddTask && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-2"
                          onClick={onAddTask}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add task
                        </Button>
                      )}
                    </div>
                  ) : (
                    // Task cards
                    tasks.map((task, index) => {
                      // Check if user can edit this specific task
                      // Logic matches backend exactly:
                      // 1. Admin users: full access
                      // 2. Manager users OR project Managers: full access
                      // 3. Team users: only their assigned/reported tasks
                      const canEditTask = canEdit && (
                        userRole === 'Admin' ||
                        userRole === 'Manager' ||
                        projectRole === 'Manager' ||
                        projectRole === 'Owner' ||
                        (userRole === 'Team' && (
                          task.assignee?.id === currentUserId || 
                          task.reporter?.id === currentUserId
                        ))
                      )
                      
                      return (
                        <KanbanTaskCard
                          key={task.id}
                          task={task}
                          index={index}
                          onClick={() => onTaskClick(task)}
                          canEdit={canEditTask}
                        />
                      )
                    })
                  )}
                </div>
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </CardContent>
      </Card>
    </div>
  )
}