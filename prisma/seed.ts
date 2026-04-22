import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: 'yotamberk@gmail.com' },
    update: {},
    create: {
      email: 'yotamberk@gmail.com',
      name: 'Yotam Berkowitz',
      roles: {
        create: [
          { role: Role.ADMIN },
          { role: Role.TRAINER },
          { role: Role.TRAINEE },
        ],
      },
    },
  });

  console.log(`Created/updated admin: ${admin.email}`);
  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
