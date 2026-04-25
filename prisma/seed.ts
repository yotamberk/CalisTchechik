import { PrismaClient, Role, VolumeType } from '@prisma/client';

const prisma = new PrismaClient();

const ADMIN_EMAIL = 'yotamberk@gmail.com';

const EXERCISES: { name: string; videoUrl?: string; variants?: string[] }[] = [
  { name: 'Planche', variants: ['Tuck', 'Adv. Tuck', 'Straddle', 'Half-Flag', 'Full'] },
  {
    name: 'Front Lever',
    variants: ['Tuck', 'Adv. Tuck', 'One-Leg Tuck', 'One-Leg Adv. Tuck', 'Straddle', 'Half-Flag', 'Full'],
  },
  { name: 'Hang', variants: ['2 Hands', '1 Hand'] },
  { name: 'Squat Sit' },
  { name: 'Cat Stretch', variants: ['Floor', 'Elevated'] },
  { name: 'Shoulder Dislocates', variants: ['Rubber Band', 'Stick'] },
  { name: 'Wrist Warm Up' },
  { name: 'Cobra Hang Low Bar' },
  { name: 'Side Hang Low Bar' },
  { name: 'Eagle Hang Low Bar' },
  { name: 'Handstand', variants: ['Chest to Wall', 'Back to Wall', 'Detachments', 'Jumps', 'Full'] },
  { name: 'Handstand Push Up', variants: ['Wall', 'Wall Elevated', 'Full', 'Elevated'] },
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
  { name: 'Good Morning', variants: ['Seated', 'Standing', 'Floor', 'Straddle Seated', 'Straddle Standing'] },
  { name: 'Dumbbell Chest Press' },
  { name: 'Elevated Pistol Squat', variants: ['50cm Box', '70cm Box', '80cm Box', 'Full'] },
];

// ---------------------------------------------------------------------------
// Plan definition helpers
// ---------------------------------------------------------------------------

type RowDef = {
  exercise: string;
  variant?: string;
  sets: number;
  volumeType: VolumeType;
  volumeValue: string;
  restMinutes: number;
  groupKey?: string;
};

type SectionDef = { name: string; rows: RowDef[] };
type SessionDef = { name: string; sections: SectionDef[] };
type WeekDef = { weekNumber: number; startDate: string; sessions: SessionDef[] };

// ---------------------------------------------------------------------------
// PREP session (identical every week)
// ---------------------------------------------------------------------------
const PREP_SESSION: SessionDef = {
  name: 'Prep',
  sections: [
    {
      name: 'Circuit',
      rows: [
        { exercise: 'Hang', variant: '2 Hands', sets: 2, volumeType: 'NUMBER', volumeValue: '30"', restMinutes: 0, groupKey: 'A' },
        { exercise: 'Squat Sit', sets: 1, volumeType: 'NUMBER', volumeValue: '30"', restMinutes: 0, groupKey: 'A' },
        { exercise: 'Cat Stretch', variant: 'Elevated', sets: 1, volumeType: 'NUMBER', volumeValue: '30"', restMinutes: 0, groupKey: 'A' },
        { exercise: 'Shoulder Dislocates', variant: 'Stick', sets: 1, volumeType: 'NUMBER', volumeValue: '10', restMinutes: 1, groupKey: 'A' },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Sessions per week — only the rows that change each week are listed per week
// ---------------------------------------------------------------------------

function sessionA(
  flVariant: string,
  flVolume: string,
  plancheVolume: string,
  chinVolume: string,
  dipsVolume: string,
  pistolVolume: string,
  pistolVariant: string,
): SessionDef {
  return {
    name: 'Session A',
    sections: [
      {
        name: 'Handstand',
        rows: [
          { exercise: 'Wrist Warm Up', sets: 1, volumeType: 'NUMBER', volumeValue: '1', restMinutes: 0 },
          { exercise: 'Cobra Hang Low Bar', sets: 2, volumeType: 'NUMBER', volumeValue: '30"', restMinutes: 1 },
          { exercise: 'Handstand', sets: 3, volumeType: 'MAX', volumeValue: '', restMinutes: 0 },
        ],
      },
      {
        name: 'Strength',
        rows: [
          { exercise: 'Elevated Pistol Squat', variant: pistolVariant, sets: 3, volumeType: 'NUMBER', volumeValue: pistolVolume, restMinutes: 2.5 },
          { exercise: 'Front Lever', variant: flVariant, sets: 3, volumeType: 'NUMBER', volumeValue: flVolume, restMinutes: 3 },
          { exercise: 'Planche', variant: 'Straddle', sets: 3, volumeType: 'NUMBER', volumeValue: plancheVolume, restMinutes: 3 },
          { exercise: 'Chin Ups', sets: 2, volumeType: 'NUMBER', volumeValue: chinVolume, restMinutes: 2, groupKey: 'D' },
          { exercise: 'Dips', sets: 2, volumeType: 'NUMBER', volumeValue: dipsVolume, restMinutes: 2, groupKey: 'D' },
          { exercise: 'Good Morning', variant: 'Seated', sets: 3, volumeType: 'NUMBER', volumeValue: '6 (30kg)', restMinutes: 2 },
        ],
      },
    ],
  };
}

function sessionB(
  squatVolume: string,
  hsVolume: string,
  pullVolume: string,
  jeffVolume: string,
  horseVolume: string,
  cubanVolume: string,
): SessionDef {
  return {
    name: 'Session B',
    sections: [
      {
        name: 'Handstand',
        rows: [
          { exercise: 'Wrist Warm Up', sets: 1, volumeType: 'NUMBER', volumeValue: '1', restMinutes: 0 },
          { exercise: 'Side Hang Low Bar', sets: 2, volumeType: 'NUMBER', volumeValue: '30"', restMinutes: 1 },
          { exercise: 'Handstand', sets: 3, volumeType: 'MAX', volumeValue: '', restMinutes: 0 },
        ],
      },
      {
        name: 'Strength',
        rows: [
          { exercise: 'Back Squat', sets: 3, volumeType: 'NUMBER', volumeValue: squatVolume, restMinutes: 3 },
          { exercise: 'Handstand Push Up', variant: 'Wall Elevated', sets: 3, volumeType: 'NUMBER', volumeValue: hsVolume, restMinutes: 3 },
          { exercise: 'Pull Ups', sets: 3, volumeType: 'NUMBER', volumeValue: pullVolume, restMinutes: 3 },
          { exercise: 'Jefferson Curl', sets: 3, volumeType: 'NUMBER', volumeValue: jeffVolume, restMinutes: 2, groupKey: 'D' },
          { exercise: 'Horse Stance Squat', sets: 3, volumeType: 'NUMBER', volumeValue: horseVolume, restMinutes: 0, groupKey: 'D' },
          { exercise: 'Cuban Rotation', sets: 3, volumeType: 'NUMBER', volumeValue: cubanVolume, restMinutes: 2 },
        ],
      },
    ],
  };
}

function sessionC(
  cossackVolume: string,
  flVariant: string,
  flVolume: string,
  flSets: number,
  plancheSets: number,
  plancheVolume: string,
  dbVolume: string,
  wideVolume: string,
  gmVolume: string,
): SessionDef {
  return {
    name: 'Session C',
    sections: [
      {
        name: 'Handstand',
        rows: [
          { exercise: 'Wrist Warm Up', sets: 1, volumeType: 'NUMBER', volumeValue: '1', restMinutes: 0 },
          { exercise: 'Eagle Hang Low Bar', sets: 2, volumeType: 'NUMBER', volumeValue: '30"', restMinutes: 1 },
          { exercise: 'Handstand', sets: 3, volumeType: 'MAX', volumeValue: '', restMinutes: 0 },
        ],
      },
      {
        name: 'Strength',
        rows: [
          { exercise: 'Cossack Squat', sets: 3, volumeType: 'NUMBER', volumeValue: cossackVolume, restMinutes: 2.5 },
          { exercise: 'Front Lever', variant: flVariant, sets: flSets, volumeType: 'NUMBER', volumeValue: flVolume, restMinutes: 3 },
          { exercise: 'Planche', variant: 'Straddle', sets: plancheSets, volumeType: 'NUMBER', volumeValue: plancheVolume, restMinutes: 3 },
          { exercise: 'Dumbbell Chest Press', sets: 2, volumeType: 'NUMBER', volumeValue: dbVolume, restMinutes: 2, groupKey: 'D' },
          { exercise: 'Wide Behind the Back Pull Ups', sets: 2, volumeType: 'NUMBER', volumeValue: wideVolume, restMinutes: 2, groupKey: 'D' },
          { exercise: 'Good Morning', variant: 'Straddle Standing', sets: 3, volumeType: 'NUMBER', volumeValue: gmVolume, restMinutes: 2 },
        ],
      },
    ],
  };
}

const PLAN_WEEKS: WeekDef[] = [
  {
    weekNumber: 1,
    startDate: '2026-04-13',
    sessions: [
      PREP_SESSION,
      sessionA('Straddle', '8"', '8 (-15kg)', '8 (+15kg)', '8 (+15kg)', '5 (50cm)', '50cm Box'),
      sessionB('5 (70kg)', '5 (+15cm)', '5 (+10kg)', '8 (30kg)', '8', '8 (10kg)'),
      sessionC('5 (10kg)', 'Straddle', '8"', 4, 4, '8 (-15kg)', '10 (7kg/hand)', '10 (-10kg)', '10 (5kg)'),
    ],
  },
  {
    weekNumber: 2,
    startDate: '2026-04-20',
    sessions: [
      PREP_SESSION,
      sessionA('One-Leg Adv. Tuck', '8"', '8 (-15kg)', '7 (+16kg)', '7 (+16kg)', '5 (70cm)', '70cm Box'),
      sessionB('5 (82kg)', '5 (+10cm)', '5 (+20kg)', '8 (30kg)', '12', '8 (15kg)'),
      sessionC('5 (15kg)', 'One-Leg Adv. Tuck', '8"', 3, 4, '8 (-15kg)', '10 (10kg/hand)', '10', '10 (5kg)'),
    ],
  },
  {
    weekNumber: 3,
    startDate: '2026-04-27',
    sessions: [
      PREP_SESSION,
      sessionA('One-Leg Adv. Tuck', '10"', '8 (-25kg)', '7 (+16kg)', '7 (+16kg)', '5 (70cm)', '70cm Box'),
      sessionB('5 (85kg)', '5 (+15cm)', '5 (+21kg)', '8 (30kg)', '12', '8 (15kg)'),
      sessionC('5 (20kg)', 'One-Leg Adv. Tuck', '10"', 3, 4, '8 (-25kg)', '10 (15kg/hand)', '12', '10 (5kg)'),
    ],
  },
  {
    weekNumber: 4,
    startDate: '2026-05-04',
    sessions: [
      PREP_SESSION,
      sessionA('One-Leg Adv. Tuck', '8"', '6 (-15kg)', '6 (+12kg)', '6 (+12kg)', '5 (50cm)', '50cm Box'),
      sessionB('5 (70kg)', '5 (+10cm)', '5 (+15kg)', '6 (25kg)', '8', '6 (10kg)'),
      sessionC('5 (10kg)', 'One-Leg Adv. Tuck', '8"', 3, 3, '6 (-15kg)', '8 (10kg/hand)', '8 (-10kg)', '8 (5kg)'),
    ],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getExerciseId(trainerId: string, name: string): Promise<string> {
  const ex = await prisma.exercise.findFirst({ where: { trainerId, name } });
  if (!ex) throw new Error(`Exercise not found: "${name}"`);
  return ex.id;
}

async function getVariantId(exerciseId: string, name: string): Promise<string | null> {
  if (!name) return null;
  const v = await prisma.exerciseVariant.findFirst({ where: { exerciseId, name } });
  if (!v) throw new Error(`Variant not found: "${name}" on exercise ${exerciseId}`);
  return v.id;
}

async function seedSection(
  sessionId: string,
  sectionDef: SectionDef,
  sectionOrder: number,
  trainerId: string,
) {
  const section = await prisma.section.create({
    data: { sessionId, name: sectionDef.name, order: sectionOrder },
  });

  for (let r = 0; r < sectionDef.rows.length; r++) {
    const row = sectionDef.rows[r]!;
    const exerciseId = await getExerciseId(trainerId, row.exercise);
    const variantId = row.variant ? await getVariantId(exerciseId, row.variant) : null;

    await prisma.exerciseRow.create({
      data: {
        sectionId: section.id,
        order: r,
        groupKey: row.groupKey ?? null,
        exerciseId,
        variantId,
        sets: row.sets,
        volumeType: row.volumeType,
        volumeValue: row.volumeValue,
        restMinutes: row.restMinutes,
      },
    });
  }
}

async function seedSession(weekId: string, sessionDef: SessionDef, order: number, trainerId: string) {
  const session = await prisma.session.create({
    data: { weekId, name: sessionDef.name, order },
  });
  for (let s = 0; s < sessionDef.sections.length; s++) {
    await seedSection(session.id, sessionDef.sections[s]!, s, trainerId);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('Seeding database...');

  // 1. User
  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {},
    create: {
      email: ADMIN_EMAIL,
      name: 'Yotam Berkowitz',
      roles: { create: [{ role: Role.ADMIN }, { role: Role.TRAINER }, { role: Role.TRAINEE }] },
    },
    include: { roles: true },
  });

  for (const role of [Role.ADMIN, Role.TRAINER, Role.TRAINEE]) {
    if (!admin.roles.some((r) => r.role === role)) {
      await prisma.userRole.create({ data: { userId: admin.id, role } });
    }
  }
  console.log(`User: ${admin.email}`);

  // 2. Exercises
  for (let i = 0; i < EXERCISES.length; i++) {
    const { name, videoUrl, variants = [] } = EXERCISES[i]!;
    let ex = await prisma.exercise.findFirst({ where: { trainerId: admin.id, name } });
    if (!ex) {
      ex = await prisma.exercise.create({
        data: { trainerId: admin.id, name, videoUrl: videoUrl ?? null, order: i },
      });
      console.log(`  + Exercise: ${name}`);
    }
    for (let j = 0; j < variants.length; j++) {
      const vName = variants[j]!;
      const exists = await prisma.exerciseVariant.findFirst({ where: { exerciseId: ex.id, name: vName } });
      if (!exists) {
        await prisma.exerciseVariant.create({ data: { exerciseId: ex.id, name: vName, difficultyOrder: j } });
      }
    }
  }
  console.log(`Exercises ready.`);

  // 3. Plan — skip if already exists
  const existingPlan = await prisma.plan.findFirst({
    where: { trainerId: admin.id, traineeId: admin.id, name: 'Strength Phase 1' },
  });

  if (existingPlan) {
    console.log('Plan "Strength Phase 1" already exists — skipping plan seed.');
  } else {
    const plan = await prisma.plan.create({
      data: {
        trainerId: admin.id,
        traineeId: admin.id,
        name: 'Strength Phase 1',
        startDate: new Date('2026-04-13'),
      },
    });
    console.log(`Plan created: ${plan.name}`);

    for (const weekDef of PLAN_WEEKS) {
      const week = await prisma.week.create({
        data: {
          planId: plan.id,
          weekNumber: weekDef.weekNumber,
          startDate: new Date(weekDef.startDate),
        },
      });
      console.log(`  Week ${weekDef.weekNumber} (${weekDef.startDate})`);

      for (let s = 0; s < weekDef.sessions.length; s++) {
        await seedSession(week.id, weekDef.sessions[s]!, s, admin.id);
        console.log(`    Session: ${weekDef.sessions[s]!.name}`);
      }
    }
  }

  console.log('Seed complete.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
