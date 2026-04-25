import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

const ADMIN_EMAIL = 'yotamberk@gmail.com';

const EXERCISES: {
  name: string;
  videoUrl?: string;
  variants?: string[];
}[] = [
  { name: 'Planche', variants: ['Tuck', 'Adv. Tuck', 'Straddle', 'Half-Flag', 'Full'] },
  {
    name: 'Front Lever',
    variants: [
      'Tuck',
      'Adv. Tuck',
      'One-Leg Tuck',
      'One-Leg Adv. Tuck',
      'Straddle',
      'Half-Flag',
      'Full',
    ],
  },
  { name: 'Hang', variants: ['2 Hands', '1 Hand'] },
  { name: 'Squat Sit' },
  { name: 'Cat Stretch', variants: ['Floor', 'Elevated'] },
  { name: 'Shoulder Dislocates', variants: ['Rubber Band', 'Stick'] },
  { name: 'Wrist Warm Up' },
  { name: 'Cobra Hang Low Bar' },
  { name: 'Side Hang Low Bar' },
  { name: 'Eagle Hang Low Bar' },
  {
    name: 'Handstand',
    variants: ['Chest to Wall', 'Back to Wall', 'Detachments', 'Jumps', 'Full'],
  },
  {
    name: 'Handstand Push Up',
    variants: ['Wall', 'Wall Elevated', 'Full', 'Elevated'],
  },
  { name: 'Pull Ups' },
  { name: 'Chin Ups' },
  { name: 'Wide Behind the Back Pull Ups' },
  { name: 'Dips' },
  { name: 'Back Squat' },
  { name: 'Front Squat' },
  { name: 'Horse Stance Squat' },
  { name: 'Cossack Squat' },
  { name: 'Cuban Rotation' },
  { name: 'Jefferson Curl' },
  {
    name: 'Good Morning',
    variants: [
      'Seated',
      'Standing',
      'Floor',
      'Straddle Seated',
      'Straddle Standing',
    ],
  },
  { name: 'Dumbbell Chest Press' },
];

async function main() {
  console.log('Seeding database...');

  // Create/update admin + trainer + trainee user
  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {},
    create: {
      email: ADMIN_EMAIL,
      name: 'Yotam Berkowitz',
      roles: {
        create: [{ role: Role.ADMIN }, { role: Role.TRAINER }, { role: Role.TRAINEE }],
      },
    },
    include: { roles: true },
  });

  // Ensure all three roles exist (idempotent in case user already existed)
  for (const role of [Role.ADMIN, Role.TRAINER, Role.TRAINEE]) {
    const exists = admin.roles.some((r) => r.role === role);
    if (!exists) {
      await prisma.userRole.create({ data: { userId: admin.id, role } });
    }
  }

  console.log(`Admin/trainer/trainee: ${admin.email}`);

  // Seed exercises (skip if already exists by name+trainer)
  for (let i = 0; i < EXERCISES.length; i++) {
    const { name, videoUrl, variants = [] } = EXERCISES[i]!;

    const existing = await prisma.exercise.findFirst({
      where: { trainerId: admin.id, name },
    });

    let exercise = existing;
    if (!exercise) {
      exercise = await prisma.exercise.create({
        data: {
          trainerId: admin.id,
          name,
          videoUrl: videoUrl ?? null,
          order: i,
        },
      });
      console.log(`  Exercise: ${name}`);
    }

    // Seed variants
    for (let j = 0; j < variants.length; j++) {
      const variantName = variants[j]!;
      const existingVariant = await prisma.exerciseVariant.findFirst({
        where: { exerciseId: exercise.id, name: variantName },
      });
      if (!existingVariant) {
        await prisma.exerciseVariant.create({
          data: {
            exerciseId: exercise.id,
            name: variantName,
            difficultyOrder: j,
          },
        });
      }
    }
  }

  console.log(`Seeded ${EXERCISES.length} exercises.`);
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
