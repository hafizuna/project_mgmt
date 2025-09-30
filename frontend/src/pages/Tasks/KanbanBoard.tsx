import React, { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { KanbanBoard as BoardComponent } from '@/components/kanban/KanbanBoard'
import { Task, tasksApi } from '@/lib/api/tasks'
import { projectsApi } from '@/lib/api/projects'
import { useAuthStore } from '@/lib/stores/auth'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, List, LayoutGrid, Users, Calendar, TrendingUp } from 'lucide-react'

export default function KanbanBoardPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuthStore()
  
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [membership, setMembership] = useState<any>(null)
  
  const selectedProjectId = searchParams.get('project') || ''

  // Fetch data
  const fetchProjects = async () => {
    try {
      const response = await projectsApi.getProjects({ limit: 100 })
      setProjects(response.projects)
    } catch (error) {
      console.error('Error fetching projects:', error)
      toast.error('Failed to fetch projects')
    }
  }

  const fetchMembership = async () => {
    if (!selectedProjectId || !user) {
      setMembership(null)
      return
    }

    try {
      const members = await projectsApi.getProjectMembers(selectedProjectId)
      const userMembership = members.find((m: any) => m.userId === user.id)
      setMembership(userMembership)
    } catch (error) {
      console.error('Error fetching membership:', error)
      setMembership(null)
    }
  }

  const fetchTasks = async () => {
    if (!selectedProjectId) {
      setTasks([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const response = await tasksApi.getProjectTasks(selectedProjectId, { limit: 100 })
      setTasks(response.tasks)
    } catch (error) {
      toast.error('Failed to fetch tasks')
      console.error('Error fetching tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  useEffect(() => {
    fetchMembership()
    fetchTasks()
  }, [selectedProjectId])

  // Handle task move with optimistic updates
  const handleTaskMove = async (taskId: string, newStatus: string, newPosition: number) => {
    // Optimistic update
    setTasks(prevTasks => {
      const updatedTasks = prevTasks.map(task => 
        task.id === taskId 
          ? { ...task, status: newStatus as any, position: newPosition }
          : task
      )
      return updatedTasks
    })

    try {
      // Use single task update for now (can be optimized to bulk later)
      await tasksApi.updateTask(taskId, { 
        status: newStatus as any,
        position: newPosition 
      })
    } catch (error) {
      // Revert on error
      fetchTasks()
      throw error // Let the board component handle the error feedback
    }
  }

  const handleTaskClick = (task: Task) => {
    // Navigate to task detail page
    navigate(`/tasks/${task.id}`)
  }

  const handleAddTask = (status?: string) => {
    const url = `/tasks/new?project=${selectedProjectId}`
    const urlWithStatus = status && status !== 'TODO' ? `${url}&status=${status}` : url
    navigate(urlWithStatus)
  }

  const selectedProject = projects.find(p => p.id === selectedProjectId)

  // Calculate project statistics
  const projectStats = selectedProject ? {
    totalTasks: tasks.length,
    todoTasks: tasks.filter(t => t.status === 'TODO').length,
    inProgressTasks: tasks.filter(t => t.status === 'IN_PROGRESS').length,
    reviewTasks: tasks.filter(t => t.status === 'REVIEW').length,
    onHoldTasks: tasks.filter(t => t.status === 'ON_HOLD').length,
    doneTasks: tasks.filter(t => t.status === 'DONE').length,
    overdueTasks: tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date()).length,
    assignedMembers: new Set(tasks.filter(t => t.assignee).map(t => t.assignee!.id)).size,
  } : null

  const canManageTasks = membership?.role === 'Owner' || membership?.role === 'Manager'

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <LayoutGrid className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">Task Board</h1>
          </div>
          {selectedProject && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>{selectedProject.name}</span>
              <Badge variant="outline" className="text-xs">
                Kanban View
              </Badge>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {/* View Toggle */}
          <Button 
            variant="outline" 
            onClick={() => navigate(`/tasks?project=${selectedProjectId}`)}
          >
            <List className="w-4 h-4 mr-2" />
            List View
          </Button>
          
          {/* Add Task */}
          {selectedProjectId && canManageTasks && (
            <Button onClick={() => handleAddTask('TODO')}>
              <Plus className="w-4 h-4 mr-2" />
              New Task
            </Button>
          )}
        </div>
      </div>

      {/* Project Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Select Project
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select 
            value={selectedProjectId || 'all'} 
            onValueChange={(value) => {
              if (value === 'all') {
                setSearchParams({})
              } else {
                setSearchParams({ project: value })
              }
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a project to view its task board" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Select a project...</SelectItem>
              {projects.map(project => (
                <SelectItem key={project.id} value={project.id}>
                  <div className="flex items-center gap-2">
                    <span>{project.name}</span>
                    {project.status && (
                      <Badge variant="secondary" className="text-xs">
                        {project.status}
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Project Statistics */}
      {selectedProject && projectStats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 bg-gray-500 rounded-full"></div>
                <span className="text-sm font-medium">Total Tasks</span>
              </div>
              <div className="text-2xl font-bold mt-1">{projectStats.totalTasks}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm font-medium">In Progress</span>
              </div>
              <div className="text-2xl font-bold mt-1">{projectStats.inProgressTasks}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium">Completed</span>
              </div>
              <div className="text-2xl font-bold mt-1">{projectStats.doneTasks}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Team Members</span>
              </div>
              <div className="text-2xl font-bold mt-1">{projectStats.assignedMembers}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Board */}
      {selectedProjectId ? (
        <div className="bg-white rounded-lg border p-6">
          <BoardComponent
            tasks={tasks}
            onTaskMove={handleTaskMove}
            onTaskClick={handleTaskClick}
            onAddTask={canManageTasks ? handleAddTask : undefined}
            isLoading={loading}
            canEdit={true} // Allow component-level filtering based on role and task assignment
            currentUserId={user?.id}
            userRole={user?.role} // System role (Admin, Manager, Team)
            projectRole={membership?.role} // Project membership role (Owner, Manager, Member)
          />
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-6xl mb-4">🎯</div>
            <h3 className="text-xl font-semibold mb-2">Select a Project</h3>
            <p className="text-muted-foreground mb-6">
              Choose a project from the dropdown above to view its task board and start managing your workflow.
            </p>
            <Button onClick={() => navigate('/projects')}>
              <TrendingUp className="w-4 h-4 mr-2" />
              View All Projects
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Help text for first-time users */}
      {selectedProjectId && !loading && tasks.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <div className="text-4xl mb-4">📋</div>
            <h3 className="text-lg font-semibold mb-2">No tasks in this project yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first task to get started with the Kanban board. You can drag tasks between columns to update their status.
            </p>
            {canManageTasks && (
              <Button onClick={() => handleAddTask('TODO')}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Task
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}