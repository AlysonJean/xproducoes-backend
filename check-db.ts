import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const userCount = await prisma.user.count();
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN' },
    select: { email: true, name: true }
  });

  console.log('Total users:', userCount);
  console.log('Admins found:', admins);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
