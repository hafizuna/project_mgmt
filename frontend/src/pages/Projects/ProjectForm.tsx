import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';
import { 
  projectsApi, 
  ProjectStatus, 
  ProjectPriority, 
  CreateProjectRequest, 
  UpdateProjectRequest 
} from '../../lib/api/projects';

interface ProjectFormData {
  name: string;
  description: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  startDate: string;
  endDate: string;
  budget: string;
}

const initialFormData: ProjectFormData = {
  name: '',
  description: '',
  status: ProjectStatus.PLANNING,
  priority: ProjectPriority.MEDIUM,
  startDate: '',
  endDate: '',
  budget: ''
};

export default function ProjectForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditMode = Boolean(id && id !== 'new');
  
  const [formData, setFormData] = useState<ProjectFormData>(initialFormData);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isEditMode && id) {
      fetchProject(id);
    }
  }, [isEditMode, id]);

  const fetchProject = async (projectId: string) => {
    try {
      setLoading(true);
      const project = await projectsApi.getProject(projectId);
      
      setFormData({
        name: project.name,
        description: project.description || '',
        status: project.status,
        priority: project.priority,
        startDate: project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : '',
        endDate: project.endDate ? new Date(project.endDate).toISOString().split('T')[0] : '',
        budget: project.budget ? project.budget.toString() : ''
      });
    } catch (error) {
      toast.error('Failed to fetch project details');
      console.error('Error fetching project:', error);
      navigate('/projects');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof ProjectFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Project name is required';
    }

    if (formData.startDate && formData.endDate && formData.startDate > formData.endDate) {
      newErrors.endDate = 'End date must be after start date';
    }

    if (formData.budget && isNaN(parseFloat(formData.budget))) {
      newErrors.budget = 'Budget must be a valid number';
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

      const projectData: CreateProjectRequest | UpdateProjectRequest = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        status: formData.status,
        priority: formData.priority,
        startDate: formData.startDate || undefined,
        endDate: formData.endDate || undefined,
        budget: formData.budget ? parseFloat(formData.budget) : undefined
      };

      if (isEditMode && id) {
        await projectsApi.updateProject(id, projectData);
        toast.success('Project updated successfully');
        navigate(`/projects/${id}`);
      } else {
        const newProject = await projectsApi.createProject(projectData);
        toast.success('Project created successfully');
        navigate(`/projects/${newProject.id}`);
      }
    } catch (error: any) {
      const message = error?.response?.data?.error || 
                     (isEditMode ? 'Failed to update project' : 'Failed to create project');
      toast.error(message);
      console.error('Error saving project:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (isEditMode && id) {
      navigate(`/projects/${id}`);
    } else {
      navigate('/projects');
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
        <h1 className="text-3xl font-bold">
          {isEditMode ? 'Edit Project' : 'Create New Project'}
        </h1>
      </div>

      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Project Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Project Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter project name"
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && (
                  <p className="text-sm text-red-600">{errors.name}</p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Enter project description"
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Status */}
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(ProjectStatus).map(status => (
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
                  <Select value={formData.priority} onValueChange={(value) => handleInputChange('priority', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(ProjectPriority).map(priority => (
                        <SelectItem key={priority} value={priority}>
                          {priority}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Start Date */}
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => handleInputChange('startDate', e.target.value)}
                  />
                </div>

                {/* End Date */}
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => handleInputChange('endDate', e.target.value)}
                    className={errors.endDate ? 'border-red-500' : ''}
                  />
                  {errors.endDate && (
                    <p className="text-sm text-red-600">{errors.endDate}</p>
                  )}
                </div>
              </div>

              {/* Budget */}
              <div className="space-y-2">
                <Label htmlFor="budget">Budget ($)</Label>
                <Input
                  id="budget"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.budget}
                  onChange={(e) => handleInputChange('budget', e.target.value)}
                  placeholder="Enter project budget"
                  className={errors.budget ? 'border-red-500' : ''}
                />
                {errors.budget && (
                  <p className="text-sm text-red-600">{errors.budget}</p>
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
                      {isEditMode ? 'Update Project' : 'Create Project'}
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
