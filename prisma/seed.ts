import { PrismaClient, Role, VolumeType } from '@prisma/client';

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

const ADMIN_EMAIL = 'yotamberk@gmail.com';
const TRAINER2_EMAIL = 'coach.dana@example.com';

const TRAINEES = [
  { email: 'alex.morgan@example.com', name: 'Alex Morgan' },
  { email: 'sam.kim@example.com', name: 'Sam Kim' },
  { email: 'jordan.bell@example.com', name: 'Jordan Bell' },
  { email: 'taylor.hayes@example.com', name: 'Taylor Hayes' },
  { email: 'casey.wu@example.com', name: 'Casey Wu' },
  { email: 'riley.stone@example.com', name: 'Riley Stone' },
];

// ---------------------------------------------------------------------------
// Exercises
// ---------------------------------------------------------------------------

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
  skipRating?: boolean;
};

type SectionDef = { name: string; rows: RowDef[] };
type SessionDef = { name: string; sections: SectionDef[] };
type WeekDef = { weekNumber: number; startDate: string; endDate: string; sessions: SessionDef[] };

// ---------------------------------------------------------------------------
// PREP session (identical every week)
// ---------------------------------------------------------------------------
const PREP_SESSION: SessionDef = {
  name: 'Prep',
  sections: [
    {
      name: 'Circuit',
      rows: [
        { exercise: 'Hang', variant: '2 Hands', sets: 2, volumeType: 'NUMBER', volumeValue: '30"', restMinutes: 0, groupKey: 'A', skipRating: true },
        { exercise: 'Squat Sit', sets: 1, volumeType: 'NUMBER', volumeValue: '30"', restMinutes: 0, groupKey: 'A', skipRating: true },
        { exercise: 'Cat Stretch', variant: 'Elevated', sets: 1, volumeType: 'NUMBER', volumeValue: '30"', restMinutes: 0, groupKey: 'A', skipRating: true },
        { exercise: 'Shoulder Dislocates', variant: 'Stick', sets: 1, volumeType: 'NUMBER', volumeValue: '10', restMinutes: 1, groupKey: 'A', skipRating: true },
      ],
    },
  ],
};

function sessionA(
  flVariant: string, flVolume: string, plancheVolume: string,
  chinVolume: string, dipsVolume: string, pistolVolume: string, pistolVariant: string,
): SessionDef {
  return {
    name: 'Session A',
    sections: [
      {
        name: 'Handstand',
        rows: [
          { exercise: 'Wrist Warm Up', sets: 1, volumeType: 'NUMBER', volumeValue: '1', restMinutes: 0, skipRating: true },
          { exercise: 'Cobra Hang Low Bar', sets: 2, volumeType: 'NUMBER', volumeValue: '30"', restMinutes: 1, skipRating: true },
          { exercise: 'Handstand', sets: 3, volumeType: 'MAX_HOLD', volumeValue: '', restMinutes: 0 },
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
  squatVolume: string, hsVolume: string, pullVolume: string,
  jeffVolume: string, horseVolume: string, cubanVolume: string,
): SessionDef {
  return {
    name: 'Session B',
    sections: [
      {
        name: 'Handstand',
        rows: [
          { exercise: 'Wrist Warm Up', sets: 1, volumeType: 'NUMBER', volumeValue: '1', restMinutes: 0, skipRating: true },
          { exercise: 'Side Hang Low Bar', sets: 2, volumeType: 'NUMBER', volumeValue: '30"', restMinutes: 1, skipRating: true },
          { exercise: 'Handstand', sets: 3, volumeType: 'MAX_HOLD', volumeValue: '', restMinutes: 0 },
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
  cossackVolume: string, flVariant: string, flVolume: string, flSets: number,
  plancheSets: number, plancheVolume: string, dbVolume: string, wideVolume: string, gmVolume: string,
): SessionDef {
  return {
    name: 'Session C',
    sections: [
      {
        name: 'Handstand',
        rows: [
          { exercise: 'Wrist Warm Up', sets: 1, volumeType: 'NUMBER', volumeValue: '1', restMinutes: 0, skipRating: true },
          { exercise: 'Eagle Hang Low Bar', sets: 2, volumeType: 'NUMBER', volumeValue: '30"', restMinutes: 1, skipRating: true },
          { exercise: 'Handstand', sets: 3, volumeType: 'MAX_HOLD', volumeValue: '', restMinutes: 0 },
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
    weekNumber: 1, startDate: '2026-04-13', endDate: '2026-04-20',
    sessions: [
      PREP_SESSION,
      sessionA('Straddle', '8"', '8 (-15kg)', '8 (+15kg)', '8 (+15kg)', '5 (50cm)', '50cm Box'),
      sessionB('5 (70kg)', '5 (+15cm)', '5 (+10kg)', '8 (30kg)', '8', '8 (10kg)'),
      sessionC('5 (10kg)', 'Straddle', '8"', 4, 4, '8 (-15kg)', '10 (7kg/hand)', '10 (-10kg)', '10 (5kg)'),
    ],
  },
  {
    weekNumber: 2, startDate: '2026-04-20', endDate: '2026-04-27',
    sessions: [
      PREP_SESSION,
      sessionA('One-Leg Adv. Tuck', '8"', '8 (-15kg)', '7 (+16kg)', '7 (+16kg)', '5 (70cm)', '70cm Box'),
      sessionB('5 (82kg)', '5 (+10cm)', '5 (+20kg)', '8 (30kg)', '12', '8 (15kg)'),
      sessionC('5 (15kg)', 'One-Leg Adv. Tuck', '8"', 3, 4, '8 (-15kg)', '10 (10kg/hand)', '10', '10 (5kg)'),
    ],
  },
  {
    weekNumber: 3, startDate: '2026-04-27', endDate: '2026-05-04',
    sessions: [
      PREP_SESSION,
      sessionA('One-Leg Adv. Tuck', '10"', '8 (-25kg)', '7 (+16kg)', '7 (+16kg)', '5 (70cm)', '70cm Box'),
      sessionB('5 (85kg)', '5 (+15cm)', '5 (+21kg)', '8 (30kg)', '12', '8 (15kg)'),
      sessionC('5 (20kg)', 'One-Leg Adv. Tuck', '10"', 3, 4, '8 (-25kg)', '10 (15kg/hand)', '12', '10 (5kg)'),
    ],
  },
  {
    weekNumber: 4, startDate: '2026-05-04', endDate: '2026-05-11',
    sessions: [
      PREP_SESSION,
      sessionA('One-Leg Adv. Tuck', '8"', '6 (-15kg)', '6 (+12kg)', '6 (+12kg)', '5 (50cm)', '50cm Box'),
      sessionB('5 (70kg)', '5 (+10cm)', '5 (+15kg)', '6 (25kg)', '8', '6 (10kg)'),
      sessionC('5 (10kg)', 'One-Leg Adv. Tuck', '8"', 3, 3, '6 (-15kg)', '8 (10kg/hand)', '8 (-10kg)', '8 (5kg)'),
    ],
  },
];

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

async function getExerciseId(trainerId: string, name: string): Promise<string> {
  const ex = await prisma.exercise.findFirst({ where: { trainerId, name } });
  if (!ex) throw new Error(`Exercise not found: "${name}" for trainer ${trainerId}`);
  return ex.id;
}

async function getVariantId(exerciseId: string, name: string): Promise<string | null> {
  if (!name) return null;
  const v = await prisma.exerciseVariant.findFirst({ where: { exerciseId, name } });
  if (!v) throw new Error(`Variant not found: "${name}" on exercise ${exerciseId}`);
  return v.id;
}

async function seedSection(sessionId: string, sectionDef: SectionDef, sectionOrder: number, trainerId: string) {
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
        skipRating: row.skipRating ?? false,
      },
    });
  }
  return section;
}

async function seedSession(weekId: string, sessionDef: SessionDef, order: number, trainerId: string) {
  const session = await prisma.session.create({
    data: { weekId, name: sessionDef.name, order },
  });
  for (let s = 0; s < sessionDef.sections.length; s++) {
    await seedSection(session.id, sessionDef.sections[s]!, s, trainerId);
  }
  return session;
}

async function seedPlan(
  trainerId: string,
  traineeId: string,
  planName: string,
  weeks: WeekDef[],
) {
  const existing = await prisma.plan.findFirst({ where: { trainerId, traineeId, name: planName } });
  if (existing) {
    console.log(`  Plan "${planName}" already exists — skipping.`);
    return existing;
  }

  const plan = await prisma.plan.create({
    data: {
      trainerId,
      traineeId,
      name: planName,
      startDate: new Date(weeks[0]!.startDate),
      endDate: new Date(weeks[weeks.length - 1]!.endDate),
    },
  });
  console.log(`  Plan "${planName}" created (${plan.id})`);

  for (const weekDef of weeks) {
    const week = await prisma.week.create({
      data: {
        planId: plan.id,
        weekNumber: weekDef.weekNumber,
        startDate: new Date(weekDef.startDate),
        endDate: new Date(weekDef.endDate),
      },
    });
    for (let s = 0; s < weekDef.sessions.length; s++) {
      await seedSession(week.id, weekDef.sessions[s]!, s, trainerId);
    }
    console.log(`    Week ${weekDef.weekNumber} seeded`);
  }

  return plan;
}

// ---------------------------------------------------------------------------
// Session log helpers
// ---------------------------------------------------------------------------

interface LoggedSession {
  sessionId: string;
  traineeId: string;
  performedOn: Date;
  startedAt: Date;
  completedAt: Date | null; // null = in-progress
  rowRpes: Record<string, number>; // rowId -> rpe
  rowNotes: Record<string, string>; // rowId -> notes (optional)
}

/** Seed a completed or in-progress session log with row logs */
async function seedSessionLog(data: LoggedSession) {
  const existing = await prisma.sessionLog.findUnique({
    where: { sessionId_traineeId: { sessionId: data.sessionId, traineeId: data.traineeId } },
  });
  if (existing) return;

  const log = await prisma.sessionLog.create({
    data: {
      sessionId: data.sessionId,
      traineeId: data.traineeId,
      startedAt: data.startedAt,
      performedOn: data.performedOn,
      completedAt: data.completedAt,
    },
  });

  for (const [rowId, rpe] of Object.entries(data.rowRpes)) {
    await prisma.rowLog.create({
      data: {
        sessionLogId: log.id,
        rowId,
        rpe,
        notes: data.rowNotes[rowId] ?? null,
      },
    });
  }
}

/** Load all rows for a session from DB */
async function getSessionRows(sessionId: string) {
  const sections = await prisma.section.findMany({
    where: { sessionId },
    orderBy: { order: 'asc' },
    include: { rows: { orderBy: { order: 'asc' } } },
  });
  return sections.flatMap((s) => s.rows);
}

/** Generate trending RPEs: starts at baseRpe, drifts by +/-1, clamp 1-10 */
function trendRpe(baseRpe: number, rowCount: number, sessionIndex: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < rowCount; i++) {
    const drift = (sessionIndex * 0.4 + i * 0.15) * (Math.random() > 0.5 ? 1 : -1);
    const rpe = Math.round(Math.min(10, Math.max(1, baseRpe + drift)));
    result.push(rpe);
  }
  return result;
}

const SESSION_NOTES = [
  'Felt strong today!', 'Tough but managed.', 'Need more rest next time.',
  'Good form throughout.', 'Balance improving.', 'Arms were shaky.',
  'Solid session.', 'Very tired today.', '', '', '', '', // empties = no note (common)
];

function pickNote() { return SESSION_NOTES[Math.floor(Math.random() * SESSION_NOTES.length)] ?? ''; }

/** Seed completion data for N sessions of a plan, starting from weekDayOffset */
async function seedPlanLogs(
  planId: string,
  traineeId: string,
  opts: {
    completedWeeks: number;   // how many full weeks to mark done
    inProgressSessionIdx?: number; // if set, the session index in the current (next) week that's in-progress
    baseRpe?: number;
  },
) {
  const plan = await prisma.plan.findUnique({
    where: { id: planId },
    include: {
      weeks: {
        orderBy: { weekNumber: 'asc' },
        include: { sessions: { orderBy: { order: 'asc' } } },
      },
    },
  });
  if (!plan) return;

  let sessionGlobalIdx = 0;

  for (let wi = 0; wi < plan.weeks.length; wi++) {
    const week = plan.weeks[wi]!;
    const weekStart = new Date(week.startDate);

    for (let si = 0; si < week.sessions.length; si++) {
      const session = week.sessions[si]!;
      sessionGlobalIdx++;

      const isCompletedWeek = wi < opts.completedWeeks;
      const isInProgressSession =
        wi === opts.completedWeeks && si === (opts.inProgressSessionIdx ?? -1);

      if (!isCompletedWeek && !isInProgressSession) continue;

      const rows = await getSessionRows(session.id);
      const performedOn = new Date(weekStart);
      performedOn.setDate(weekStart.getDate() + si * 2); // spread sessions across the week
      const durationMinutes = 38 + Math.floor(Math.random() * 32); // 38-70 min
      const startedAt = new Date(performedOn);
      startedAt.setHours(8 + si, 0, 0, 0);
      const completedAt = isInProgressSession
        ? null
        : new Date(startedAt.getTime() + durationMinutes * 60 * 1000);

      const rpes = trendRpe(opts.baseRpe ?? 6, rows.length, sessionGlobalIdx);
      const rowRpes: Record<string, number> = {};
      const rowNotes: Record<string, string> = {};
      rows.forEach((row, i) => {
        rowRpes[row.id] = rpes[i]!;
        const note = pickNote();
        if (note) rowNotes[row.id] = note;
      });

      await seedSessionLog({
        sessionId: session.id,
        traineeId,
        performedOn,
        startedAt,
        completedAt,
        rowRpes,
        rowNotes,
      });

      console.log(`      Logged session "${session.name}" (week ${week.weekNumber}) — ${isInProgressSession ? 'in-progress' : 'completed'}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Seed exercises for a trainer
// ---------------------------------------------------------------------------

async function seedExercises(trainerId: string) {
  for (let i = 0; i < EXERCISES.length; i++) {
    const { name, videoUrl, variants = [] } = EXERCISES[i]!;
    let ex = await prisma.exercise.findFirst({ where: { trainerId, name } });
    if (!ex) {
      ex = await prisma.exercise.create({
        data: { trainerId, name, videoUrl: videoUrl ?? null, order: i },
      });
    }
    for (let j = 0; j < variants.length; j++) {
      const vName = variants[j]!;
      const exists = await prisma.exerciseVariant.findFirst({ where: { exerciseId: ex.id, name: vName } });
      if (!exists) {
        await prisma.exerciseVariant.create({ data: { exerciseId: ex.id, name: vName, difficultyOrder: j } });
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('Seeding database...\n');

  // ── 1. Users ──────────────────────────────────────────────────────────────

  // Yotam: ADMIN + TRAINER + TRAINEE
  const yotam = await prisma.user.upsert({
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
    if (!yotam.roles.some((r) => r.role === role)) {
      await prisma.userRole.create({ data: { userId: yotam.id, role } });
    }
  }
  console.log(`✓ Yotam (admin+trainer+trainee): ${yotam.email}`);

  // Dana: TRAINER
  const dana = await prisma.user.upsert({
    where: { email: TRAINER2_EMAIL },
    update: {},
    create: {
      email: TRAINER2_EMAIL,
      name: 'Dana Cohen',
      roles: { create: [{ role: Role.TRAINER }] },
    },
    include: { roles: true },
  });
  if (!dana.roles.some((r) => r.role === Role.TRAINER)) {
    await prisma.userRole.create({ data: { userId: dana.id, role: Role.TRAINER } });
  }
  console.log(`✓ Dana (trainer): ${dana.email}`);

  // Trainees
  const traineeUsers: { id: string; name: string; email: string }[] = [];
  for (const t of TRAINEES) {
    const u = await prisma.user.upsert({
      where: { email: t.email },
      update: {},
      create: {
        email: t.email,
        name: t.name,
        roles: { create: [{ role: Role.TRAINEE }] },
      },
      include: { roles: true },
    });
    if (!u.roles.some((r) => r.role === Role.TRAINEE)) {
      await prisma.userRole.create({ data: { userId: u.id, role: Role.TRAINEE } });
    }
    traineeUsers.push({ id: u.id, name: t.name, email: t.email });
    console.log(`✓ Trainee: ${t.email}`);
  }

  // ── 2. Trainer-Trainee relationships ─────────────────────────────────────
  // Yotam trains: himself + Alex + Sam + Jordan (first 3)
  // Dana trains: Taylor + Casey + Riley (last 3)
  const yotamTrainees = [{ id: yotam.id, name: yotam.name }, ...traineeUsers.slice(0, 3)];
  const danaTrainees = traineeUsers.slice(3);

  for (const t of yotamTrainees) {
    await prisma.trainerTrainee.upsert({
      where: { trainerId_traineeId: { trainerId: yotam.id, traineeId: t.id } },
      update: {},
      create: { trainerId: yotam.id, traineeId: t.id },
    });
  }
  for (const t of danaTrainees) {
    await prisma.trainerTrainee.upsert({
      where: { trainerId_traineeId: { trainerId: dana.id, traineeId: t.id } },
      update: {},
      create: { trainerId: dana.id, traineeId: t.id },
    });
  }
  console.log('\n✓ Trainer-trainee relationships set');

  // ── 3. Exercises ──────────────────────────────────────────────────────────
  await seedExercises(yotam.id);
  await seedExercises(dana.id);
  console.log('✓ Exercises seeded for both trainers\n');

  // ── 4. Plans and logs ─────────────────────────────────────────────────────

  // Yotam → himself: fully completed plan
  console.log('Seeding Yotam self-plan (completed)...');
  const yotamPlan = await seedPlan(yotam.id, yotam.id, 'Strength Phase 1', PLAN_WEEKS);
  await seedPlanLogs(yotamPlan.id, yotam.id, { completedWeeks: 4, baseRpe: 7 });

  // Yotam → himself: fresh plan anchored to the current week (no logs = not started)
  console.log('\nSeeding Yotam current-week plan (not started)...');
  const YOTAM_CURRENT_WEEKS: WeekDef[] = [
    {
      weekNumber: 1, startDate: '2026-06-01', endDate: '2026-06-08',
      sessions: [
        PREP_SESSION,
        sessionA('Straddle', '8"', '8 (-15kg)', '8 (+15kg)', '8 (+15kg)', '5 (50cm)', '50cm Box'),
        sessionB('5 (70kg)', '5 (+15cm)', '5 (+10kg)', '8 (30kg)', '8', '8 (10kg)'),
        sessionC('5 (10kg)', 'Straddle', '8"', 4, 4, '8 (-15kg)', '10 (7kg/hand)', '10 (-10kg)', '10 (5kg)'),
      ],
    },
    {
      weekNumber: 2, startDate: '2026-06-08', endDate: '2026-06-15',
      sessions: [
        PREP_SESSION,
        sessionA('One-Leg Adv. Tuck', '8"', '8 (-15kg)', '7 (+16kg)', '7 (+16kg)', '5 (70cm)', '70cm Box'),
        sessionB('5 (82kg)', '5 (+10cm)', '5 (+20kg)', '8 (30kg)', '12', '8 (15kg)'),
        sessionC('5 (15kg)', 'One-Leg Adv. Tuck', '8"', 3, 4, '8 (-15kg)', '10 (10kg/hand)', '10', '10 (5kg)'),
      ],
    },
  ];
  await seedPlan(yotam.id, yotam.id, 'Current Block', YOTAM_CURRENT_WEEKS);

  // Yotam → Alex: in-progress (2 weeks done, week 3 session A in-progress)
  console.log('\nSeeding Alex plan (in-progress)...');
  const alexUser = traineeUsers[0]!;
  const alexPlan = await seedPlan(yotam.id, alexUser.id, 'Strength Phase 1', PLAN_WEEKS);
  await seedPlanLogs(alexPlan.id, alexUser.id, { completedWeeks: 2, inProgressSessionIdx: 1, baseRpe: 6 });

  // Yotam → Sam: fully completed plan + second plan (not started)
  console.log('\nSeeding Sam plan (completed)...');
  const samUser = traineeUsers[1]!;
  const samPlan = await seedPlan(yotam.id, samUser.id, 'Strength Phase 1', PLAN_WEEKS);
  await seedPlanLogs(samPlan.id, samUser.id, { completedWeeks: 4, baseRpe: 5 });

  const PHASE2_WEEKS: WeekDef[] = [
    {
      weekNumber: 1, startDate: '2026-06-01', endDate: '2026-06-08',
      sessions: [
        PREP_SESSION,
        sessionA('Straddle', '10"', '10 (-10kg)', '10 (+15kg)', '10 (+15kg)', '5 (50cm)', '50cm Box'),
        sessionB('5 (75kg)', '5 (+20cm)', '6 (+10kg)', '10 (30kg)', '10', '10 (10kg)'),
      ],
    },
    {
      weekNumber: 2, startDate: '2026-06-08', endDate: '2026-06-15',
      sessions: [
        PREP_SESSION,
        sessionA('Straddle', '12"', '10 (-10kg)', '10 (+15kg)', '10 (+15kg)', '5 (70cm)', '70cm Box'),
        sessionB('5 (80kg)', '5 (+20cm)', '6 (+12kg)', '10 (30kg)', '12', '10 (12kg)'),
      ],
    },
  ];
  console.log('\nSeeding Sam Phase 2 (not started)...');
  await seedPlan(yotam.id, samUser.id, 'Strength Phase 2', PHASE2_WEEKS);

  // Yotam → Jordan: just started (week 1 session 0 in-progress), base RPE 8
  console.log('\nSeeding Jordan plan (just started)...');
  const jordanUser = traineeUsers[2]!;
  const jordanPlan = await seedPlan(yotam.id, jordanUser.id, 'Strength Phase 1', PLAN_WEEKS);
  await seedPlanLogs(jordanPlan.id, jordanUser.id, { completedWeeks: 0, inProgressSessionIdx: 0, baseRpe: 8 });

  // Dana → Taylor: in-progress (1 week done, week 2 session B in-progress)
  console.log('\nSeeding Taylor plan (in-progress, Dana)...');
  const taylorUser = traineeUsers[3]!;
  const taylorPlan = await seedPlan(dana.id, taylorUser.id, 'Strength Phase 1', PLAN_WEEKS);
  await seedPlanLogs(taylorPlan.id, taylorUser.id, { completedWeeks: 1, inProgressSessionIdx: 2, baseRpe: 5 });

  // Dana → Casey: not started at all
  console.log('\nSeeding Casey plan (not started, Dana)...');
  const caseyUser = traineeUsers[4]!;
  await seedPlan(dana.id, caseyUser.id, 'Strength Phase 1', PLAN_WEEKS);

  // Dana → Riley: completed plan + second plan in-progress
  console.log('\nSeeding Riley plan (completed, Dana)...');
  const rileyUser = traineeUsers[5]!;
  const rileyPlan = await seedPlan(dana.id, rileyUser.id, 'Strength Phase 1', PLAN_WEEKS);
  await seedPlanLogs(rileyPlan.id, rileyUser.id, { completedWeeks: 4, baseRpe: 6 });

  console.log('\nSeeding Riley Phase 2 (in-progress, Dana)...');
  const rileyPhase2Weeks: WeekDef[] = [
    {
      weekNumber: 1, startDate: '2026-05-18', endDate: '2026-05-25',
      sessions: [
        PREP_SESSION,
        sessionA('One-Leg Adv. Tuck', '8"', '8 (-15kg)', '8 (+15kg)', '8 (+15kg)', '5 (50cm)', '50cm Box'),
        sessionB('5 (75kg)', '5 (+15cm)', '5 (+10kg)', '8 (30kg)', '10', '8 (10kg)'),
        sessionC('5 (10kg)', 'One-Leg Adv. Tuck', '8"', 4, 4, '8 (-15kg)', '10 (8kg/hand)', '10 (-10kg)', '10 (5kg)'),
      ],
    },
    {
      weekNumber: 2, startDate: '2026-05-25', endDate: '2026-06-01',
      sessions: [
        PREP_SESSION,
        sessionA('One-Leg Adv. Tuck', '10"', '8 (-15kg)', '8 (+16kg)', '8 (+16kg)', '5 (70cm)', '70cm Box'),
        sessionB('5 (80kg)', '5 (+12cm)', '5 (+15kg)', '8 (30kg)', '12', '8 (12kg)'),
      ],
    },
  ];
  const rileyPlan2 = await seedPlan(dana.id, rileyUser.id, 'Strength Phase 2', rileyPhase2Weeks);
  await seedPlanLogs(rileyPlan2.id, rileyUser.id, { completedWeeks: 1, inProgressSessionIdx: 1, baseRpe: 7 });

  console.log('\n✅ Seed complete!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
