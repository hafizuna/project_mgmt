import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Mail, 
  Calendar, 
  Phone, 
  Edit, 
  MoreHorizontal,
  Activity,
  Target,
  Clock,
  Trophy,
  Briefcase,
  CheckSquare,
  Settings,
  Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { usersApi, User, UserResponse, userHelpers } from '@/lib/api/users';
import { projectsApi } from '@/lib/api/projects';
import { tasksApi } from '@/lib/api/tasks';
import { useAuthStore } from '@/lib/stores/auth';

interface TeamMemberProfileProps {
  userId: string;
  onBack: () => void;
}

export default function TeamMemberProfile({ userId, onBack }: TeamMemberProfileProps) {
  const { user: currentUser } = useAuthStore();
  const [member, setMember] = useState<UserResponse['user'] | null>(null);
  const [memberProjects, setMemberProjects] = useState<any[]>([]);
  const [memberTasks, setMemberTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(true);

  // Role colors aligned with existing patterns
  const roleColors = {
    Admin: 'bg-red-100 text-red-800 border-red-200',
    Manager: 'bg-blue-100 text-blue-800 border-blue-200',
    Team: 'bg-green-100 text-green-800 border-green-200'
  };

  const statusColors = {
    Active: 'bg-green-100 text-green-800',
    Completed: 'bg-gray-100 text-gray-800',
    'In Progress': 'bg-blue-100 text-blue-800',
    'On Hold': 'bg-yellow-100 text-yellow-800'
  };

  const fetchMemberDetails = async () => {
    try {
      setLoading(true);
      const response = await usersApi.getUser(userId);
      setMember(response.user);
    } catch (error) {
      console.error('Error fetching member details:', error);
      toast.error('Failed to load member details');
    } finally {
      setLoading(false);
    }
  };

  const fetchMemberProjects = async () => {
    try {
      setProjectsLoading(true);
      // Get all projects and filter by member participation
      // This would need to be implemented in the projects API
      // For now, we'll use mock data based on the member's actual projects
      if (member?.projects) {
        setMemberProjects(member.projects);
      }
    } catch (error) {
      console.error('Error fetching member projects:', error);
    } finally {
      setProjectsLoading(false);
    }
  };

  const fetchMemberTasks = async () => {
    try {
      setTasksLoading(true);
      // Get tasks assigned to this user
      // This would need to be implemented in the tasks API
      // For now, we'll use mock data
      setMemberTasks([]);
    } catch (error) {
      console.error('Error fetching member tasks:', error);
    } finally {
      setTasksLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchMemberDetails();
    }
  }, [userId]);

  useEffect(() => {
    if (member) {
      fetchMemberProjects();
      fetchMemberTasks();
    }
  }, [member]);

  const canManage = currentUser?.role === 'Admin' || (currentUser?.role === 'Manager' && member?.role === 'Team');

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleUpdateUser = async (updates: { role?: string; isActive?: boolean }) => {
    if (!member?.id) return;

    try {
      await usersApi.updateUser(member.id, updates);
      toast.success('User updated successfully');
      fetchMemberDetails(); // Refresh data
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user');
    }
  };

  if (loading || !member) {
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16">
                <AvatarImage src={member.avatar || `https://avatar.vercel.sh/${member.email}`} />
                <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-600 text-white text-xl">
                  {userHelpers.getInitials(member.name || member.email)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold">{member.name || member.email}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={roleColors[member.role]}>
                    {userHelpers.getRoleDisplayName(member.role)}
                  </Badge>
                  <div className={`w-2 h-2 rounded-full ${member.isActive ? 'bg-green-400' : 'bg-gray-300'}`}></div>
                  <span className="text-sm text-gray-500">
                    {member.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2">
              {canManage && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button>
                      <Edit className="w-4 h-4 mr-2" />
                      Manage
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleUpdateUser({ role: member.role === 'Team' ? 'Manager' : 'Team' })}>
                      <Shield className="w-4 h-4 mr-2" />
                      Change Role
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleUpdateUser({ isActive: !member.isActive })}>
                      <Settings className="w-4 h-4 mr-2" />
                      {member.isActive ? 'Deactivate' : 'Activate'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Mail className="w-4 h-4 mr-2" />
                    Send Message
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>View Activity</DropdownMenuItem>
                  <DropdownMenuItem>Export Profile</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>User Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium">{member.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Last Login</p>
                <p className="font-medium">
                  {userHelpers.formatLastLogin(member.lastLoginAt)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Member Since</p>
                <p className="font-medium">
                  {userHelpers.formatCreatedDate(member.createdAt)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Briefcase className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Active Projects</p>
                <p className="text-2xl font-bold">{member.projects?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Target className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Active Sessions</p>
                <p className="text-2xl font-bold">{member.sessions?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Shield className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Role Level</p>
                <p className="text-2xl font-bold">{member.role}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Activity className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <p className="text-2xl font-bold">{member.isActive ? 'Active' : 'Inactive'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Information */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Organization Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Organization</p>
                  <p className="font-medium">{member.org.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Organization ID</p>
                  <p className="text-xs font-mono text-gray-600">{member.org.id}</p>
                </div>
                {member.org.slug && (
                  <div>
                    <p className="text-sm text-gray-500">Organization Slug</p>
                    <p className="font-medium">{member.org.slug}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Role & Permissions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500">Current Role</p>
                    <Badge className={roleColors[member.role]}>
                      {userHelpers.getRoleDisplayName(member.role)}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Role Description</p>
                    <p className="text-sm text-gray-600">
                      {userHelpers.getRoleDescription(member.role)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Account Status</p>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${member.isActive ? 'bg-green-400' : 'bg-red-400'}`}></div>
                      <span className="text-sm font-medium">
                        {member.isActive ? 'Active Account' : 'Inactive Account'}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="projects">
          <Card>
            <CardHeader>
              <CardTitle>Project Assignments ({member.projects?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {projectsLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-16 bg-gray-100 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : member.projects && member.projects.length > 0 ? (
                <div className="space-y-3">
                  {member.projects.map((project, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50">
                      <div>
                        <h4 className="font-medium">{project.name}</h4>
                        <p className="text-sm text-gray-500">ID: {project.id}</p>
                      </div>
                      <Badge className={statusColors[project.status] || 'bg-gray-100 text-gray-800'}>
                        {project.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No project assignments</p>
                  <p className="text-sm">This user is not currently assigned to any projects</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks">
          <Card>
            <CardHeader>
              <CardTitle>Active Sessions ({member.sessions?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {member.sessions && member.sessions.length > 0 ? (
                <div className="space-y-3">
                  {member.sessions.map((session, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Activity className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">Session {session.id.slice(0, 8)}...</p>
                          <p className="text-sm text-gray-500">
                            Created: {formatDate(session.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">
                          Expires: {formatDate(session.expiresAt)}
                        </p>
                        {session.deviceInfo && (
                          <p className="text-xs text-gray-400">Device info available</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No active sessions</p>
                  <p className="text-sm">This user has no active login sessions</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Account Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="font-medium">Account Created</p>
                      <p className="text-sm text-gray-500">
                        {formatDate(member.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <Activity className="w-5 h-5 text-green-500" />
                    <div>
                      <p className="font-medium">Last Updated</p>
                      <p className="text-sm text-gray-500">
                        {formatDate(member.updatedAt)}
                      </p>
                    </div>
                  </div>
                </div>
                
                {member.lastLoginAt && (
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-purple-500" />
                      <div>
                        <p className="font-medium">Last Login</p>
                        <p className="text-sm text-gray-500">
                          {formatDate(member.lastLoginAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}