#!/usr/bin/env ts-node

import { PrismaClient } from '@prisma/client'
import { TaskScheduler } from '../services/TaskScheduler.js'
import { NotificationService } from '../services/NotificationService.js'
import { ReportNotificationService } from '../services/ReportNotificationService.js'

const prisma = new PrismaClient()

/**
 * Test script to verify all notification triggers work correctly
 */
async function testAllNotifications() {
  console.log('🧪 Starting notification system tests...\n')
  
  try {
    // Initialize services
    const scheduler = TaskScheduler.getInstance()
    const notificationService = NotificationService.getInstance()
    const reportService = ReportNotificationService.getInstance()

    console.log('📊 Current notification counts by type:')
    const notificationStats = await prisma.notification.groupBy({
      by: ['type'],
      _count: {
        id: true
      }
    })

    notificationStats.forEach(stat => {
      console.log(`  • ${stat.type}: ${stat._count.id} notifications`)
    })

    console.log('\n🎯 Testing manual notification triggers...\n')

    // Test 1: Task due reminders
    console.log('1️⃣ Testing task due reminders...')
    await scheduler.runManualCheck('tasks')
    
    // Test 2: Meeting reminders  
    console.log('2️⃣ Testing meeting reminders...')
    await scheduler.runManualCheck('meetings')
    
    // Test 3: Weekly plan reminders
    console.log('3️⃣ Testing weekly plan reminders...')
    await scheduler.runManualCheck('plan')
    
    // Test 4: Weekly report reminders
    console.log('4️⃣ Testing weekly report reminders...')
    await scheduler.runManualCheck('report')
    
    // Test 5: Compliance alerts
    console.log('5️⃣ Testing compliance alerts...')
    await scheduler.runManualCheck('compliance')
    
    // Test 6: Scheduled notifications
    console.log('6️⃣ Testing scheduled notifications...')
    await scheduler.runManualCheck('scheduled')

    // Test 7: Create test notifications for different scenarios
    console.log('7️⃣ Creating test notifications...')
    
    // Get a test user and organization
    const testUser = await prisma.user.findFirst({
      select: {
        id: true,
        name: true,
        email: true,
        orgId: true
      }
    })

    if (!testUser || !testUser.orgId) {
      console.log('⚠️  No test user or organization found. Creating test data...')
      await createTestData()
    } else {
      // Create various notification types
      const notifications = [
        {
          type: 'TASK_ASSIGNED' as any,
          title: 'Test Task Assignment',
          message: 'You have been assigned a new task',
        },
        {
          type: 'PROJECT_UPDATE' as any,
          title: 'Test Project Update',
          message: 'Your project has been updated',
        },
        {
          type: 'MEETING_REMINDER' as any,
          title: 'Test Meeting Reminder',
          message: 'You have an upcoming meeting',
        },
        {
          type: 'REPORT_DUE' as any,
          title: 'Test Report Due',
          message: 'Your weekly report is due',
        }
      ]

      for (const notif of notifications) {
        await notificationService.createNotification({
          userId: testUser.id,
          orgId: testUser.orgId!,
          type: notif.type,
          category: 'SYSTEM' as any,
          title: notif.title,
          message: notif.message,
          priority: 'Medium' as any
        })
      }
    }

    // Test 8: Check notification counts after tests
    console.log('\n📈 Updated notification counts after tests:')
    const updatedStats = await prisma.notification.groupBy({
      by: ['type'],
      _count: {
        id: true
      }
    })

    updatedStats.forEach(stat => {
      console.log(`  • ${stat.type}: ${stat._count.id} notifications`)
    })

    // Test 9: Check unread notifications per user
    console.log('\n📬 Unread notifications by user:')
    const unreadByUser = await prisma.notification.groupBy({
      by: ['userId'],
      where: {
        isRead: false
      },
      _count: {
        id: true
      }
    })

    for (const userStat of unreadByUser.slice(0, 5)) { // Show top 5 users
      const user = await prisma.user.findUnique({
        where: { id: userStat.userId },
        select: { name: true, email: true }
      })
      console.log(`  • ${user?.name || 'Unknown'} (${user?.email}): ${userStat._count ? userStat._count.id : 0} unread`)
    }

    // Test 10: Verify notification preferences
    console.log('\n⚙️  Testing notification preferences...')
    const userPrefs = await prisma.notificationPreference.findMany({
      take: 5,
      include: {
        user: {
          select: { name: true }
        }
      }
    })

    userPrefs.forEach(pref => {
      console.log(`  • ${pref.user.name}: Email=${pref.enableEmail}, Push=${pref.enablePush}, InApp=${pref.enableInApp}`)
    })

    console.log('\n✅ All notification tests completed successfully!')

  } catch (error) {
    console.error('❌ Error during notification testing:', error)
  } finally {
    await prisma.$disconnect()
  }
}

/**
 * Create test data if needed
 */
async function createTestData() {
  console.log('🏗️  Creating test organization and user...')
  
  try {
    // Create test organization
    const org = await prisma.organization.create({
      data: {
        name: 'Test Org for Notifications',
        slug: 'test-notifications-org',
        settings: {}
      }
    })

    // Create test user
    const user = await prisma.user.create({
      data: {
        email: 'testuser@testnotifications.com',
        name: 'Test User',
        password: 'test-hash',
        orgId: org.id,
        role: 'Team'
      }
    })

    // Create test project
    const project = await prisma.project.create({
      data: {
        name: 'Test Project',
        description: 'Project for testing notifications',
        orgId: org.id,
        ownerId: user.id,
        status: 'Active'
      }
    })

    // Create test task with due date (tomorrow)
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    await prisma.task.create({
      data: {
        title: 'Test Task Due Tomorrow',
        description: 'Task for testing due date notifications',
        projectId: project.id,
        assigneeId: user.id,
        reporterId: user.id,
        status: 'InProgress',
        priority: 'High',
        dueDate: tomorrow
      }
    })

    // Create test meeting (in 30 minutes)
    const meetingTime = new Date()
    meetingTime.setMinutes(meetingTime.getMinutes() + 30)
    
    const meeting = await prisma.meeting.create({
      data: {
        title: 'Test Meeting',
        description: 'Meeting for testing reminders',
        startTime: meetingTime,
        endTime: new Date(meetingTime.getTime() + 60 * 60 * 1000), // 1 hour later
        orgId: org.id,
        createdById: user.id,
        projectId: project.id
      }
    })

    // Add user as meeting attendee
    await prisma.meetingAttendee.create({
      data: {
        meetingId: meeting.id,
        userId: user.id,
        status: 'Accepted'
      }
    })

    // Create notification preferences
    await prisma.notificationPreference.create({
      data: {
        userId: user.id,
        orgId: org.id,
        enableInApp: true,
        enableEmail: true,
        enablePush: true,
        taskNotifications: true,
        projectNotifications: true,
        meetingNotifications: true,
        reportNotifications: true,
        taskEmail: true,
        projectEmail: true,
        meetingEmail: true,
        reportEmail: true
      }
    })

    console.log('✅ Test data created successfully')
    
  } catch (error) {
    console.error('❌ Error creating test data:', error)
  }
}

/**
 * Clean up test data
 */
async function cleanupTestData() {
  console.log('🧹 Cleaning up test data...')
  
  try {
    // Delete test notifications
    await prisma.notification.deleteMany({
      where: {
        title: {
          startsWith: 'Test '
        }
      }
    })

    // Delete test organization and cascade
    await prisma.organization.deleteMany({
      where: {
        name: 'Test Org for Notifications'
      }
    })

    console.log('✅ Test data cleaned up')
  } catch (error) {
    console.error('❌ Error cleaning up test data:', error)
  }
}

// Command line interface
async function main() {
  const command = process.argv[2]
  
  switch (command) {
    case 'test':
      await testAllNotifications()
      break
    case 'create-test-data':
      await createTestData()
      break
    case 'cleanup':
      await cleanupTestData()
      break
    default:
      console.log('Usage: ts-node test-notifications.ts [test|create-test-data|cleanup]')
      console.log('  test           - Run all notification tests')
      console.log('  create-test-data - Create test data for notifications')
      console.log('  cleanup        - Remove test data')
  }
}

if (require.main === module) {
  main().catch(console.error)
}

export { testAllNotifications, createTestData, cleanupTestData }