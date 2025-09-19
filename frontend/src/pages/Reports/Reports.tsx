import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Calendar, Clock, FileText, CheckCircle, AlertCircle, XCircle, Plus, Eye, Edit, Send } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { useAuthStore } from '@/lib/stores/auth'
import { 
  weeklyReportsApi, 
  CurrentWeekStatus, 
  SubmissionStatus,
  WeeklyPlan,
  WeeklyReport
} from '@/lib/api/weeklyReports'

const Reports: React.FC = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState('current-week')

  // Get current week status
  const { 
    data: weekStatus, 
    isLoading: isLoadingStatus,
    error: statusError 
  } = useQuery({
    queryKey: ['current-week-status'],
    queryFn: weeklyReportsApi.getCurrentWeekStatus,
  })

  // Get user's recent plans and reports
  const { 
    data: plansData, 
    isLoading: isLoadingPlans 
  } = useQuery({
    queryKey: ['weekly-plans'],
    queryFn: () => weeklyReportsApi.getWeeklyPlans({ limit: 5 }),
  })

  const { 
    data: reportsData, 
    isLoading: isLoadingReports 
  } = useQuery({
    queryKey: ['weekly-reports'],
    queryFn: () => weeklyReportsApi.getWeeklyReports({ limit: 5 }),
  })

  // Submit mutations
  const submitPlanMutation = useMutation({
    mutationFn: weeklyReportsApi.submitWeeklyPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-week-status'] })
      queryClient.invalidateQueries({ queryKey: ['weekly-plans'] })
      toast({
        title: 'Success',
        description: 'Weekly plan submitted successfully',
      })
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to submit weekly plan',
        variant: 'destructive',
      })
    },
  })

  const submitReportMutation = useMutation({
    mutationFn: weeklyReportsApi.submitWeeklyReport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-week-status'] })
      queryClient.invalidateQueries({ queryKey: ['weekly-reports'] })
      toast({
        title: 'Success',
        description: 'Weekly report submitted successfully',
      })
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to submit weekly report',
        variant: 'destructive',
      })
    },
  })

  const getStatusColor = (status?: SubmissionStatus) => {
    switch (status) {
      case SubmissionStatus.SUBMITTED:
        return 'success'
      case SubmissionStatus.DRAFT:
        return 'warning'
      case SubmissionStatus.OVERDUE:
        return 'destructive'
      default:
        return 'secondary'
    }
  }

  const getStatusIcon = (status?: SubmissionStatus, isOverdue?: boolean) => {
    if (isOverdue) return <XCircle className="h-4 w-4" />
    switch (status) {
      case SubmissionStatus.SUBMITTED:
        return <CheckCircle className="h-4 w-4" />
      case SubmissionStatus.DRAFT:
        return <AlertCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
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

  if (isLoadingStatus) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (statusError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load current week status. Please try again later.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Weekly Reports</h1>
          <p className="text-muted-foreground">
            Manage your weekly plans and reports
          </p>
        </div>
        {user?.role === 'Admin' && (
          <Button 
            onClick={() => navigate('/admin/reports')}
            variant="outline"
          >
            <Eye className="h-4 w-4 mr-2" />
            Admin Dashboard
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="current-week">Current Week</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="current-week" className="space-y-6">
          {/* Current Week Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {getCurrentWeekDisplay(weekStatus?.weekStart, weekStatus?.weekEnd)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Weekly Plan Status */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(weekStatus?.plan.status, weekStatus?.plan.isOverdue)}
                  <div>
                    <h4 className="font-medium">Weekly Plan</h4>
                    <p className="text-sm text-muted-foreground">
                      Due: {weekStatus?.plan.dueDate ? formatDate(weekStatus.plan.dueDate) : 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={getStatusColor(weekStatus?.plan.status)}>
                    {weekStatus?.plan.status || 'Not Started'}
                  </Badge>
                  {weekStatus?.plan.exists && weekStatus?.plan.canEdit && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate('/reports/weekly-plan')}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  )}
                  {weekStatus?.plan.exists && weekStatus?.plan.status === SubmissionStatus.DRAFT && (
                    <Button
                      size="sm"
                      onClick={() => {
                        // We'll need to get the plan ID first
                        navigate('/reports/weekly-plan')
                      }}
                      disabled={submitPlanMutation.isPending}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Submit
                    </Button>
                  )}
                  {!weekStatus?.plan.exists && (
                    <Button
                      size="sm"
                      onClick={() => navigate('/reports/weekly-plan')}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create
                    </Button>
                  )}
                </div>
              </div>

              {/* Weekly Report Status */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(weekStatus?.report.status, weekStatus?.report.isOverdue)}
                  <div>
                    <h4 className="font-medium">Weekly Report</h4>
                    <p className="text-sm text-muted-foreground">
                      Due: {weekStatus?.report.dueDate ? formatDate(weekStatus.report.dueDate) : 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={getStatusColor(weekStatus?.report.status)}>
                    {weekStatus?.report.status || 'Not Started'}
                  </Badge>
                  {weekStatus?.report.exists && weekStatus?.report.canEdit && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate('/reports/weekly-report')}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  )}
                  {weekStatus?.report.exists && weekStatus?.report.status === SubmissionStatus.DRAFT && (
                    <Button
                      size="sm"
                      onClick={() => {
                        // We'll need to get the report ID first
                        navigate('/reports/weekly-report')
                      }}
                      disabled={submitReportMutation.isPending}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Submit
                    </Button>
                  )}
                  {!weekStatus?.report.exists && !weekStatus?.report.requiresPlan && (
                    <Button
                      size="sm"
                      onClick={() => navigate('/reports/weekly-report')}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create
                    </Button>
                  )}
                  {weekStatus?.report.requiresPlan && (
                    <Button size="sm" disabled>
                      Plan Required
                    </Button>
                  )}
                </div>
              </div>

              {/* Overdue Alerts */}
              {(weekStatus?.plan.isOverdue || weekStatus?.report.isOverdue) && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {weekStatus.plan.isOverdue && weekStatus.report.isOverdue 
                      ? 'Both your weekly plan and report are overdue!'
                      : weekStatus.plan.isOverdue 
                      ? 'Your weekly plan is overdue!'
                      : 'Your weekly report is overdue!'
                    } Please submit as soon as possible.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Recent Plans */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Recent Plans
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingPlans ? (
                  <div className="animate-pulse space-y-2">
                    {Array(3).fill(0).map((_, i) => (
                      <div key={i} className="h-16 bg-gray-200 rounded" />
                    ))}
                  </div>
                ) : plansData?.plans.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No weekly plans yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {plansData?.plans.slice(0, 5).map((plan) => (
                      <div
                        key={plan.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                        onClick={() => navigate(`/reports/weekly-plan/${plan.id}`)}
                      >
                        <div className="flex items-center gap-3">
                          {getStatusIcon(plan.status, plan.isOverdue)}
                          <div>
                            <p className="font-medium">
                              {getCurrentWeekDisplay(plan.weekStart, plan.weekEnd)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {plan.goals.length} goals, {plan.priorities.length} priorities
                            </p>
                          </div>
                        </div>
                        <Badge variant={getStatusColor(plan.status)}>
                          {plan.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Reports */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Recent Reports
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingReports ? (
                  <div className="animate-pulse space-y-2">
                    {Array(3).fill(0).map((_, i) => (
                      <div key={i} className="h-16 bg-gray-200 rounded" />
                    ))}
                  </div>
                ) : reportsData?.reports.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No weekly reports yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {reportsData?.reports.slice(0, 5).map((report) => (
                      <div
                        key={report.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                        onClick={() => navigate(`/reports/weekly-report/${report.id}`)}
                      >
                        <div className="flex items-center gap-3">
                          {getStatusIcon(report.status, report.isOverdue)}
                          <div>
                            <p className="font-medium">
                              {getCurrentWeekDisplay(report.weekStart, report.weekEnd)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {report.achievements.length} achievements
                              {report.productivityScore && ` • ${report.productivityScore}/10`}
                            </p>
                          </div>
                        </div>
                        <Badge variant={getStatusColor(report.status)}>
                          {report.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* View All Button */}
          <div className="flex justify-center">
            <Button 
              variant="outline"
              onClick={() => navigate('/reports/history')}
            >
              View All Reports
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default Reports