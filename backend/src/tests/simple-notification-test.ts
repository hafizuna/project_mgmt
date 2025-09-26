#!/usr/bin/env ts-node

import { prisma } from '../lib/database.js'

/**
 * Simple test to verify notification system works
 */
async function testNotifications() {
  console.log('🧪 Testing notification system...\n')
  
  try {
    // Check current notification count
    const totalNotifications = await prisma.notification.count()
    console.log(`📊 Total notifications in database: ${totalNotifications}`)
    
    // Check notifications by type
    console.log('\n📈 Notifications by type:')
    const notificationsByType = await prisma.notification.groupBy({
      by: ['type'],
      _count: {
        id: true
      }
    })
    
    notificationsByType.forEach(stat => {
      console.log(`  • ${stat.type}: ${stat._count.id}`)
    })
    
    // Check unread notifications
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
    
    for (const userStat of unreadByUser.slice(0, 5)) {
      const user = await prisma.user.findUnique({
        where: { id: userStat.userId },
        select: { name: true, email: true }
      })
      const count = userStat._count ? userStat._count.id : 0
      console.log(`  • ${user?.name || 'Unknown'} (${user?.email}): ${count} unread`)
    }
    
    // Check notification preferences
    console.log('\n⚙️ Notification preferences:')
    const prefs = await prisma.notificationPreference.findMany({
      take: 3,
      include: {
        user: {
          select: { name: true }
        }
      }
    })
    
    prefs.forEach(pref => {
      console.log(`  • ${pref.user.name}: Email=${pref.enableEmail}, InApp=${pref.enableInApp}`)
    })
    
    console.log('\n✅ Notification system test completed!')
    
  } catch (error) {
    console.error('❌ Error during testing:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Check if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  testNotifications().catch(console.error)
}

export { testNotifications }
