import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { CopyWeekSchema, CopySessionSchema } from '@calist/shared';

export const copyRouter = Router();

copyRouter.use(requireAuth, requireRole('TRAINER', 'ADMIN'));

// Copy a week to another plan/week number
copyRouter.post('/week', async (req, res) => {
  try {
    const parsed = CopyWeekSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }

    const { sourcePlanId, sourceWeekNumber, targetPlanId, targetWeekNumber, targetStartDate } =
      parsed.data;

    const sourceWeek = await prisma.week.findUnique({
      where: { planId_weekNumber: { planId: sourcePlanId, weekNumber: sourceWeekNumber } },
      include: {
        sessions: {
          include: {
            sections: {
              include: { rows: true },
            },
          },
        },
      },
    });

    if (!sourceWeek) {
      return res.status(404).json({ error: 'Source week not found' });
    }

    const newWeek = await prisma.week.create({
      data: {
        planId: targetPlanId,
        weekNumber: targetWeekNumber,
        startDate: new Date(targetStartDate),
        sessions: {
          create: sourceWeek.sessions.map((session) => ({
            name: session.name,
            order: session.order,
            sections: {
              create: session.sections.map((section) => ({
                name: section.name,
                order: section.order,
                rows: {
                  create: section.rows.map((row) => ({
                    order: row.order,
                    groupKey: row.groupKey,
                    exerciseId: row.exerciseId,
                    variantId: row.variantId,
                    restMinutes: row.restMinutes,
                    volumeType: row.volumeType,
                    volumeValue: row.volumeValue,
                    sets: row.sets,
                  })),
                },
              })),
            },
          })),
        },
      },
      include: {
        sessions: {
          include: {
            sections: {
              include: { rows: { include: { exercise: true, variant: true } } },
            },
          },
        },
      },
    });

    return res.status(201).json(newWeek);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to copy week' });
  }
});

// Copy a session to another week
copyRouter.post('/session', async (req, res) => {
  try {
    const parsed = CopySessionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }

    const { sourceSessionId, targetWeekId, newName, newOrder } = parsed.data;

    const sourceSession = await prisma.session.findUnique({
      where: { id: sourceSessionId },
      include: {
        sections: {
          include: { rows: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!sourceSession) {
      return res.status(404).json({ error: 'Source session not found' });
    }

    // Get next order if not provided
    let order = newOrder;
    if (order === undefined) {
      const count = await prisma.session.count({ where: { weekId: targetWeekId } });
      order = count;
    }

    const newSession = await prisma.session.create({
      data: {
        weekId: targetWeekId,
        name: newName ?? sourceSession.name,
        order,
        sections: {
          create: sourceSession.sections.map((section) => ({
            name: section.name,
            order: section.order,
            rows: {
              create: section.rows.map((row) => ({
                order: row.order,
                groupKey: row.groupKey,
                exerciseId: row.exerciseId,
                variantId: row.variantId,
                restMinutes: row.restMinutes,
                volumeType: row.volumeType,
                volumeValue: row.volumeValue,
                sets: row.sets,
              })),
            },
          })),
        },
      },
      include: {
        sections: {
          include: { rows: { include: { exercise: true, variant: true } } },
        },
      },
    });

    return res.status(201).json(newSession);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to copy session' });
  }
});
