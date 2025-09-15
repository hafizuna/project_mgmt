import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Users, Calendar, DollarSign, UserPlus, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../../components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { 
  projectsApi, 
  Project, 
  ProjectMember, 
  ProjectStatus, 
  ProjectPriority, 
  ProjectRole 
} from '../../lib/api/projects';
import { usersApi } from '../../lib/api/users';
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

const roleColors = {
  LEAD: 'bg-purple-100 text-purple-800',
  MEMBER: 'bg-blue-100 text-blue-800',
  VIEWER: 'bg-gray-100 text-gray-800'
};

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<ProjectRole>(ProjectRole.MEMBER);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);

  const fetchProject = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const projectData = await projectsApi.getProject(id);
      const membersData = await projectsApi.getProjectMembers(id);
      
      setProject(projectData);
      setMembers(membersData);
    } catch (error) {
      toast.error('Failed to fetch project details');
      console.error('Error fetching project:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableUsers = async () => {
    try {
      const response = await usersApi.getUsers({ limit: 100 }); // Get all users
      const memberUserIds = members.map(m => m.userId);
      const available = response.users.filter(u => !memberUserIds.includes(u.id));
      setAvailableUsers(available);
    } catch (error) {
      console.error('Error fetching available users:', error);
    }
  };

  useEffect(() => {
    fetchProject();
  }, [id]);

  useEffect(() => {
    if (showAddMember && members.length > 0) {
      fetchAvailableUsers();
    }
  }, [showAddMember, members]);

  const handleAddMember = async () => {
    if (!id || !selectedUserId) return;

    try {
      await projectsApi.addProjectMember(id, {
        userId: selectedUserId,
        role: selectedRole
      });
      
      toast.success('Member added successfully');
      setShowAddMember(false);
      setSelectedUserId('');
      setSelectedRole(ProjectRole.MEMBER);
      fetchProject(); // Refresh data
    } catch (error) {
      toast.error('Failed to add member');
      console.error('Error adding member:', error);
    }
  };

  const handleUpdateMemberRole = async (userId: string, newRole: ProjectRole) => {
    if (!id) return;

    try {
      await projectsApi.updateProjectMember(id, userId, { role: newRole });
      toast.success('Member role updated');
      fetchProject(); // Refresh data
    } catch (error) {
      toast.error('Failed to update member role');
      console.error('Error updating member role:', error);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!id) return;

    try {
      await projectsApi.removeProjectMember(id, userId);
      toast.success('Member removed successfully');
      setRemovingMemberId(null);
      fetchProject(); // Refresh data
    } catch (error) {
      toast.error('Failed to remove member');
      console.error('Error removing member:', error);
    }
  };

  const canManageProject = user?.role === 'Admin' || user?.role === 'Manager';
  const userMember = members.find(m => m.userId === user?.id);
  const canManageMembers = canManageProject || userMember?.role === ProjectRole.LEAD;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

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

  if (!project) {
    return (
      <div className="p-6 text-center">
        <p>Project not found</p>
        <Button onClick={() => navigate('/projects')} className="mt-4">
          Back to Projects
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/projects')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{project.name}</h1>
          <div className="flex items-center gap-4 mt-2">
            <Badge className={statusColors[project.status]}>
              {project.status.replace('_', ' ')}
            </Badge>
            <Badge className={priorityColors[project.priority]}>
              {project.priority}
            </Badge>
          </div>
        </div>
        {canManageProject && (
          <Button onClick={() => navigate(`/projects/${project.id}/edit`)}>
            <Edit className="w-4 h-4 mr-2" />
            Edit Project
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Project Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {project.description && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Description</h3>
                  <p className="text-gray-600">{project.description}</p>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Timeline</h3>
                  <div className="space-y-2">
                    {project.startDate && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>Start: {formatDate(project.startDate)}</span>
                      </div>
                    )}
                    {project.endDate && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>End: {formatDate(project.endDate)}</span>
                      </div>
                    )}
                    {!project.startDate && !project.endDate && (
                      <p className="text-sm text-gray-500">No timeline set</p>
                    )}
                  </div>
                </div>
                
                {project.budget && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Budget</h3>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-gray-400" />
                      <span className="text-lg font-semibold">
                        {formatCurrency(project.budget)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="text-xs text-gray-500 pt-4 border-t">
                <p>Created: {formatDate(project.createdAt)}</p>
                <p>Last updated: {formatDate(project.updatedAt)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Team Members */}
        <div>
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Team Members ({members.length})
                </CardTitle>
                {canManageMembers && (
                  <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <UserPlus className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Team Member</DialogTitle>
                        <DialogDescription>
                          Add a new member to this project
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium">User</label>
                          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a user" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableUsers.map(u => (
                                <SelectItem key={u.id} value={u.id}>
                                  {u.name || u.email}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <label className="text-sm font-medium">Role</label>
                          <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as ProjectRole)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.values(ProjectRole).map(role => (
                                <SelectItem key={role} value={role}>
                                  {role}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddMember(false)}>
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleAddMember}
                          disabled={!selectedUserId}
                        >
                          Add Member
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {members.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No team members yet
                  </p>
                ) : (
                  members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={`https://avatar.vercel.sh/${member.user.email}`} />
                          <AvatarFallback className="text-xs">
                            {getInitials(member.user.name || member.user.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">
                            {member.user.name || member.user.email}
                          </p>
                          <p className="text-xs text-gray-500">
                            Joined {formatDate(member.joinedAt)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {canManageMembers && member.userId !== user?.id ? (
                          <Select
                            value={member.role}
                            onValueChange={(value) => handleUpdateMemberRole(member.userId, value as ProjectRole)}
                          >
                            <SelectTrigger className="w-auto h-auto p-1">
                              <Badge className={roleColors[member.role]}>
                                {member.role}
                              </Badge>
                            </SelectTrigger>
                            <SelectContent>
                              {Object.values(ProjectRole).map(role => (
                                <SelectItem key={role} value={role}>
                                  {role}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge className={roleColors[member.role]}>
                            {member.role}
                          </Badge>
                        )}
                        
                        {canManageMembers && member.userId !== user?.id && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setRemovingMemberId(member.userId)}
                              >
                                <Trash2 className="w-3 h-3 text-red-600" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove Member</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to remove {member.user.name || member.user.email} from this project?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleRemoveMember(member.userId)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Remove
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
