import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, User, Calendar, Clock, Tag, CheckSquare, UserX } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../../components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';
import { tasksApi, Task, TaskStatus } from '../../lib/api/tasks';
import { projectsApi } from '../../lib/api/projects';
import { useAuthStore } from '../../lib/stores/auth';

const statusColors = {
  TODO: 'bg-gray-100 text-gray-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800', 
  REVIEW: 'bg-yellow-100 text-yellow-800',
  DONE: 'bg-green-100 text-green-800',
};

const priorityColors = {
  LOW: 'bg-gray-100 text-gray-800',
  MEDIUM: 'bg-blue-100 text-blue-800',
  HIGH: 'bg-orange-100 text-orange-800',
  CRITICAL: 'bg-red-100 text-red-800'
};

export default function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [task, setTask] = useState<Task | null>(null);
  const [projectMembers, setProjectMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [updatingAssignee, setUpdatingAssignee] = useState(false);

  useEffect(() => {
    if (id) {
      fetchTask(id);
    }
  }, [id]);

  const fetchTask = async (taskId: string) => {
    try {
      setLoading(true);
      const taskData = await tasksApi.getTask(taskId);
      setTask(taskData);
      
      // Fetch project members for assignment dropdown
      if (taskData.project) {
        const membersData = await projectsApi.getProjectMembers(taskData.project.id);
        setProjectMembers(membersData);
      }
    } catch (error) {
      toast.error('Failed to fetch task details');
      console.error('Error fetching task:', error);
      navigate('/tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: TaskStatus) => {
    if (!task) return;

    try {
      setUpdatingStatus(true);
      await tasksApi.updateTask(task.id, { status: newStatus });
      setTask(prev => prev ? { ...prev, status: newStatus } : null);
      toast.success('Task status updated');
    } catch (error) {
      toast.error('Failed to update task status');
      console.error('Error updating status:', error);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleAssigneeChange = async (newAssigneeId: string) => {
    if (!task) return;

    try {
      setUpdatingAssignee(true);
      const assigneeId = newAssigneeId === 'unassigned' ? undefined : newAssigneeId;
      const updatedTask = await tasksApi.assignTask(task.id, { 
        assigneeId 
      });
      setTask(updatedTask);
      toast.success('Task assignment updated');
    } catch (error) {
      toast.error('Failed to update task assignment');
      console.error('Error updating assignment:', error);
    } finally {
      setUpdatingAssignee(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!task) return;

    try {
      await tasksApi.deleteTask(task.id);
      toast.success('Task deleted successfully');
      if (task.project) {
        navigate(`/tasks?project=${task.project.id}`);
      } else {
        navigate('/tasks');
      }
    } catch (error) {
      toast.error('Failed to delete task');
      console.error('Error deleting task:', error);
    }
  };

  const canManageTask = user?.role === 'Admin' || user?.role === 'Manager';
  const canUpdateTask = canManageTask || task?.assigneeId === user?.id || task?.reporterId === user?.id;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="h-64 bg-gray-100 rounded"></div>
            </div>
            <div className="h-64 bg-gray-100 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="p-6 text-center">
        <p>Task not found</p>
        <Button onClick={() => navigate('/tasks')} className="mt-4">
          Back to Tasks
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/tasks')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{task.title}</h1>
          <div className="flex items-center gap-4 mt-2">
            <Badge className={statusColors[task.status]}>
              {task.status.replace('_', ' ')}
            </Badge>
            <Badge className={priorityColors[task.priority]}>
              {task.priority}
            </Badge>
            {task.project && (
              <span className="text-gray-600">
                in <strong>{task.project.name}</strong>
              </span>
            )}
          </div>
        </div>
        {canManageTask && (
          <div className="flex gap-2">
            <Button onClick={() => navigate(`/tasks/${task.id}/edit`)}>
              <Edit className="w-4 h-4 mr-2" />
              Edit Task
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="text-red-600 hover:text-red-700">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Task</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{task.title}"? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteTask}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Task Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Task Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {task.description && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Description</h3>
                  <p className="text-gray-600 whitespace-pre-wrap">{task.description}</p>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Due Date</h3>
                  {task.dueDate ? (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(task.dueDate)}</span>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No due date set</p>
                  )}
                </div>
                
                {task.estimate && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Estimate</h3>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">{task.estimate} hours</span>
                    </div>
                  </div>
                )}
              </div>
              
              {task.labels && task.labels.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Labels</h3>
                  <div className="flex flex-wrap gap-2">
                    {task.labels.map((label, index) => (
                      <Badge key={index} variant="outline" className="flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        {label}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="text-xs text-gray-500 pt-4 border-t">
                <p>Created: {formatDate(task.createdAt)}</p>
                <p>Last updated: {formatDate(task.updatedAt)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Task Management */}
        <div className="space-y-6">
          {/* Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5" />
                Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {canUpdateTask ? (
                <Select 
                  value={task.status} 
                  onValueChange={handleStatusChange}
                  disabled={updatingStatus}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(TaskStatus).map(status => (
                      <SelectItem key={status} value={status}>
                        {status.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Badge className={statusColors[task.status]}>
                  {task.status.replace('_', ' ')}
                </Badge>
              )}
            </CardContent>
          </Card>

          {/* Assignment */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Assignment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Assignee</h4>
                {canManageTask ? (
                  <Select 
                    value={task.assigneeId || 'unassigned'} 
                    onValueChange={handleAssigneeChange}
                    disabled={updatingAssignee}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">
                        <div className="flex items-center gap-2">
                          <UserX className="w-4 h-4" />
                          Unassigned
                        </div>
                      </SelectItem>
                      {projectMembers.map(member => (
                        <SelectItem key={member.user.id} value={member.user.id}>
                          <div className="flex items-center gap-2">
                            <Avatar className="w-4 h-4">
                              <AvatarImage src={`https://avatar.vercel.sh/${member.user.email}`} />
                              <AvatarFallback className="text-xs">
                                {getInitials(member.user.name)}
                              </AvatarFallback>
                            </Avatar>
                            {member.user.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div>
                    {task.assignee ? (
                      <div className="flex items-center gap-3 p-2 rounded-lg border">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={`https://avatar.vercel.sh/${task.assignee.email}`} />
                          <AvatarFallback className="text-xs">
                            {getInitials(task.assignee.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{task.assignee.name}</p>
                          <p className="text-xs text-gray-500">{task.assignee.email}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-gray-500 p-2">
                        <UserX className="w-4 h-4" />
                        <span className="text-sm">Unassigned</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Reporter</h4>
                {task.reporter && (
                  <div className="flex items-center gap-3 p-2 rounded-lg border">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={`https://avatar.vercel.sh/${task.reporter.email}`} />
                      <AvatarFallback className="text-xs">
                        {getInitials(task.reporter.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{task.reporter.name}</p>
                      <p className="text-xs text-gray-500">{task.reporter.email}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}