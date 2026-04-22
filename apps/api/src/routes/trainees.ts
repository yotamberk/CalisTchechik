import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { AddTraineeSchema } from '@calist/shared';

export const traineesRouter = Router();

traineesRouter.use(requireAuth);

// Get all trainees for current trainer
traineesRouter.get('/', requireRole('TRAINER', 'ADMIN'), async (req, res) => {
  try {
    const trainerId = req.user!.impersonating || req.user!.userId;

    const relations = await prisma.trainerTrainee.findMany({
      where: { trainerId },
      include: {
        trainee: { include: { roles: true } },
      },
    });

    return res.json(
      relations.map((r) => ({
        id: r.trainee.id,
        email: r.trainee.email,
        name: r.trainee.name,
        avatar: r.trainee.avatar,
        roles: r.trainee.roles.map((role) => role.role),
        createdAt: r.trainee.createdAt.toISOString(),
      })),
    );
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch trainees' });
  }
});

// Add trainee by email
traineesRouter.post('/', requireRole('TRAINER', 'ADMIN'), async (req, res) => {
  try {
    const parsed = AddTraineeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }

    const trainerId = req.user!.impersonating || req.user!.userId;
    const { email } = parsed.data;

    let trainee = await prisma.user.findUnique({
      where: { email },
      include: { roles: true },
    });

    if (!trainee) {
      trainee = await prisma.user.create({
        data: {
          email,
          name: email.split('@')[0] ?? email,
          roles: { create: [{ role: 'TRAINEE' }] },
        },
        include: { roles: true },
      });
    } else {
      const hasTrainee = trainee.roles.some((r) => r.role === 'TRAINEE');
      if (!hasTrainee) {
        await prisma.userRole.create({ data: { userId: trainee.id, role: 'TRAINEE' } });
        trainee = await prisma.user.findUnique({
          where: { email },
          include: { roles: true },
        });
      }
    }

    // Create trainer-trainee relation (ignore if already exists)
    await prisma.trainerTrainee.upsert({
      where: { trainerId_traineeId: { trainerId, traineeId: trainee!.id } },
      update: {},
      create: { trainerId, traineeId: trainee!.id },
    });

    return res.json({
      id: trainee!.id,
      email: trainee!.email,
      name: trainee!.name,
      avatar: trainee!.avatar,
      roles: trainee!.roles.map((r) => r.role),
      createdAt: trainee!.createdAt.toISOString(),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to add trainee' });
  }
});

// Remove trainee from trainer's list
traineesRouter.delete('/:traineeId', requireRole('TRAINER', 'ADMIN'), async (req, res) => {
  try {
    const trainerId = req.user!.impersonating || req.user!.userId;
    await prisma.trainerTrainee.deleteMany({
      where: { trainerId, traineeId: req.params['traineeId'] },
    });
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to remove trainee' });
  }
});

// Get trainee profile with dashboard data (trainer or admin can view)
traineesRouter.get('/:traineeId/profile', async (req, res) => {
  try {
    const { traineeId } = req.params;

    const trainee = await prisma.user.findUnique({
      where: { id: traineeId },
      include: { roles: true },
    });

    if (!trainee) {
      return res.status(404).json({ error: 'Trainee not found' });
    }

    // Get the most recent row log per exercise for this trainee
    const recentLogs = await prisma.rowLog.findMany({
      where: {
        sessionLog: { traineeId },
        sessionLog: { completedAt: { not: null } },
      },
      include: {
        row: {
          include: {
            exercise: true,
            variant: true,
          },
        },
        sessionLog: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Deduplicate by exercise - most recent first
    const seenExercises = new Set<string>();
    const currentVariants = recentLogs
      .filter((log) => {
        if (seenExercises.has(log.row.exerciseId)) return false;
        seenExercises.add(log.row.exerciseId);
        return true;
      })
      .map((log) => ({
        exerciseId: log.row.exerciseId,
        exerciseName: log.row.exercise.name,
        variantId: log.row.variantId,
        variantName: log.row.variant?.name ?? null,
        volumeValue: log.row.volumeValue,
        volumeType: log.row.volumeType,
        performedOn: log.sessionLog.performedOn?.toISOString() ?? log.createdAt.toISOString(),
      }));

    return res.json({
      user: {
        id: trainee.id,
        email: trainee.email,
        name: trainee.name,
        avatar: trainee.avatar,
        roles: trainee.roles.map((r) => r.role),
        createdAt: trainee.createdAt.toISOString(),
      },
      currentVariants,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to get trainee profile' });
  }
});

// Get exercise progress history for a trainee
traineesRouter.get('/:traineeId/progress/:exerciseId', async (req, res) => {
  try {
    const { traineeId, exerciseId } = req.params;

    const logs = await prisma.rowLog.findMany({
      where: {
        row: { exerciseId },
        sessionLog: { traineeId, completedAt: { not: null } },
      },
      include: {
        row: { include: { variant: true } },
        sessionLog: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const progressData = logs.map((log) => ({
      date: log.sessionLog.performedOn?.toISOString() ?? log.createdAt.toISOString(),
      variantName: log.row.variant?.name ?? null,
      volumeValue: log.row.volumeValue,
      volumeType: log.row.volumeType,
      rpe: log.rpe,
      notes: log.notes,
    }));

    return res.json(progressData);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to get progress' });
  }
});
