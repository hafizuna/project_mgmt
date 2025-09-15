import { useState, useEffect } from 'react'
import { Plus, Search, MoreHorizontal, UserPlus, Shield, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/lib/stores/auth'
import { toast } from '@/hooks/use-toast'
import { usersApi, userHelpers, User, UserPagination } from '@/lib/api/users'

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [pagination, setPagination] = useState<UserPagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showAddUserDialog, setShowAddUserDialog] = useState(false)
  const [addUserLoading, setAddUserLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Team' as 'Admin' | 'Manager' | 'Team',
  })

  const fetchUsers = async (page = 1) => {
    setLoading(true)
    try {
      const filters = {
        page,
        limit: 10,
        ...(searchTerm && { search: searchTerm }),
        ...(roleFilter !== 'all' && { role: roleFilter as 'Admin' | 'Manager' | 'Team' }),
        ...(statusFilter !== 'all' && { isActive: statusFilter === 'true' }),
      }

      const data = await usersApi.getUsers(filters)
      setUsers(data.users)
      setPagination(data.pagination)
    } catch (error) {
      console.error('Error fetching users:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch users',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await usersApi.updateUser(userId, { role: newRole as 'Admin' | 'Manager' | 'Team' })

      toast({
        title: 'Success',
        description: 'User role updated successfully',
      })

      // Refresh users list
      await fetchUsers(pagination?.page || 1)
    } catch (error) {
      console.error('Error updating user role:', error)
      toast({
        title: 'Error',
        description: 'Failed to update user role',
        variant: 'destructive',
      })
    }
  }

  const handleStatusToggle = async (userId: string, currentStatus: boolean) => {
    try {
      await usersApi.updateUser(userId, { isActive: !currentStatus })

      toast({
        title: 'Success',
        description: `User ${!currentStatus ? 'activated' : 'deactivated'} successfully`,
      })

      // Refresh users list
      await fetchUsers(pagination?.page || 1)
    } catch (error) {
      console.error('Error updating user status:', error)
      toast({
        title: 'Error',
        description: 'Failed to update user status',
        variant: 'destructive',
      })
    }
  }

  const handleAddUser = async () => {
    // Validate form
    if (!newUser.name.trim() || !newUser.email.trim() || !newUser.password.trim()) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      })
      return
    }

    if (newUser.password.length < 6) {
      toast({
        title: 'Error',
        description: 'Password must be at least 6 characters long',
        variant: 'destructive',
      })
      return
    }

    setAddUserLoading(true)
    try {
      await usersApi.createUser(newUser)

      toast({
        title: 'Success',
        description: 'User created successfully',
      })

      // Reset form and close dialog
      setNewUser({
        name: '',
        email: '',
        password: '',
        role: 'Team',
      })
      setShowAddUserDialog(false)
      setShowPassword(false)

      // Refresh users list
      await fetchUsers(1) // Go to first page to see the new user
    } catch (error) {
      console.error('Error creating user:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create user',
        variant: 'destructive',
      })
    } finally {
      setAddUserLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [searchTerm, roleFilter, statusFilter])


  if (loading && users.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">User Management</h1>
            <p className="text-muted-foreground">Manage organization users and their roles</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">Manage organization users and their roles</p>
        </div>
        <Button onClick={() => setShowAddUserDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
          <CardDescription>Search and filter users</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="Admin">Admin</SelectItem>
                <SelectItem value="Manager">Manager</SelectItem>
                <SelectItem value="Team">Team</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Users
            {pagination && (
              <Badge variant="outline">
                {pagination.totalCount} total
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatar} alt={user.name} />
                        <AvatarFallback>{userHelpers.getInitials(user.name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={userHelpers.getRoleBadgeVariant(user.role)}>
                      {user.role === 'Admin' && <Shield className="h-3 w-3 mr-1" />}
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={userHelpers.getStatusBadgeVariant(user.isActive)}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {userHelpers.formatLastLogin(user.lastLoginAt)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {userHelpers.formatCreatedDate(user.createdAt)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => console.log('Edit user', user.id)}>
                          Edit User
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleRoleChange(user.id, user.role === 'Admin' ? 'Manager' : user.role === 'Manager' ? 'Team' : 'Admin')}
                        >
                          Change Role
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleStatusToggle(user.id, user.isActive)}
                        >
                          {user.isActive ? 'Deactivate' : 'Activate'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.totalCount)} of{' '}
                {pagination.totalCount} users
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchUsers(pagination.page - 1)}
                  disabled={!pagination.hasPrevPage}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchUsers(pagination.page + 1)}
                  disabled={!pagination.hasNextPage}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add User Dialog */}
      <Dialog open={showAddUserDialog} onOpenChange={setShowAddUserDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new user account for your organization. They will be able to log in with the provided credentials.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                placeholder="Enter full name"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter email address"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password (min. 6 characters)"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                  <span className="sr-only">
                    {showPassword ? 'Hide password' : 'Show password'}
                  </span>
                </Button>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={newUser.role}
                onValueChange={(value) => setNewUser({ ...newUser, role: value as 'Admin' | 'Manager' | 'Team' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Team">Team Member</SelectItem>
                  <SelectItem value="Manager">Manager</SelectItem>
                  <SelectItem value="Admin">Administrator</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {userHelpers.getRoleDescription(newUser.role)}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowAddUserDialog(false)
                setNewUser({ name: '', email: '', password: '', role: 'Team' })
                setShowPassword(false)
              }}
              disabled={addUserLoading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleAddUser}
              disabled={addUserLoading}
            >
              {addUserLoading ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Create User
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
