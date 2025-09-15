import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import { 
  tasksApi, 
  TaskStatus, 
  TaskPriority, 
  CreateTaskRequest, 
  UpdateTaskRequest 
} from '../../lib/api/tasks';
import { projectsApi } from '../../lib/api/projects';
import { useAuthStore } from '../../lib/stores/auth';

interface TaskFormData {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string;
  estimate: string;
  dueDate: string;
  labels: string[];
}

const initialFormData: TaskFormData = {
  title: '',
  description: '',
  status: TaskStatus.TODO,
  priority: TaskPriority.MEDIUM,
  assigneeId: '',
  estimate: '',
  dueDate: '',
  labels: [],
};

export default function TaskForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();
  const isEditMode = Boolean(id && id !== 'new');
  const projectId = searchParams.get('project') || '';
  
  const [formData, setFormData] = useState<TaskFormData>(initialFormData);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [project, setProject] = useState<any>(null);
  const [projectMembers, setProjectMembers] = useState<any[]>([]);
  const [labelInput, setLabelInput] = useState('');

  useEffect(() => {
    if (projectId) {
      fetchProject();
    }
    if (isEditMode && id) {
      fetchTask(id);
    }
  }, [isEditMode, id, projectId]);

  const fetchProject = async () => {
    try {
      const [projectData, membersData] = await Promise.all([
        projectsApi.getProject(projectId),
        projectsApi.getProjectMembers(projectId)
      ]);
      setProject(projectData);
      setProjectMembers(membersData);
    } catch (error) {
      toast.error('Failed to fetch project details');
      console.error('Error fetching project:', error);
    }
  };

  const fetchTask = async (taskId: string) => {
    try {
      setLoading(true);
      const task = await tasksApi.getTask(taskId);
      
      setFormData({
        title: task.title,
        description: task.description || '',
        status: task.status,
        priority: task.priority,
        assigneeId: task.assigneeId || '',
        estimate: task.estimate ? task.estimate.toString() : '',
        dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
        labels: task.labels || [],
      });

      // If we don't have the project from URL, get it from the task
      if (!projectId && task.project) {
        setProject(task.project);
        const membersData = await projectsApi.getProjectMembers(task.project.id);
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

  const handleInputChange = (field: keyof TaskFormData, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleAddLabel = () => {
    if (labelInput.trim() && !formData.labels.includes(labelInput.trim())) {
      const newLabels = [...formData.labels, labelInput.trim()];
      setFormData(prev => ({ ...prev, labels: newLabels }));
      setLabelInput('');
    }
  };

  const handleRemoveLabel = (labelToRemove: string) => {
    const newLabels = formData.labels.filter(label => label !== labelToRemove);
    setFormData(prev => ({ ...prev, labels: newLabels }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Task title is required';
    }

    if (!projectId && !isEditMode) {
      newErrors.project = 'Project is required';
    }

    if (formData.estimate && isNaN(parseFloat(formData.estimate))) {
      newErrors.estimate = 'Estimate must be a valid number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);

      const taskData: CreateTaskRequest | UpdateTaskRequest = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        status: formData.status,
        priority: formData.priority,
        assigneeId: formData.assigneeId || undefined,
        estimate: formData.estimate ? parseFloat(formData.estimate) : undefined,
        dueDate: formData.dueDate || undefined,
        labels: formData.labels,
      };

      if (isEditMode && id) {
        await tasksApi.updateTask(id, taskData);
        toast.success('Task updated successfully');
        navigate(`/tasks/${id}`);
      } else {
        const newTask = await tasksApi.createTask(projectId, taskData);
        toast.success('Task created successfully');
        navigate(`/tasks/${newTask.id}`);
      }
    } catch (error: any) {
      const message = error?.response?.data?.error || 
                     (isEditMode ? 'Failed to update task' : 'Failed to create task');
      toast.error(message);
      console.error('Error saving task:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (isEditMode && id) {
      navigate(`/tasks/${id}`);
    } else if (projectId) {
      navigate(`/tasks?project=${projectId}`);
    } else {
      navigate('/tasks');
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="max-w-2xl">
            <div className="h-64 bg-gray-100 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={handleCancel}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">
            {isEditMode ? 'Edit Task' : 'Create New Task'}
          </h1>
          {project && (
            <p className="text-gray-600 mt-1">
              {isEditMode ? 'Update task in' : 'Create task in'} {project.name}
            </p>
          )}
        </div>
      </div>

      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Task Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Task Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Task Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Enter task title"
                  className={errors.title ? 'border-red-500' : ''}
                />
                {errors.title && (
                  <p className="text-sm text-red-600">{errors.title}</p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Enter task description"
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Status */}
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value as TaskStatus)}>
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
                </div>

                {/* Priority */}
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={formData.priority} onValueChange={(value) => handleInputChange('priority', value as TaskPriority)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(TaskPriority).map(priority => (
                        <SelectItem key={priority} value={priority}>
                          {priority}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Assignee */}
              <div className="space-y-2">
                <Label htmlFor="assignee">Assignee</Label>
                <Select value={formData.assigneeId || 'unassigned'} onValueChange={(value) => handleInputChange('assigneeId', value === 'unassigned' ? '' : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select assignee (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {projectMembers.map(member => (
                      <SelectItem key={member.user.id} value={member.user.id}>
                        {member.user.name} ({member.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Estimate */}
                <div className="space-y-2">
                  <Label htmlFor="estimate">Estimate (hours)</Label>
                  <Input
                    id="estimate"
                    type="number"
                    step="0.5"
                    min="0"
                    value={formData.estimate}
                    onChange={(e) => handleInputChange('estimate', e.target.value)}
                    placeholder="e.g. 8"
                    className={errors.estimate ? 'border-red-500' : ''}
                  />
                  {errors.estimate && (
                    <p className="text-sm text-red-600">{errors.estimate}</p>
                  )}
                </div>

                {/* Due Date */}
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => handleInputChange('dueDate', e.target.value)}
                  />
                </div>
              </div>

              {/* Labels */}
              <div className="space-y-2">
                <Label htmlFor="labels">Labels</Label>
                <div className="flex gap-2">
                  <Input
                    id="labelInput"
                    value={labelInput}
                    onChange={(e) => setLabelInput(e.target.value)}
                    placeholder="Add a label"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddLabel();
                      }
                    }}
                  />
                  <Button type="button" variant="outline" onClick={handleAddLabel}>
                    Add
                  </Button>
                </div>
                {formData.labels.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.labels.map((label, index) => (
                      <Badge key={index} variant="secondary" className="cursor-pointer" onClick={() => handleRemoveLabel(label)}>
                        {label} ×
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-4 pt-6 border-t">
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {isEditMode ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {isEditMode ? 'Update Task' : 'Create Task'}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}