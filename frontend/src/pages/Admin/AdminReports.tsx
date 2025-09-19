import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { 
  Calendar, 
  Users, 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Clock,
  TrendingUp,
  TrendingDown,
  Filter,
  Download,
  Eye
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { 
  weeklyReportsApi, 
  AdminDashboardData, 
  SubmissionStatus 
} from '@/lib/api/weeklyReports'

const AdminReports: React.FC = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [selectedWeek, setSelectedWeek] = useState<string>('')
  const [userFilter, setUserFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Get current date for default week
  const getCurrentWeekString = () => {
    const now = new Date()
    const monday = new Date(now)
    const dayOfWeek = monday.getDay()
    const diff = monday.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
    monday.setDate(diff)
    return monday.toISOString().split('T')[0]
  }

  // Get admin dashboard data
  const { 
    data: dashboardData, 
    isLoading,
    error,
    refetch 
  } = useQuery({
    queryKey: ['admin-dashboard', selectedWeek],
    queryFn: () => weeklyReportsApi.getAdminDashboard(selectedWeek),
  })

  // Helper functions
  const getStatusColor = (status?: SubmissionStatus) => {
    switch (status) {
      case SubmissionStatus.SUBMITTED:
        return 'default'
      case SubmissionStatus.DRAFT:
        return 'secondary'
      case SubmissionStatus.OVERDUE:
        return 'destructive'
      default:
        return 'outline'
    }
  }

  const getStatusIcon = (status?: SubmissionStatus, isOverdue?: boolean) => {
    if (isOverdue) return <XCircle className="h-4 w-4 text-destructive" />
    switch (status) {
      case SubmissionStatus.SUBMITTED:
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case SubmissionStatus.DRAFT:
        return <AlertCircle className="h-4 w-4 text-yellow-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }

  const getCurrentWeekDisplay = (weekStart?: string, weekEnd?: string) => {
    if (!weekStart || !weekEnd) return 'Current Week'
    const start = formatDate(weekStart)
    const end = formatDate(weekEnd)
    return `${start} - ${end}`
  }

  // Filter users based on selected filters
  const filteredUsers = dashboardData?.userStatus.filter(user => {
    if (userFilter !== 'all' && user.role !== userFilter) return false
    
    if (statusFilter !== 'all') {
      const hasMatchingStatus = 
        user.plan.status === statusFilter || 
        user.report.status === statusFilter ||
        (statusFilter === 'overdue' && (user.plan.isOverdue || user.report.isOverdue))
      if (!hasMatchingStatus) return false
    }
    
    return true
  }) || []

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load admin dashboard data. Please try again later.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Team Reports Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor team submission compliance and productivity
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <TrendingUp className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Week</label>
            <Input
              type="date"
              value={selectedWeek || getCurrentWeekString()}
              onChange={(e) => setSelectedWeek(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Role</label>
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="Manager">Manager</SelectItem>
                <SelectItem value="Team">Team</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Submitted">Submitted</SelectItem>
                <SelectItem value="Draft">Draft</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Team Members</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData?.summary.totalUsers || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Plan Compliance</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round(dashboardData?.summary.planComplianceRate || 0)}%
                </div>
                <div className="text-xs text-muted-foreground">
                  {dashboardData?.summary.planSubmissions || 0} of {dashboardData?.summary.totalUsers || 0} submitted
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Report Compliance</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round(dashboardData?.summary.reportComplianceRate || 0)}%
                </div>
                <div className="text-xs text-muted-foreground">
                  {dashboardData?.summary.reportSubmissions || 0} of {dashboardData?.summary.totalUsers || 0} submitted
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Overdue Items</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">
                  {(dashboardData?.summary.overduePlans || 0) + (dashboardData?.summary.overdueReports || 0)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {dashboardData?.summary.overduePlans || 0} plans, {dashboardData?.summary.overdueReports || 0} reports
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Week Display */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {getCurrentWeekDisplay(dashboardData?.weekStart, dashboardData?.weekEnd)}
              </CardTitle>
            </CardHeader>
          </Card>

          {/* Team Status Table */}
          <Card>
            <CardHeader>
              <CardTitle>Team Submission Status</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No team members match the current filters
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredUsers.map((user) => (
                    <div 
                      key={user.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-4">
                        {/* User Info */}
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-primary">
                              {user.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </div>

                        {/* Role Badge */}
                        <Badge variant="outline">
                          {user.role}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-6">
                        {/* Weekly Plan Status */}
                        <div className="flex items-center gap-2">
                          {getStatusIcon(user.plan.status, user.plan.isOverdue)}
                          <div className="text-right">
                            <p className="text-sm font-medium">Plan</p>
                            <Badge 
                              variant={getStatusColor(user.plan.status)}
                              className="text-xs"
                            >
                              {user.plan.status || 'Not Started'}
                            </Badge>
                          </div>
                        </div>

                        {/* Weekly Report Status */}
                        <div className="flex items-center gap-2">
                          {getStatusIcon(user.report.status, user.report.isOverdue)}
                          <div className="text-right">
                            <p className="text-sm font-medium">Report</p>
                            <Badge 
                              variant={getStatusColor(user.report.status)}
                              className="text-xs"
                            >
                              {user.report.status || 'Not Started'}
                            </Badge>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              // Navigate to user's reports (we can implement this later)
                              toast({
                                title: 'Feature Coming Soon',
                                description: 'Individual user report viewing will be available soon.',
                              })
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Compliance Alerts */}
          {(dashboardData?.summary.planComplianceRate || 0) < 80 || 
           (dashboardData?.summary.reportComplianceRate || 0) < 80 ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Low Compliance Alert:</strong> 
                {(dashboardData?.summary.planComplianceRate || 0) < 80 && 
                  ` Plan submission rate is ${Math.round(dashboardData?.summary.planComplianceRate || 0)}%.`}
                {(dashboardData?.summary.reportComplianceRate || 0) < 80 && 
                  ` Report submission rate is ${Math.round(dashboardData?.summary.reportComplianceRate || 0)}%.`}
                {' '}Consider sending reminders to team members.
              </AlertDescription>
            </Alert>
          ) : null}
        </>
      )}
    </div>
  )
}

export default AdminReports