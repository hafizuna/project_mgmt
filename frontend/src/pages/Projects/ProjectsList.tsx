import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Edit, Trash2, Users, Calendar, DollarSign } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../../components/ui/alert-dialog';
import { toast } from 'sonner';
import { 
  projectsApi, 
  Project, 
  ProjectStatus, 
  ProjectPriority, 
  ProjectFilters 
} from '../../lib/api/projects';
import { useAuthStore } from '../../lib/stores/auth';

const statusColors = {
  PLANNING: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-green-100 text-green-800', 
  ON_HOLD: 'bg-yellow-100 text-yellow-800',
  COMPLETED: 'bg-gray-100 text-gray-800',
  CANCELLED: 'bg-red-100 text-red-800'
};

const priorityColors = {
  LOW: 'bg-gray-100 text-gray-800',
  MEDIUM: 'bg-blue-100 text-blue-800',
  HIGH: 'bg-orange-100 text-orange-800',
  CRITICAL: 'bg-red-100 text-red-800'
};

export default function ProjectsList() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  
  const [filters, setFilters] = useState<ProjectFilters>({
    page: 1,
    limit: 10,
    search: '',
    status: 'all',
    priority: 'all',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await projectsApi.getProjects(filters);
      setProjects(response.projects);
      setPagination(response.pagination);
    } catch (error) {
      toast.error('Failed to fetch projects');
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [filters]);

  const handleSearch = (value: string) => {
    setFilters(prev => ({ ...prev, search: value, page: 1 }));
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const handleDeleteProject = async (id: string) => {
    try {
      await projectsApi.deleteProject(id);
      toast.success('Project deleted successfully');
      fetchProjects();
      setDeleteProjectId(null);
    } catch (error) {
      toast.error('Failed to delete project');
      console.error('Error deleting project:', error);
    }
  };

  const canManageProjects = user?.role === 'Admin' || user?.role === 'Manager';

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading && projects.length === 0) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Projects</h1>
        {canManageProjects && (
          <Button onClick={() => navigate('/projects/new')}>
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search projects..."
                value={filters.search || ''}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={filters.status || 'all'} onValueChange={(value) => handleFilterChange('status', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.values(ProjectStatus).map(status => (
                  <SelectItem key={status} value={status}>
                    {status.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.priority || 'all'} onValueChange={(value) => handleFilterChange('priority', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                {Object.values(ProjectPriority).map(priority => (
                  <SelectItem key={priority} value={priority}>
                    {priority}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.sortBy || 'createdAt'} onValueChange={(value) => handleFilterChange('sortBy', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="status">Status</SelectItem>
                <SelectItem value="priority">Priority</SelectItem>
                <SelectItem value="startDate">Start Date</SelectItem>
                <SelectItem value="endDate">End Date</SelectItem>
                <SelectItem value="createdAt">Created Date</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Projects Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Timeline</TableHead>
                <TableHead>Budget</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                        <Plus className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-gray-500">No projects found</p>
                      {canManageProjects && (
                        <Button variant="outline" onClick={() => navigate('/projects/new')}>
                          Create your first project
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                projects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium cursor-pointer hover:text-blue-600" 
                             onClick={() => navigate(`/projects/${project.id}`)}>
                          {project.name}
                        </div>
                        {project.description && (
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {project.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <Badge className={statusColors[project.status]}>
                        {project.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    
                    <TableCell>
                      <Badge className={priorityColors[project.priority]}>
                        {project.priority}
                      </Badge>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span>{project._count?.members || 0}</span>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        {project.startDate && project.endDate ? (
                          <span>
                            {formatDate(project.startDate)} - {formatDate(project.endDate)}
                          </span>
                        ) : project.startDate ? (
                          <span>From {formatDate(project.startDate)}</span>
                        ) : (
                          <span>No timeline</span>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-gray-400" />
                        <span>{project.budget ? formatCurrency(project.budget) : 'N/A'}</span>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/projects/${project.id}`)}
                        >
                          View
                        </Button>
                        {canManageProjects && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/projects/${project.id}/edit`)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" onClick={() => setDeleteProjectId(project.id)}>
                                  <Trash2 className="w-4 h-4 text-red-600" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Project</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{project.name}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteProject(project.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
          >
            Previous
          </Button>
          
          <span className="px-4 py-2 text-sm text-gray-600">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          
          <Button
            variant="outline"
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page === pagination.totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
