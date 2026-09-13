const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const users = await prisma.user.findMany({ select: { id: true, email: true, username: true, role: true, createdAt: true } });
  console.log(JSON.stringify(users, null, 2));
  await prisma.$disconnect();
})().catch(e => { console.error(e.message); process.exit(1); });
