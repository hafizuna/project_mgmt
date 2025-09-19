import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface ProjectAnalytics {
  basicProgress: number
  weightedProgress: number
  effortBasedProgress?: number
  velocity: {
    tasksPerWeek: number
    completionTrend: 'increasing' | 'decreasing' | 'stable'
  }
  health: 'excellent' | 'good' | 'warning' | 'critical'
  estimatedCompletion?: Date
  risks: string[]
}

export class ProjectProgressCalculator {
  /**
   * Calculate basic task-count based progress (current method)
   */
  static calculateBasicProgress(completedTasks: number, totalTasks: number): number {
    return totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
  }

  /**
   * Calculate weighted progress based on task status
   */
  static calculateWeightedProgress(tasks: Array<{ status: string }>): number {
    if (tasks.length === 0) return 0

    const statusWeights = {
      'Todo': 0,        // 0% progress
      'InProgress': 0.5, // 50% progress
      'Review': 0.8,    // 80% progress
      'Done': 1.0       // 100% progress
    }

    const totalProgress = tasks.reduce((sum, task) => {
      return sum + (statusWeights[task.status as keyof typeof statusWeights] || 0)
    }, 0)

    return Math.round((totalProgress / tasks.length) * 100)
  }

  /**
   * Calculate effort-based progress using task estimates
   */
  static calculateEffortBasedProgress(
    tasks: Array<{ status: string; estimate?: number }>
  ): number | undefined {
    const tasksWithEstimates = tasks.filter(task => task.estimate && task.estimate > 0)
    
    if (tasksWithEstimates.length === 0) return undefined

    const statusWeights = {
      'Todo': 0,
      'InProgress': 0.5,
      'Review': 0.8,
      'Done': 1.0
    }

    const totalEstimatedEffort = tasksWithEstimates.reduce((sum, task) => sum + (task.estimate || 0), 0)
    const completedEffort = tasksWithEstimates.reduce((sum, task) => {
      const weight = statusWeights[task.status as keyof typeof statusWeights] || 0
      return sum + (task.estimate || 0) * weight
    }, 0)

    return Math.round((completedEffort / totalEstimatedEffort) * 100)
  }

  /**
   * Calculate project velocity and trends
   */
  static async calculateVelocity(projectId: string): Promise<{
    tasksPerWeek: number
    completionTrend: 'increasing' | 'decreasing' | 'stable'
  }> {
    const now = new Date()
    const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000)
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

    // Get tasks completed in last 4 weeks
    const recentCompletions = await prisma.task.findMany({
      where: {
        projectId,
        status: 'Done',
        updatedAt: {
          gte: fourWeeksAgo
        }
      },
      select: {
        updatedAt: true
      }
    })

    const tasksPerWeek = recentCompletions.length / 4

    // Calculate trend (last 2 weeks vs previous 2 weeks)
    const lastTwoWeeks = recentCompletions.filter(task => task.updatedAt >= twoWeeksAgo).length
    const previousTwoWeeks = recentCompletions.filter(task => 
      task.updatedAt < twoWeeksAgo && task.updatedAt >= fourWeeksAgo
    ).length

    let completionTrend: 'increasing' | 'decreasing' | 'stable' = 'stable'
    if (lastTwoWeeks > previousTwoWeeks * 1.1) {
      completionTrend = 'increasing'
    } else if (lastTwoWeeks < previousTwoWeeks * 0.9) {
      completionTrend = 'decreasing'
    }

    return { tasksPerWeek, completionTrend }
  }

  /**
   * Calculate project health score
   */
  static calculateProjectHealth(
    progress: number,
    overdueTasks: number,
    totalTasks: number,
    dueDate?: Date
  ): 'excellent' | 'good' | 'warning' | 'critical' {
    const overdueRatio = totalTasks > 0 ? overdueTasks / totalTasks : 0
    const now = new Date()
    const daysUntilDue = dueDate ? Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null

    // Critical conditions
    if (overdueRatio > 0.3 || (daysUntilDue && daysUntilDue < 0 && progress < 90)) {
      return 'critical'
    }

    // Warning conditions
    if (overdueRatio > 0.15 || (daysUntilDue && daysUntilDue < 7 && progress < 80)) {
      return 'warning'
    }

    // Good conditions
    if (progress > 80 || overdueRatio < 0.05) {
      return 'excellent'
    }

    return 'good'
  }

  /**
   * Estimate project completion date based on velocity
   */
  static estimateCompletion(
    remainingTasks: number,
    tasksPerWeek: number
  ): Date | undefined {
    if (tasksPerWeek <= 0) return undefined

    const weeksRemaining = remainingTasks / tasksPerWeek
    const daysRemaining = weeksRemaining * 7

    return new Date(Date.now() + daysRemaining * 24 * 60 * 60 * 1000)
  }

  /**
   * Identify project risks
   */
  static identifyRisks(
    overdueTasks: number,
    unassignedTasks: number,
    totalTasks: number,
    dueDate?: Date
  ): string[] {
    const risks: string[] = []

    if (overdueTasks > 0) {
      risks.push(`${overdueTasks} overdue tasks`)
    }

    if (unassignedTasks > totalTasks * 0.3) {
      risks.push(`${unassignedTasks} unassigned tasks`)
    }

    if (dueDate) {
      const daysUntilDue = Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      if (daysUntilDue < 7) {
        risks.push('Due date approaching')
      }
    }

    return risks
  }

  /**
   * Get comprehensive project analytics
   */
  static async getProjectAnalytics(projectId: string): Promise<ProjectAnalytics> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        tasks: {
          select: {
            status: true,
            estimate: true,
            assigneeId: true,
            dueDate: true
          }
        }
      }
    })

    if (!project) {
      throw new Error('Project not found')
    }

    const completedTasks = project.tasks.filter(task => task.status === 'Done').length
    const overdueTasks = project.tasks.filter(task => 
      task.dueDate && task.dueDate < new Date() && task.status !== 'Done'
    ).length
    const unassignedTasks = project.tasks.filter(task => !task.assigneeId).length

    const basicProgress = this.calculateBasicProgress(completedTasks, project.tasks.length)
    const weightedProgress = this.calculateWeightedProgress(project.tasks)
    const effortBasedProgress = this.calculateEffortBasedProgress(project.tasks)
    const velocity = await this.calculateVelocity(projectId)
    const health = this.calculateProjectHealth(
      weightedProgress,
      overdueTasks,
      project.tasks.length,
      project.dueDate || undefined
    )
    const estimatedCompletion = this.estimateCompletion(
      project.tasks.length - completedTasks,
      velocity.tasksPerWeek
    )
    const risks = this.identifyRisks(
      overdueTasks,
      unassignedTasks,
      project.tasks.length,
      project.dueDate || undefined
    )

    return {
      basicProgress,
      weightedProgress,
      effortBasedProgress,
      velocity,
      health,
      estimatedCompletion,
      risks
    }
  }
}