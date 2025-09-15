import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { AuthUtils } from './src/lib/auth.js'

const prisma = new PrismaClient()

async function resetAdminPassword() {
  try {
    console.log('🔄 Resetting admin password...')
    
    const newPassword = 'icosadmin'
    const hashedPassword = await AuthUtils.hashPassword(newPassword)
    
    const updatedUser = await prisma.user.update({
      where: { email: 'admin@icosconsult.com' },
      data: { password: hashedPassword },
      select: {
        id: true,
        email: true,
        name: true,
        role: true
      }
    })
    
    console.log('✅ Password reset successfully for user:', updatedUser)
    console.log('📧 Email:', updatedUser.email)
    console.log('🔑 Password:', newPassword)
    
    // Test the new password
    const user = await prisma.user.findUnique({
      where: { email: 'admin@icosconsult.com' }
    })
    
    const isValid = await AuthUtils.verifyPassword(newPassword, user.password)
    console.log('✓ Password verification test:', isValid ? '✅ SUCCESS' : '❌ FAILED')
    
  } catch (error) {
    console.error('❌ Error resetting password:', error)
  } finally {
    await prisma.$disconnect()
  }
}

resetAdminPassword()