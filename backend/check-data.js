
import { prisma } from './src/lib/database.js';
async function checkData() {
  const users = await prisma.user.findMany({ select: { id: true, name: true, email: true, orgId: true } });
  console.log('Users in database:', users.length);
  users.forEach(u => console.log(`- ${u.name} (${u.email}) - Org: ${u.orgId}`));
  
  const orgs = await prisma.organization.findMany({ select: { id: true, name: true } });
  console.log('Organizations:', orgs.length);
  orgs.forEach(o => console.log(`- ${o.name} (${o.id})`));
  
  await prisma.$disconnect();
}
checkData().catch(console.error);

