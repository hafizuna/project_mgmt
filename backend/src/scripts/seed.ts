import 'dotenv/config'
import { AuthUtils } from '../lib/auth.js'
import { prisma } from '../lib/database.js'

async function seed() {
  try {
    console.log('🌱 Starting database seed...')

    // Create organization
    const org = await prisma.organization.upsert({
      where: { slug: 'cool' },
      update: {},
      create: {
        name: 'Cool',
        slug: 'cool',
        settings: {
          // Frontend expected settings
          allowProjectCreation: true,
          maxProjectMembers: 10,
          defaultTaskPriority: 'Medium',
          requireTaskDescription: false,
          
          // Legacy settings
          timezone: 'UTC',
          dateFormat: 'YYYY-MM-DD',
        }
      }
    })
    console.log('✅ Organization created:', org.name)

    // Hash admin password
    const hashedPassword = await AuthUtils.hashPassword('icosadmin')

    // Create admin user
    const admin = await prisma.user.upsert({
      where: { email: 'admin@icosconsult.com' },
      update: {},
      create: {
        email: 'admin@icosconsult.com',
        name: 'Admin User',
        password: hashedPassword,
        role: 'Admin',
        orgId: org.id,
        isActive: true,
      }
    })
    console.log('✅ Admin user created:', admin.email)

    // Create a sample project (optional)
    const project = await prisma.project.create({
      data: {
        name: 'Sample Project',
        description: 'A sample project to get started',
        status: 'Active',
        priority: 'Medium',
        budget: 50000,
        startDate: new Date(),
        dueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
        orgId: org.id,
        ownerId: admin.id,
      }
    })
    console.log('✅ Sample project created:', project.name)

    // Add admin as project member
    await prisma.projectMember.create({
      data: {
        projectId: project.id,
        userId: admin.id,
        role: 'Owner',
      }
    })
    console.log('✅ Admin added as project owner')

    // Create some sample audit log entries for testing
    console.log('📝 Creating sample audit logs...')
    await prisma.auditLog.createMany({
      data: [
        {
          userId: admin.id,
          orgId: org.id,
          action: 'user.created',
          entityType: 'User',
          entityId: admin.id,
          metadata: { createdUserRole: 'Admin', createdUserEmail: admin.email },
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0 (Seed Script)',
          createdAt: new Date(),
        },
        {
          userId: admin.id,
          orgId: org.id,
          action: 'project.created',
          entityType: 'Project',
          entityId: project.id,
          metadata: { projectName: project.name, projectStatus: project.status },
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0 (Seed Script)',
          createdAt: new Date(),
        },
        {
          userId: admin.id,
          orgId: org.id,
          action: 'org.settings_updated',
          entityType: 'Organization',
          entityId: org.id,
          metadata: { updatedFields: ['settings'], timestamp: new Date().toISOString() },
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0 (Seed Script)',
          createdAt: new Date(),
        },
        {
          userId: admin.id,
          orgId: org.id,
          action: 'auth.login',
          entityType: 'Auth',
          entityId: admin.id,
          metadata: { loginMethod: 'password', successful: true },
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0 (Seed Script)',
          createdAt: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
        },
      ],
    })
    console.log('✅ Sample audit logs created')

    console.log('\n🎉 Seed completed successfully!')
    console.log('\nLogin credentials:')
    console.log('Email: admin@icosconsult.com')
    console.log('Password: icosadmin')
    console.log(`Organization: ${org.name} (${org.slug})`)

  } catch (error) {
    console.error('❌ Seed failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

seed()
