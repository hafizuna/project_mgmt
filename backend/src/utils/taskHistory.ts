import { TaskHistoryAction, TaskStatus, TaskPriority } from '@prisma/client'
import { prisma } from '../lib/database.js'

interface TaskHistoryParams {
  taskId: string
  userId: string
  action: TaskHistoryAction
  field?: string
  oldValue?: any
  newValue?: any
  description?: string
}

export class TaskHistoryLogger {
  static async log({
    taskId,
    userId,
    action,
    field,
    oldValue,
    newValue,
    description
  }: TaskHistoryParams): Promise<void> {
    try {
      // Generate human-readable description if not provided
      const finalDescription = description || this.generateDescription(action, field, oldValue, newValue)

      await prisma.taskHistory.create({
        data: {
          taskId,
          userId,
          action,
          field,
          oldValue: oldValue ? JSON.stringify(oldValue) : null,
          newValue: newValue ? JSON.stringify(newValue) : null,
          description: finalDescription,
        }
      })
    } catch (error) {
      console.error('Failed to create task history entry:', error)
    }
  }

  static generateDescription(
    action: TaskHistoryAction, 
    field?: string, 
    oldValue?: any, 
    newValue?: any
  ): string {
    switch (action) {
      case TaskHistoryAction.CREATED:
        return 'created this task'
      
      case TaskHistoryAction.STATUS_CHANGED:
        return `changed status from "${this.formatStatus(oldValue)}" to "${this.formatStatus(newValue)}"`
      
      case TaskHistoryAction.ASSIGNED:
        return newValue ? `assigned this task to ${newValue}` : 'assigned this task'
      
      case TaskHistoryAction.UNASSIGNED:
        return 'unassigned this task'
      
      case TaskHistoryAction.DUE_DATE_CHANGED:
        if (!oldValue && newValue) {
          return `set due date to ${this.formatDate(newValue)}`
        } else if (oldValue && !newValue) {
          return 'removed due date'
        } else {
          return `changed due date from ${this.formatDate(oldValue)} to ${this.formatDate(newValue)}`
        }
      
      case TaskHistoryAction.PRIORITY_CHANGED:
        return `changed priority from "${this.formatPriority(oldValue)}" to "${this.formatPriority(newValue)}"`
      
      case TaskHistoryAction.TITLE_CHANGED:
        return `changed title from "${oldValue}" to "${newValue}"`
      
      case TaskHistoryAction.DESCRIPTION_CHANGED:
        if (!oldValue && newValue) {
          return 'added description'
        } else if (oldValue && !newValue) {
          return 'removed description'
        } else {
          return 'updated description'
        }
      
      case TaskHistoryAction.COMMENT_ADDED:
        return 'added a comment'
      
      case TaskHistoryAction.UPDATED:
        return field ? `updated ${field}` : 'updated this task'
      
      default:
        return 'made changes to this task'
    }
  }

  private static formatStatus(status: TaskStatus): string {
    switch (status) {
      case TaskStatus.Todo:
        return 'To Do'
      case TaskStatus.InProgress:
        return 'In Progress'
      case TaskStatus.Review:
        return 'Review'
      case TaskStatus.Done:
        return 'Done'
      case TaskStatus.OnHold:
        return 'On Hold'
      default:
        return status
    }
  }

  private static formatPriority(priority: TaskPriority): string {
    switch (priority) {
      case TaskPriority.Low:
        return 'Low'
      case TaskPriority.Medium:
        return 'Medium'
      case TaskPriority.High:
        return 'High'
      case TaskPriority.Critical:
        return 'Critical'
      default:
        return priority
    }
  }

  private static formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Helper method to track task creation
  static async logTaskCreation(taskId: string, userId: string): Promise<void> {
    await this.log({
      taskId,
      userId,
      action: TaskHistoryAction.CREATED,
      description: 'created this task'
    })
  }

  // Helper method to track field changes
  static async logFieldChange(
    taskId: string,
    userId: string,
    field: string,
    oldValue: any,
    newValue: any
  ): Promise<void> {
    let action: TaskHistoryAction = TaskHistoryAction.UPDATED

    // Map specific fields to specific actions
    switch (field) {
      case 'status':
        action = TaskHistoryAction.STATUS_CHANGED
        break
      case 'assigneeId':
        action = newValue ? TaskHistoryAction.ASSIGNED : TaskHistoryAction.UNASSIGNED
        break
      case 'dueDate':
        action = TaskHistoryAction.DUE_DATE_CHANGED
        break
      case 'priority':
        action = TaskHistoryAction.PRIORITY_CHANGED
        break
      case 'title':
        action = TaskHistoryAction.TITLE_CHANGED
        break
      case 'description':
        action = TaskHistoryAction.DESCRIPTION_CHANGED
        break
    }

    await this.log({
      taskId,
      userId,
      action,
      field,
      oldValue,
      newValue
    })
  }

  // Helper method to track status changes (for bulk operations)
  static async logStatusChange(
    taskId: string,
    userId: string,
    oldStatus: TaskStatus,
    newStatus: TaskStatus
  ): Promise<void> {
    await this.log({
      taskId,
      userId,
      action: TaskHistoryAction.STATUS_CHANGED,
      field: 'status',
      oldValue: oldStatus,
      newValue: newStatus
    })
  }
}
